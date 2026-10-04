import { AuditService } from './AuditService.js';
import { FullAIContentPackage } from './GeminiService.js';

export type ContentStatus = 'DRAFT' | 'GENERATED' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export interface ContentVersion {
  versionNumber: number;
  versionTag: string; // e.g., 'content_v1'
  package: FullAIContentPackage;
  createdAt: string;
  notes?: string;
}

export interface ManagedContentItem {
  id: string;
  productId: string;
  productTitle: string;
  status: ContentStatus;
  currentVersionNumber: number;
  versions: ContentVersion[];
  createdAt: string;
  approvedAt?: string;
  scheduledAt?: string;
  publishedAt?: string;
  externalEtsyId?: string;
  externalPinterestPinId?: string;
}

export class ContentVersioningService {
  private static instance: ContentVersioningService;
  private contentItems: Map<string, ManagedContentItem> = new Map();

  public static getInstance(): ContentVersioningService {
    if (!ContentVersioningService.instance) {
      ContentVersioningService.instance = new ContentVersioningService();
    }
    return ContentVersioningService.instance;
  }

  /**
   * Creates or adds a new generated version to a content item
   */
  public async addGeneratedVersion(
    productId: string,
    productTitle: string,
    aiPackage: FullAIContentPackage,
    notes?: string
  ): Promise<ManagedContentItem> {
    const existing = this.contentItems.get(productId);

    if (existing) {
      const nextVer = existing.versions.length + 1;
      const newVersion: ContentVersion = {
        versionNumber: nextVer,
        versionTag: `content_v${nextVer}`,
        package: aiPackage,
        createdAt: new Date().toISOString(),
        notes: notes || 'Regenerated AI Package'
      };

      existing.versions.push(newVersion);
      existing.currentVersionNumber = nextVer;
      // If was approved, transition back to REVIEW for re-evaluation
      if (existing.status === 'APPROVED') {
        existing.status = 'REVIEW';
      }
      this.contentItems.set(productId, existing);

      await AuditService.log(
        'CONTENT_VERSION_CREATED',
        'content_item',
        existing.id,
        `Created version content_v${nextVer} for "${productTitle}"`
      );
      return existing;
    }

    const initialVersion: ContentVersion = {
      versionNumber: 1,
      versionTag: 'content_v1',
      package: aiPackage,
      createdAt: new Date().toISOString(),
      notes: 'Initial AI Generation'
    };

    const newItem: ManagedContentItem = {
      id: `content_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId,
      productTitle,
      status: 'REVIEW',
      currentVersionNumber: 1,
      versions: [initialVersion],
      createdAt: new Date().toISOString()
    };

    this.contentItems.set(productId, newItem);
    await AuditService.log('CONTENT_ITEM_CREATED', 'content_item', newItem.id, `Created content item for "${productTitle}"`);
    return newItem;
  }

  /**
   * Restores a previous version
   */
  public async restoreVersion(productId: string, versionNumber: number): Promise<ManagedContentItem> {
    const item = this.contentItems.get(productId);
    if (!item) throw new Error(`Content item for product ${productId} not found.`);

    const targetVersion = item.versions.find((v) => v.versionNumber === versionNumber);
    if (!targetVersion) throw new Error(`Version ${versionNumber} not found.`);

    item.currentVersionNumber = versionNumber;
    item.status = 'REVIEW';
    this.contentItems.set(productId, item);

    await AuditService.log(
      'CONTENT_VERSION_RESTORED',
      'content_item',
      item.id,
      `Restored version content_v${versionNumber} for "${item.productTitle}"`
    );
    return item;
  }

  /**
   * Explicit user approval of the current active version
   */
  public async approveContent(productId: string): Promise<ManagedContentItem> {
    const item = this.contentItems.get(productId);
    if (!item) throw new Error(`Content item for product ${productId} not found.`);

    item.status = 'APPROVED';
    item.approvedAt = new Date().toISOString();
    this.contentItems.set(productId, item);

    await AuditService.log(
      'CONTENT_APPROVED',
      'content_item',
      item.id,
      `Approved version content_v${item.currentVersionNumber} for "${item.productTitle}"`
    );
    return item;
  }

  public getContentItem(productId: string): ManagedContentItem | null {
    return this.contentItems.get(productId) || null;
  }

  public getAllContentItems(): ManagedContentItem[] {
    return Array.from(this.contentItems.values());
  }
}
