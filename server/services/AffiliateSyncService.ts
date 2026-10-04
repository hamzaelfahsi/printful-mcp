import { AffiliateEngineService } from './AffiliateEngineService.js';
import { EtsyAffiliateProvider } from './AffiliateProvider.js';
import { AuditService } from './AuditService.js';

export class AffiliateSyncService {
  private static instance: AffiliateSyncService;
  private provider = new EtsyAffiliateProvider();

  private constructor() {}

  public static getInstance(): AffiliateSyncService {
    if (!AffiliateSyncService.instance) {
      AffiliateSyncService.instance = new AffiliateSyncService();
    }
    return AffiliateSyncService.instance;
  }

  public async syncAffiliateAccount() {
    return this.provider.getAccount();
  }

  public async syncConversions() {
    return this.provider.getConversions();
  }

  public async syncCommissions() {
    return this.provider.getCommissions();
  }

  public async syncPayouts() {
    return this.provider.getPayouts();
  }

  public async syncAll() {
    const status = this.provider.getStatus();
    await AuditService.log('AFFILIATE_SYNC_TRIGGERED', 'affiliate_sync', 'provider_status', `Provider status: ${status}`);
    return {
      provider: this.provider.name,
      status,
      message: status === 'NOT_CONFIGURED' 
        ? 'Etsy Affiliate is operated via third-party networks (e.g. Awin/Creator Collective). Use CSV/JSON Import or configure network credentials.'
        : 'Affiliate provider synchronized.'
    };
  }
}
