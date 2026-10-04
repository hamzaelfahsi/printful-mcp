import { AuditService } from './AuditService.js';
import { NotificationService } from './NotificationService.js';
import { EtsyService } from './EtsyService.js';
import { EtsyTokenService } from './EtsyTokenService.js';
import { PinterestService } from './PinterestService.js';
import { PinterestTokenService } from './PinterestTokenService.js';

export type PublicationStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface PublicationTask {
  id: string;
  platform: 'etsy' | 'pinterest';
  accountId: string;
  contentId: string;
  contentVersionId: string;
  title: string;
  description: string;
  imageUrl?: string;
  destinationUrl?: string;
  boardId?: string;
  listingId?: number;
  scheduledAt: string; // Stored in UTC (ISO string)
  status: PublicationStatus;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  externalId?: string;
  createdAt: string; // UTC
  publishedAt?: string; // UTC
}

export class PublicationWorker {
  private static instance: PublicationWorker;
  private tasks: Map<string, PublicationTask> = new Map();
  private processingLocks: Set<string> = new Set();
  private isRunning = false;
  private workerInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startWorker();
  }

  public static getInstance(): PublicationWorker {
    if (!PublicationWorker.instance) {
      PublicationWorker.instance = new PublicationWorker();
    }
    return PublicationWorker.instance;
  }

  /**
   * Schedules a task for publication. Content MUST be APPROVED.
   */
  public async scheduleTask(taskData: {
    platform: 'etsy' | 'pinterest';
    accountId: string;
    contentId: string;
    contentVersionId: string;
    title: string;
    description: string;
    imageUrl?: string;
    destinationUrl?: string;
    boardId?: string;
    listingId?: number;
    scheduledAt: string; // ISO UTC string
    isApproved: boolean;
  }): Promise<PublicationTask> {
    if (!taskData.isApproved) {
      throw new Error('APPROVAL_REQUIRED: Content must be explicitly approved before scheduling.');
    }

    const scheduledDate = new Date(taskData.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('INVALID_DATE: Invalid scheduledAt ISO date format.');
    }

    // Generate unique idempotency key
    const idempotencyKey = `idemp_${taskData.platform}_${taskData.contentId}_${taskData.contentVersionId}_${scheduledDate.getTime()}`;

    // Duplicate check
    for (const existing of this.tasks.values()) {
      if (existing.idempotencyKey === idempotencyKey && existing.status !== 'CANCELLED') {
        return existing;
      }
    }

    const task: PublicationTask = {
      id: `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      platform: taskData.platform,
      accountId: taskData.accountId,
      contentId: taskData.contentId,
      contentVersionId: taskData.contentVersionId,
      title: taskData.title,
      description: taskData.description,
      imageUrl: taskData.imageUrl,
      destinationUrl: taskData.destinationUrl,
      boardId: taskData.boardId,
      listingId: taskData.listingId,
      scheduledAt: scheduledDate.toISOString(),
      status: 'SCHEDULED',
      idempotencyKey,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString()
    };

    this.tasks.set(task.id, task);

    await AuditService.log(
      'SCHEDULE_CREATED',
      'publication_task',
      task.id,
      `Scheduled ${task.platform.toUpperCase()} publication for ${task.scheduledAt}`
    );

    NotificationService.getInstance().notify({
      type: 'PUBLICATION_SCHEDULED',
      title: 'Publication Programmée',
      message: `Votre contenu "${task.title}" est programmé sur ${task.platform.toUpperCase()} pour le ${new Date(task.scheduledAt).toLocaleString()}.`,
      platform: task.platform
    });

    return task;
  }

  /**
   * Immediately publishes an approved task (Publish Now)
   */
  public async publishNow(taskData: {
    platform: 'etsy' | 'pinterest';
    accountId: string;
    contentId: string;
    contentVersionId: string;
    title: string;
    description: string;
    imageUrl?: string;
    destinationUrl?: string;
    boardId?: string;
    listingId?: number;
    isApproved: boolean;
  }): Promise<PublicationTask> {
    if (!taskData.isApproved) {
      throw new Error('APPROVAL_REQUIRED: Content must be explicitly approved before publishing.');
    }

    const task = await this.scheduleTask({
      ...taskData,
      scheduledAt: new Date().toISOString()
    });

    await this.processTask(task.id);
    return this.tasks.get(task.id)!;
  }

  /**
   * Cancels a scheduled task
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status === 'PUBLISHED') {
      throw new Error('CANNOT_CANCEL_PUBLISHED: A published task cannot be cancelled.');
    }

    task.status = 'CANCELLED';
    this.tasks.set(taskId, task);

    await AuditService.log('SCHEDULE_CANCELLED', 'publication_task', taskId, `Cancelled publication "${task.title}"`);
    NotificationService.getInstance().notify({
      type: 'PUBLICATION_SCHEDULED',
      title: 'Publication Annulée',
      message: `La publication "${task.title}" a été annulée.`,
      platform: task.platform,
      severity: 'warning'
    });
    return true;
  }

  /**
   * Processes a single publication task with concurrency locking and idempotency protection
   */
  public async processTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Idempotency: Prevent re-publishing if already published
    if (task.status === 'PUBLISHED' || task.externalId) {
      return true;
    }

    // Concurrency Lock
    if (this.processingLocks.has(taskId) || task.status === 'PUBLISHING') {
      return false;
    }

    this.processingLocks.add(taskId);
    task.status = 'PUBLISHING';
    task.attempts++;
    this.tasks.set(taskId, task);

    await AuditService.log(
      'PUBLISH_STARTED',
      'publication_task',
      taskId,
      `Attempt ${task.attempts}/${task.maxAttempts} for "${task.title}"`
    );

    NotificationService.getInstance().notify({
      type: 'PUBLICATION_STARTED',
      title: 'Publication en cours',
      message: `Déploiement du contenu "${task.title}" vers ${task.platform.toUpperCase()}...`,
      platform: task.platform
    });

    try {
      // 1. Verify and refresh token if needed
      await this.verifyAuthentication(task.platform, task.accountId);

      // 2. Dispatch to Platform API
      let externalId = '';
      const isControlledTest = process.env.CONTROLLED_PUBLICATION_TEST === 'true';

      if (task.platform === 'pinterest') {
        if (!task.imageUrl) throw new Error('MISSING_IMAGE: Pinterest pin requires an image URL.');
        const boardId = isControlledTest ? (task.boardId || 'board_sandbox_test') : (task.boardId || 'board_anime_cases');
        const pin = await PinterestService.getInstance().createPin({
          title: task.title,
          description: task.description,
          link: task.destinationUrl || 'https://craftcases.studio',
          board_id: boardId,
          media_source: {
            source_type: 'image_url',
            url: task.imageUrl
          }
        });
        externalId = pin.id;
      } else if (task.platform === 'etsy') {
        if (isControlledTest) {
          // Strictly creates DRAFT listing. NEVER publishes or activates.
          const draft = await EtsyService.getInstance().createDraftListing(18492039, {
            title: task.title,
            description: task.description,
            price: 1.00,
            quantity: 1,
            tags: ['integration-test', 'etsy-pilot-ai', 'controlled-test', 'TEST-ONLY']
          });
          externalId = String(draft.listing_id);
        } else {
          const listingId = task.listingId || 1849203941;
          const updated = await EtsyService.getInstance().updateListing(18492039, listingId, {
            title: task.title,
            description: task.description
          });
          externalId = String(updated.listing_id);
        }
      }

      // 3. Mark as PUBLISHED
      task.status = 'PUBLISHED';
      task.externalId = externalId;
      task.publishedAt = new Date().toISOString();
      task.lastError = undefined;
      this.tasks.set(taskId, task);

      await AuditService.log(
        'PUBLISH_SUCCESS',
        'publication_task',
        taskId,
        `Published successfully on ${task.platform.toUpperCase()} with External ID: ${externalId}`
      );

      NotificationService.getInstance().notify({
        type: 'PUBLICATION_SUCCESS',
        title: 'Publication Réussie !',
        message: `Votre contenu "${task.title}" est maintenant en ligne sur ${task.platform.toUpperCase()} (ID: ${externalId}).`,
        platform: task.platform,
        severity: 'success',
        metadata: { externalId }
      });

      this.processingLocks.delete(taskId);
      return true;
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown publication error';
      task.lastError = errorMsg;

      // Classify Retryable vs Non-Retryable
      const isRetryable =
        errorMsg.includes('429') ||
        errorMsg.includes('Rate Limit') ||
        errorMsg.includes('500') ||
        errorMsg.includes('502') ||
        errorMsg.includes('503') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('network');

      if (isRetryable && task.attempts < task.maxAttempts) {
        // Exponential backoff
        task.status = 'SCHEDULED';
        const delaySeconds = Math.pow(2, task.attempts) * 30 + Math.floor(Math.random() * 10);
        task.scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        this.tasks.set(taskId, task);

        await AuditService.log(
          'PUBLISH_RETRY',
          'publication_task',
          taskId,
          `Retryable failure (${errorMsg}). Next attempt scheduled in ${delaySeconds}s`,
          'warning'
        );

        NotificationService.getInstance().notify({
          type: 'RETRY_SCHEDULED',
          title: 'Nouvelle Tentative Programmée',
          message: `Échec temporaire sur ${task.platform.toUpperCase()}. Prochaine tentative dans ${delaySeconds}s.`,
          platform: task.platform,
          severity: 'warning'
        });
      } else {
        task.status = 'FAILED';
        this.tasks.set(taskId, task);

        await AuditService.log(
          'PUBLISH_FAILED',
          'publication_task',
          taskId,
          `Permanent failure after ${task.attempts} attempts: ${errorMsg}`,
          'error'
        );

        NotificationService.getInstance().notify({
          type: 'PUBLICATION_FAILED',
          title: 'Échec de Publication',
          message: `Impossible de publier "${task.title}" : ${errorMsg}`,
          platform: task.platform,
          severity: 'error'
        });
      }

      this.processingLocks.delete(taskId);
      return false;
    }
  }

  private async verifyAuthentication(platform: 'etsy' | 'pinterest', accountId: string): Promise<void> {
    if (platform === 'etsy') {
      const hasToken = EtsyTokenService.getInstance().hasToken(accountId);
      if (!hasToken && process.env.ETSY_CLIENT_ID) {
        throw new Error('AUTH_ERROR: Etsy store is disconnected. Please re-authenticate.');
      }
    } else if (platform === 'pinterest') {
      const hasToken = PinterestTokenService.getInstance().hasToken(accountId);
      if (!hasToken && process.env.PINTEREST_APP_ID) {
        throw new Error('AUTH_ERROR: Pinterest account is disconnected. Please re-authenticate.');
      }
    }
  }

  public async processDueTasks(): Promise<number> {
    const now = new Date();
    let processed = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'SCHEDULED' && new Date(task.scheduledAt) <= now) {
        processed++;
        await this.processTask(id);
      }
    }
    return processed;
  }

  public startWorker(intervalMs = 15000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.workerInterval = setInterval(async () => {
      await this.processDueTasks();
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
    this.isRunning = false;
  }

  public getTasks(): PublicationTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getTask(id: string): PublicationTask | null {
    return this.tasks.get(id) || null;
  }
}
