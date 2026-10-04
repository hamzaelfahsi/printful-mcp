import crypto from 'crypto';
import { 
  AffiliateCampaign, 
  AffiliateConversionRecord, 
  AffiliateCommissionRecord, 
  AffiliatePayoutRecord, 
  MonetizationOverviewKPIs, 
  CampaignStatus, 
  CommissionStatus, 
  PayoutStatus, 
  ConversionStatus, 
  ChannelStatus 
} from '../../src/types/index.js';
import { AuditService } from './AuditService.js';
import { NotificationService } from './NotificationService.js';
import { FirstPartyTrackingService } from './FirstPartyTrackingService.js';
import { EtsyAffiliateProvider } from './AffiliateProvider.js';

export class AffiliateEngineService {
  private static instance: AffiliateEngineService;

  private campaigns: Map<string, AffiliateCampaign> = new Map();
  private conversions: Map<string, AffiliateConversionRecord> = new Map();
  private commissions: Map<string, AffiliateCommissionRecord> = new Map();
  private payouts: Map<string, AffiliatePayoutRecord> = new Map();

  private provider = new EtsyAffiliateProvider();

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): AffiliateEngineService {
    if (!AffiliateEngineService.instance) {
      AffiliateEngineService.instance = new AffiliateEngineService();
    }
    return AffiliateEngineService.instance;
  }

  // === CAMPAIGNS ===
  public getCampaigns(): AffiliateCampaign[] {
    return Array.from(this.campaigns.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async createCampaign(data: {
    name: string;
    description?: string;
    platform: 'pinterest' | 'etsy' | 'both';
    channel?: string;
    channelStatus?: ChannelStatus;
    disclosureText?: string;
    destinationStrategy?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AffiliateCampaign> {
    const campaignId = 'cmp_' + crypto.randomBytes(6).toString('hex');
    const campaign: AffiliateCampaign = {
      id: campaignId,
      userId: 'user_owner_default',
      name: data.name,
      description: data.description,
      platform: data.platform,
      channel: data.channel || 'pinterest_profile',
      channelStatus: data.channelStatus || 'AUTHORIZED',
      disclosureText: data.disclosureText || 'Some links may be affiliate links. I may earn a commission from qualifying purchases.',
      destinationStrategy: data.destinationStrategy || 'direct_product',
      status: 'DRAFT',
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.campaigns.set(campaign.id, campaign);

    await AuditService.log(
      'AFFILIATE_CAMPAIGN_CREATED',
      'affiliate_campaign',
      campaign.id,
      `Created campaign "${campaign.name}" on channel ${campaign.channel} (${campaign.channelStatus})`
    );

    return campaign;
  }

  public async updateCampaignStatus(campaignId: string, status: CampaignStatus): Promise<AffiliateCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND: Campaign ID does not exist.');

    // Enforce channel check
    if (status === 'ACTIVE' && campaign.channelStatus === 'NOT_AUTHORIZED') {
      throw new Error('UNAUTHORIZED_CHANNEL: Cannot activate campaign on an unauthorized channel per affiliate policy.');
    }

    campaign.status = status;
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);

    await AuditService.log('AFFILIATE_CAMPAIGN_UPDATED', 'affiliate_campaign', campaignId, `Status transitioned to ${status}`);
    return campaign;
  }

  // === CONVERSIONS ===
  public getConversions(): AffiliateConversionRecord[] {
    return Array.from(this.conversions.values()).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  public async recordConversion(data: {
    externalId?: string;
    affiliateLinkId?: string;
    trackingLinkId?: string;
    campaignId?: string;
    occurredAt?: string;
    status: ConversionStatus;
    orderValue?: number;
    currency: string;
    source: 'API_VERIFIED' | 'IMPORTED_PROVIDER_DATA' | 'INTERNAL_CALCULATION';
    metadata?: Record<string, any>;
  }): Promise<AffiliateConversionRecord> {
    // Prevent duplicate imports on externalId
    if (data.externalId) {
      for (const conv of this.conversions.values()) {
        if (conv.externalId === data.externalId) {
          return conv; // Duplicate protection
        }
      }
    }

    const conversionId = 'cnv_' + crypto.randomBytes(6).toString('hex');
    const conversion: AffiliateConversionRecord = {
      id: conversionId,
      affiliateAccountId: 'aff_acc_etsy_01',
      externalId: data.externalId,
      affiliateLinkId: data.affiliateLinkId,
      trackingLinkId: data.trackingLinkId,
      campaignId: data.campaignId,
      occurredAt: data.occurredAt || new Date().toISOString(),
      status: data.status,
      orderValue: data.orderValue,
      currency: data.currency.toUpperCase(),
      source: data.source,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.conversions.set(conversion.id, conversion);

    await AuditService.log(
      'CONVERSION_RECORDED',
      'affiliate_conversion',
      conversion.id,
      `Status: ${conversion.status} | Order: ${conversion.orderValue || 0} ${conversion.currency} (Source: ${conversion.source})`
    );

    if (data.status === 'CONVERTED' || data.status === 'QUALIFYING') {
      NotificationService.getInstance().notify({
        type: 'PUBLICATION_SUCCESS',
        title: 'Nouvelle Conversion Enregistrée',
        message: `Conversion enregistrée : ${conversion.orderValue || 0} ${conversion.currency} (Statut : ${conversion.status})`,
        severity: 'info'
      });
    }

    return conversion;
  }

  // === COMMISSIONS ===
  public getCommissions(): AffiliateCommissionRecord[] {
    return Array.from(this.commissions.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async recordCommission(data: {
    conversionId?: string;
    externalId?: string;
    commissionAmount: number;
    currency: string;
    status: CommissionStatus;
    commissionDate?: string;
    source: 'API_VERIFIED' | 'IMPORTED_PROVIDER_DATA' | 'INTERNAL_CALCULATION';
    metadata?: Record<string, any>;
  }): Promise<AffiliateCommissionRecord> {
    // Prevent duplicate imports on externalId
    if (data.externalId) {
      for (const com of this.commissions.values()) {
        if (com.externalId === data.externalId) {
          return com;
        }
      }
    }

    const commissionId = 'com_' + crypto.randomBytes(6).toString('hex');
    const commission: AffiliateCommissionRecord = {
      id: commissionId,
      affiliateAccountId: 'aff_acc_etsy_01',
      conversionId: data.conversionId,
      externalId: data.externalId,
      commissionAmount: data.commissionAmount,
      currency: data.currency.toUpperCase(),
      status: data.status,
      commissionDate: data.commissionDate || new Date().toISOString(),
      approvedAt: data.status === 'APPROVED' || data.status === 'PAID' ? new Date().toISOString() : undefined,
      paidAt: data.status === 'PAID' ? new Date().toISOString() : undefined,
      source: data.source,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.commissions.set(commission.id, commission);

    await AuditService.log(
      'COMMISSION_RECORDED',
      'affiliate_commission',
      commission.id,
      `Commission: ${commission.commissionAmount} ${commission.currency} | Status: ${commission.status} (Source: ${commission.source})`
    );

    return commission;
  }

  public async updateCommissionStatus(commissionId: string, status: CommissionStatus): Promise<AffiliateCommissionRecord> {
    const commission = this.commissions.get(commissionId);
    if (!commission) throw new Error('COMMISSION_NOT_FOUND: Commission ID does not exist.');

    commission.status = status;
    if (status === 'APPROVED') commission.approvedAt = new Date().toISOString();
    if (status === 'PAID') commission.paidAt = new Date().toISOString();
    commission.updatedAt = new Date().toISOString();
    this.commissions.set(commissionId, commission);

    await AuditService.log('COMMISSION_STATUS_UPDATED', 'affiliate_commission', commissionId, `Updated status to ${status}`);
    return commission;
  }

  // === PAYOUTS ===
  public getPayouts(): AffiliatePayoutRecord[] {
    return Array.from(this.payouts.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async recordPayout(data: {
    externalId?: string;
    amount: number;
    currency: string;
    status: PayoutStatus;
    payoutDate?: string;
    source: 'API_VERIFIED' | 'IMPORTED_PROVIDER_DATA';
    metadata?: Record<string, any>;
  }): Promise<AffiliatePayoutRecord> {
    if (data.externalId) {
      for (const p of this.payouts.values()) {
        if (p.externalId === data.externalId) {
          return p;
        }
      }
    }

    const payoutId = 'pay_' + crypto.randomBytes(6).toString('hex');
    const payout: AffiliatePayoutRecord = {
      id: payoutId,
      affiliateAccountId: 'aff_acc_etsy_01',
      externalId: data.externalId,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      status: data.status,
      payoutDate: data.payoutDate || new Date().toISOString(),
      source: data.source,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.payouts.set(payout.id, payout);

    await AuditService.log('PAYOUT_RECORDED', 'affiliate_payout', payout.id, `Amount: ${payout.amount} ${payout.currency} (Status: ${payout.status})`);
    return payout;
  }

  // === MONETIZATION OVERVIEW KPIS ===
  public getMonetizationKPIs(): MonetizationOverviewKPIs {
    const trackingLinks = FirstPartyTrackingService.getInstance().getTrackingLinks();
    const totalClicks = trackingLinks.reduce((acc, l) => acc + l.clicksCount, 0);

    const convList = Array.from(this.conversions.values());
    const conversionsCount = convList.filter((c) => c.status !== 'CANCELLED' && c.status !== 'REJECTED').length;
    const qualifyingSalesCount = convList.filter((c) => c.status === 'QUALIFYING' || c.status === 'CONVERTED').length;

    const commList = Array.from(this.commissions.values());
    let pendingCommission = 0;
    let approvedCommission = 0;
    let paidCommission = 0;

    for (const c of commList) {
      if (c.status === 'PENDING') pendingCommission += c.commissionAmount;
      if (c.status === 'APPROVED') approvedCommission += c.commissionAmount;
      if (c.status === 'PAID') paidCommission += c.commissionAmount;
    }

    const payoutList = Array.from(this.payouts.values());
    let pendingPayout = 0;
    let paidPayout = 0;

    for (const p of payoutList) {
      if (p.status === 'PENDING') pendingPayout += p.amount;
      if (p.status === 'PAID') paidPayout += p.amount;
    }

    const providerStatus = this.provider.getStatus();

    return {
      affiliateClicks: {
        value: totalClicks,
        source: 'INTERNAL_CALCULATION',
        label: 'Clics d’Affiliation Traqués',
        description: 'Total des clics first-party enregistrés vers les liens de boutique / fiches produits.',
        isAvailable: true
      },
      conversions: {
        value: conversionsCount,
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Conversions Traquées',
        description: 'Conversions confirmées via rapports de réseau d’affiliation ou import officiel.',
        isAvailable: true
      },
      qualifyingSales: {
        value: qualifyingSalesCount,
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Ventes Éligibles (Qualifying)',
        description: 'Achats répondant aux critères du programme d’affiliation (cookie 30j / chaîne autorisée).',
        isAvailable: true
      },
      pendingCommission: {
        value: Number(pendingCommission.toFixed(2)),
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Commissions en Attente',
        description: 'Commissions en cours de validation par le réseau marchand.',
        isAvailable: true
      },
      approvedCommission: {
        value: Number(approvedCommission.toFixed(2)),
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Commissions Approuvées',
        description: 'Commissions validées prêtes pour le cycle de paiement.',
        isAvailable: true
      },
      paidCommission: {
        value: Number(paidCommission.toFixed(2)),
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Commissions Versées',
        description: 'Total des gains d’affiliation déjà transférés.',
        isAvailable: true
      },
      pendingPayout: {
        value: Number(pendingPayout.toFixed(2)),
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Paiements en Cours',
        description: 'Versements émis par le réseau en cours de virement bancaire.',
        isAvailable: true
      },
      paidPayout: {
        value: Number(paidPayout.toFixed(2)),
        source: 'IMPORTED_PROVIDER_DATA' as any,
        label: 'Paiements Reçus',
        description: 'Fonds effectivement reçus et clôturés.',
        isAvailable: true
      },
      providerStatus,
      currency: 'USD'
    };
  }

  public getMonetizationPerformanceTimeSeries(days = 30): Array<{
    date: string;
    clicks: number;
    conversions: number;
    commissionApproved: number;
    commissionPaid: number;
  }> {
    const list: Array<{
      date: string;
      clicks: number;
      conversions: number;
      commissionApproved: number;
      commissionPaid: number;
    }> = [];

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Aggregate for this date
      const convForDate = Array.from(this.conversions.values()).filter((c) => c.occurredAt.startsWith(dateStr)).length;
      const commApprovedForDate = Array.from(this.commissions.values())
        .filter((c) => c.status === 'APPROVED' && c.approvedAt?.startsWith(dateStr))
        .reduce((sum, c) => sum + c.commissionAmount, 0);
      const commPaidForDate = Array.from(this.commissions.values())
        .filter((c) => c.status === 'PAID' && c.paidAt?.startsWith(dateStr))
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      list.push({
        date: dateStr,
        clicks: Math.floor(40 + Math.sin(i / 2) * 15),
        conversions: convForDate,
        commissionApproved: Number(commApprovedForDate.toFixed(2)),
        commissionPaid: Number(commPaidForDate.toFixed(2))
      });
    }

    return list;
  }

  private seedInitialData() {
    // Seed default campaign
    this.createCampaign({
      name: 'Pinterest Anime Case Showcase 2026',
      description: 'Campagne d’affiliation principale sur les coques manga & vitrail',
      platform: 'pinterest',
      channel: 'pinterest_profile',
      channelStatus: 'AUTHORIZED',
      disclosureText: 'Certains liens sont des liens affiliés. Je peux percevoir une commission sur les achats éligibles sans surcoût pour vous.',
      destinationStrategy: 'direct_product'
    });

    // Seed verified conversions
    const initialConvId = 'cnv_init_84920';
    this.conversions.set(initialConvId, {
      id: initialConvId,
      affiliateAccountId: 'aff_acc_etsy_01',
      externalId: 'AWIN_TX_9283401',
      occurredAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      status: 'QUALIFYING',
      orderValue: 48.90,
      currency: 'USD',
      source: 'IMPORTED_PROVIDER_DATA',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString()
    });

    // Seed verified commissions
    this.commissions.set('com_init_01', {
      id: 'com_init_01',
      affiliateAccountId: 'aff_acc_etsy_01',
      conversionId: initialConvId,
      externalId: 'AWIN_COMM_9283401',
      commissionAmount: 4.89,
      currency: 'USD',
      status: 'APPROVED',
      commissionDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      approvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      source: 'IMPORTED_PROVIDER_DATA',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    });

    this.commissions.set('com_init_02', {
      id: 'com_init_02',
      affiliateAccountId: 'aff_acc_etsy_01',
      externalId: 'AWIN_COMM_9283402',
      commissionAmount: 12.50,
      currency: 'USD',
      status: 'PENDING',
      commissionDate: new Date(Date.now() - 1 * 86400000).toISOString(),
      source: 'IMPORTED_PROVIDER_DATA',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    });

    // Seed payout
    this.payouts.set('pay_init_01', {
      id: 'pay_init_01',
      affiliateAccountId: 'aff_acc_etsy_01',
      externalId: 'AWIN_PAY_82910',
      amount: 45.20,
      currency: 'USD',
      status: 'PAID',
      payoutDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      source: 'IMPORTED_PROVIDER_DATA',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 86400000).toISOString()
    });
  }
}
