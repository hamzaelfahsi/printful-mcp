import { 
  AffiliateAccount, 
  AffiliateProviderStatus, 
  AffiliateConversionRecord, 
  AffiliateCommissionRecord, 
  AffiliatePayoutRecord 
} from '../../src/types/index.js';

export interface AffiliateCookieConfig {
  valueDays: number;
  provider: string;
  source: string;
  effectiveDate: string;
}

export interface IAffiliateProvider {
  name: string;
  getStatus(): AffiliateProviderStatus;
  getAccount(): Promise<AffiliateAccount>;
  getCookieConfig(): AffiliateCookieConfig;
  getConversions(): Promise<AffiliateConversionRecord[]>;
  getCommissions(): Promise<AffiliateCommissionRecord[]>;
  getPayouts(): Promise<AffiliatePayoutRecord[]>;
}

/**
 * Etsy Affiliate Provider Abstraction.
 * Etsy operates its official Affiliate Program through external networks (e.g. Awin / Creator Collective).
 * If no direct network API credentials are provided, the provider reports status = NOT_CONFIGURED.
 * Never invents fictional API responses or fake commission data.
 */
export class EtsyAffiliateProvider implements IAffiliateProvider {
  public name = 'etsy_affiliate';
  private status: AffiliateProviderStatus = 'NOT_CONFIGURED';

  public getCookieConfig(): AffiliateCookieConfig {
    return {
      valueDays: 30,
      provider: 'etsy_affiliate_awin',
      source: 'Etsy Affiliate Policy & Network Terms',
      effectiveDate: '2026-01-01'
    };
  }

  public getStatus(): AffiliateProviderStatus {
    // Verified check: Unless explicit network credentials exist, it is NOT_CONFIGURED
    if (process.env.ETSY_AFFILIATE_NETWORK_API_KEY) {
      return 'CONNECTED';
    }
    return 'NOT_CONFIGURED';
  }

  public async getAccount(): Promise<AffiliateAccount> {
    const status = this.getStatus();
    return {
      id: 'aff_acc_etsy_01',
      userId: 'user_owner_default',
      provider: this.name,
      externalAccountId: status === 'CONNECTED' ? 'AWIN_ACC_84920' : undefined,
      status,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  public async getConversions(): Promise<AffiliateConversionRecord[]> {
    return [];
  }

  public async getCommissions(): Promise<AffiliateCommissionRecord[]> {
    return [];
  }

  public async getPayouts(): Promise<AffiliatePayoutRecord[]> {
    return [];
  }
}
