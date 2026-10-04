import { AuditService } from './AuditService.js';
import { PinterestService } from './PinterestService.js';

export interface ScheduledPost {
  id: string;
  platform: 'pinterest' | 'etsy';
  accountId: string;
  contentId: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  boardId?: string;
  scheduledAt: string;
  status: 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
  idempotencyKey: string;
  attempts: number;
  lastError?: string;
  publishedAt?: string;
  externalId?: string;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private posts: Map<string, ScheduledPost> = new Map();
  private isWorkerRunning = false;
  private workerInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startWorker();
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Schedules a new post (must go through approval workflow before publication)
   */
  public async schedulePost(post: Omit<ScheduledPost, 'id' | 'attempts' | 'status'> & { requiresApproval?: boolean }): Promise<ScheduledPost> {
    const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPost: ScheduledPost = {
      ...post,
      id,
      attempts: 0,
      status: post.requiresApproval === false ? 'APPROVED' : 'PENDING'
    };

    this.posts.set(id, newPost);
    await AuditService.log('POST_SCHEDULED', 'scheduled_post', id, `Scheduled post "${newPost.title}" for ${newPost.scheduledAt}`);
    return newPost;
  }

  /**
   * Explicit user approval of a scheduled post
   */
  public async approvePost(postId: string): Promise<ScheduledPost> {
    const post = this.posts.get(postId);
    if (!post) throw new Error(`Scheduled post ${postId} not found`);

    post.status = 'APPROVED';
    this.posts.set(postId, post);
    await AuditService.log('POST_APPROVED', 'scheduled_post', postId, `Post "${post.title}" approved by user`);
    return post;
  }

  /**
   * Background worker executing due APPROVED posts
   */
  public startWorker(intervalMs = 30000): void {
    if (this.isWorkerRunning) return;
    this.isWorkerRunning = true;

    this.workerInterval = setInterval(async () => {
      await this.processDuePosts();
    }, intervalMs);
    if (this.workerInterval && typeof this.workerInterval.unref === 'function') {
      this.workerInterval.unref();
    }
  }

  public stopWorker(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    this.isWorkerRunning = false;
  }

  /**
   * Processes all due APPROVED posts
   */
  public async processDuePosts(): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    for (const [id, post] of this.posts.entries()) {
      if (post.status === 'APPROVED' && new Date(post.scheduledAt) <= now) {
        processedCount++;
        await this.publishScheduledPost(post);
      }
    }

    return processedCount;
  }

  private async publishScheduledPost(post: ScheduledPost): Promise<void> {
    post.attempts++;

    try {
      if (post.platform === 'pinterest') {
        const pin = await PinterestService.getInstance().createPin({
          title: post.title,
          description: post.description,
          link: post.destinationUrl,
          board_id: post.boardId || 'board_anime_cases',
          media_source: {
            source_type: 'image_url',
            url: post.imageUrl
          }
        });

        post.status = 'PUBLISHED';
        post.publishedAt = new Date().toISOString();
        post.externalId = pin.id;
        this.posts.set(post.id, post);

        await AuditService.log(
          'POST_PUBLISHED',
          'scheduled_post',
          post.id,
          `Successfully published Pin "${post.title}" (External ID: ${pin.id})`
        );
      }
    } catch (err: any) {
      post.status = post.attempts >= 3 ? 'FAILED' : 'APPROVED';
      post.lastError = err?.message || 'Unknown publication error';
      this.posts.set(post.id, post);

      await AuditService.log(
        'POST_PUBLISH_FAILED',
        'scheduled_post',
        post.id,
        `Attempt ${post.attempts} failed: ${post.lastError}`,
        'error'
      );
    }
  }

  public getScheduledPosts(): ScheduledPost[] {
    return Array.from(this.posts.values()).sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }

  public cancelPost(postId: string): boolean {
    const post = this.posts.get(postId);
    if (!post) return false;
    post.status = 'CANCELLED';
    this.posts.set(postId, post);
    return true;
  }
}
