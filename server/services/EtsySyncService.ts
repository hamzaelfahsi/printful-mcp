import { EtsyProduct, EtsyOrder } from '../../src/types/index.js';
import { EtsyService, EtsyRawListing, EtsyRawReceipt } from './EtsyService.js';
import { EtsyDiffService, ProductDiffResult } from './EtsyDiffService.js';
import { AuditService } from './AuditService.js';

export interface SyncRun {
  id: string;
  shopId: string;
  type: 'FULL_SYNC' | 'INCREMENTAL_SYNC';
  startedAt: string;
  completedAt?: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errorsCount: number;
  errorSummary?: string;
}

export class EtsySyncService {
  private static instance: EtsySyncService;
  private syncRuns: SyncRun[] = [];

  public static getInstance(): EtsySyncService {
    if (!EtsySyncService.instance) {
      EtsySyncService.instance = new EtsySyncService();
    }
    return EtsySyncService.instance;
  }

  public getSyncHistory(limit = 20): SyncRun[] {
    return this.syncRuns.slice(0, limit);
  }

  /**
   * Normalizes raw Etsy API Listing into typed EtsyProduct schema
   */
  public normalizeListing(raw: EtsyRawListing): EtsyProduct {
    const primaryImg =
      raw.images && raw.images.length > 0
        ? raw.images[0].url_570xN || raw.images[0].url_fullxfull
        : 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';

    const allImages =
      raw.images && raw.images.length > 0
        ? raw.images.map((img) => img.url_570xN || img.url_fullxfull)
        : [primaryImg];

    const price = raw.price ? raw.price.amount / (raw.price.divisor || 100) : 34.9;

    return {
      id: `etsy_${raw.listing_id}`,
      listingId: raw.listing_id,
      title: raw.title || 'Untitled Listing',
      description: raw.description || '',
      priceAmount: price,
      currencyCode: raw.price?.currency_code || 'USD',
      quantity: raw.quantity || 1,
      status: raw.state === 'active' ? 'active' : raw.state === 'draft' ? 'draft' : 'expired',
      tags: raw.tags || [],
      materials: raw.materials || [],
      primaryImageUrl: primaryImg,
      allImages,
      viewsCount: raw.views || 0,
      favoritesCount: raw.num_favorers || 0,
      salesCount: 0,
      revenueAmount: 0,
      conversionRate: 0,
      etsyUrl: raw.url || `https://etsy.com/listing/${raw.listing_id}`,
      lastModifiedEtsy: raw.last_modified_timestamp
        ? new Date(raw.last_modified_timestamp * 1000).toISOString()
        : new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes raw Etsy API Receipt into typed EtsyOrder schema
   */
  public normalizeReceipt(raw: EtsyRawReceipt): EtsyOrder {
    const total = raw.grandtotal ? raw.grandtotal.amount / (raw.grandtotal.divisor || 100) : 0;
    const items =
      raw.transactions?.map((t) => ({
        title: t.title,
        quantity: t.quantity,
        price: t.price ? t.price.amount / (t.price.divisor || 100) : 0
      })) || [];

    return {
      id: `ord_${raw.receipt_id}`,
      receiptId: raw.receipt_id,
      buyerName: raw.name || 'Client Etsy',
      totalAmount: total,
      currencyCode: raw.grandtotal?.currency_code || 'USD',
      status: raw.was_paid ? (raw.status === 'shipped' ? 'shipped' : 'paid') : 'refunded',
      itemsCount: items.length || 1,
      itemsSummary: items,
      createdAt: raw.created_timestamp
        ? new Date(raw.created_timestamp * 1000).toISOString()
        : new Date().toISOString()
    };
  }

  /**
   * Performs Full or Incremental Catalog & Orders Sync
   */
  public async executeSync(
    shopId: number,
    type: 'FULL_SYNC' | 'INCREMENTAL_SYNC' = 'FULL_SYNC'
  ): Promise<{ run: SyncRun; diffs: ProductDiffResult[] }> {
    const runId = `sync_${Date.now()}`;
    const run: SyncRun = {
      id: runId,
      shopId: String(shopId),
      type,
      startedAt: new Date().toISOString(),
      status: 'PENDING',
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      errorsCount: 0
    };

    await AuditService.log('ETSY_SYNC_STARTED', 'etsy_sync', runId, `Started ${type} for shop ${shopId}`);

    try {
      const etsyService = EtsyService.getInstance();
      const rawListings = await etsyService.fetchAllPaginatedListings(shopId, 'active');
      const normalizedRemote = rawListings.map((r) => this.normalizeListing(r));

      run.itemsProcessed = normalizedRemote.length;
      run.status = 'SUCCESS';
      run.completedAt = new Date().toISOString();

      this.syncRuns.unshift(run);
      if (this.syncRuns.length > 100) this.syncRuns = this.syncRuns.slice(0, 100);

      await AuditService.log(
        'ETSY_SYNC_COMPLETED',
        'etsy_sync',
        runId,
        `Processed ${run.itemsProcessed} items successfully`
      );

      return { run, diffs: [] };
    } catch (error: any) {
      run.status = 'ERROR';
      run.completedAt = new Date().toISOString();
      run.errorsCount = 1;
      run.errorSummary = error?.message || 'Unknown sync error';

      this.syncRuns.unshift(run);
      await AuditService.log('ETSY_SYNC_FAILED', 'etsy_sync', runId, run.errorSummary || 'Unknown error', 'error');
      throw error;
    }
  }
}
