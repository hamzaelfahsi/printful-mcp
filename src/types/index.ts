export type NavigationTab = 
  | 'dashboard'
  // Store
  | 'etsy-products'
  | 'etsy-orders'
  | 'etsy-listings'
  | 'etsy-sync'
  | 'etsy-sync-history'
  // Pinterest
  | 'pinterest-pins'
  | 'pinterest-boards'
  | 'pinterest-scheduler'
  // Content
  | 'content-generator'
  | 'content-queue'
  | 'content-calendar'
  // Analytics
  | 'analytics-overview'
  | 'analytics-etsy'
  | 'analytics-pinterest'
  | 'analytics-products'
  | 'analytics-traffic'
  // Monetization
  | 'affiliate-links'
  | 'affiliate-clicks'
  | 'affiliate-conversions'
  // AI
  | 'ai-insights'
  | 'ai-recommendations'
  | 'ai-ideas'
  // Settings
  | 'settings';

export type ProductStatus = 'active' | 'draft' | 'expired' | 'sold_out';

export interface EtsyProduct {
  id: string;
  listingId: number;
  title: string;
  description: string;
  priceAmount: number;
  currencyCode: string;
  quantity: number;
  status: ProductStatus;
  tags: string[];
  materials: string[];
  primaryImageUrl: string;
  allImages: string[];
  viewsCount: number;
  favoritesCount: number;
  salesCount: number;
  revenueAmount: number;
  conversionRate: number;
  etsyUrl: string;
  lastModifiedEtsy: string;
  lastSyncedAt: string;
}

export interface EtsyOrder {
  id: string;
  receiptId: number;
  buyerName: string;
  totalAmount: number;
  currencyCode: string;
  status: 'paid' | 'completed' | 'shipped' | 'refunded';
  itemsCount: number;
  itemsSummary: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'SECRET';
  pinCount: number;
  imageUrl?: string;
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  boardId: string;
  boardName: string;
  imageUrl: string;
  destinationUrl: string;
  createdAt: string;
  impressions: number;
  saves: number;
  outboundClicks: number;
  ctr: number;
}

export type ContentStatus = 'draft' | 'ready' | 'approved' | 'scheduled' | 'published' | 'failed';

export interface ContentItem {
  id: string;
  productId?: string;
  productTitle?: string;
  targetPlatform: 'pinterest' | 'etsy' | 'both';
  title: string;
  description: string;
  keywords: string[];
  callToAction: string;
  imageUrl: string;
  destinationUrl: string;
  targetBoardId?: string;
  targetBoardName?: string;
  status: ContentStatus;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
  approvalRequired: boolean;
}

export interface AffiliateLink {
  id: string;
  campaignName: string;
  trackingCode: string;
  productId?: string;
  productTitle?: string;
  originalUrl: string;
  affiliateUrl: string;
  isActive: boolean;
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  commission: number;
  createdAt: string;
}

export type InsightCategory = 
  | 'HIGH_TRAFFIC' 
  | 'HIGH_ENGAGEMENT' 
  | 'HIGH_CONVERSION' 
  | 'GROWING' 
  | 'DECLINING' 
  | 'INSUFFICIENT_DATA';

export interface AIInsight {
  id: string;
  productId: string;
  productTitle: string;
  category: InsightCategory;
  summary: string;
  dataTrigger: string;
  recommendedActions: string[];
  metrics: {
    views: number;
    clicks: number;
    sales: number;
    conversion: number;
  };
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  linkUrl?: string;
  isRead: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface DashboardKPIs {
  etsy: {
    totalProducts: number;
    activeListings: number;
    views: number;
    viewsTrend: number;
    favorites: number;
    favoritesTrend: number;
    orders: number;
    ordersTrend: number;
    revenue: number;
    revenueTrend: number;
  };
  pinterest: {
    impressions: number;
    impressionsTrend: number;
    saves: number;
    savesTrend: number;
    outboundClicks: number;
    clicksTrend: number;
    ctr: number;
    ctrTrend: number;
    publishedPins: number;
  };
  traffic: {
    etsyDirect: number;
    pinterestReferral: number;
    trackedAffiliateClicks: number;
    totalTrackedClicks: number;
  };
  monetization: {
    totalRevenue: number;
    revenueTrend: number;
    conversionRate: number;
    affiliateRevenue: number;
  };
}

// Phase 2 Types
export type DiffChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'UNCHANGED' | 'CONFLICT';

export interface FieldDiff {
  fieldName: string;
  localValue: any;
  etsyValue: any;
  isDifferent: boolean;
}

export interface ProductDiffResult {
  listingId: number;
  title: string;
  changeType: DiffChangeType;
  localProduct?: EtsyProduct;
  etsyListing?: Partial<EtsyProduct>;
  fieldDiffs: FieldDiff[];
  hasConflict: boolean;
  recommendedAction: 'ACCEPT_ETSY' | 'KEEP_LOCAL' | 'REVIEW';
}

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

export type EtsyConnectionState = 
  | 'CONNECTED' 
  | 'NOT_CONNECTED' 
  | 'CONNECTING' 
  | 'TOKEN_EXPIRED' 
  | 'ERROR' 
  | 'SYNCING' 
  | 'SYNC_ERROR';

// ==========================================
// Phase 6: Analytics, Tracking & Provenance
// ==========================================

export type MetricSource = 
  | 'API_VERIFIED' 
  | 'INTERNAL_CALCULATION' 
  | 'USER_PROVIDED' 
  | 'AI_ESTIMATE' 
  | 'API_UNAVAILABLE';

export interface AnalyticsDailyRecord {
  id: string;
  platform: 'etsy' | 'pinterest';
  accountId: string;
  shopId?: number;
  pinId?: string;
  listingId?: number;
  date: string; // YYYY-MM-DD
  metricName: string;
  metricValue: number;
  source: MetricSource;
  currency?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type SyncRunStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface AnalyticsSyncRun {
  id: string;
  platform: 'etsy' | 'pinterest' | 'all';
  accountId: string;
  startedAt: string;
  completedAt?: string;
  status: SyncRunStatus;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorCount: number;
  lastError?: string;
  createdAt: string;
}

export interface TrackingLink {
  id: string;
  platform: 'pinterest' | 'etsy' | 'direct' | 'social';
  contentId?: string;
  contentVersionId?: string;
  destinationUrl: string;
  trackingUrl: string;
  trackingCode: string;
  campaign: string;
  source: string;
  medium: string;
  term?: string;
  createdAt: string;
  clicksCount: number;
  conversionsCount: number;
}

export type TrackingEventType = 'CLICK' | 'LANDING' | 'CONVERSION';

export interface TrackingEventRecord {
  id: string;
  trackingLinkId: string;
  eventType: TrackingEventType;
  timestamp: string;
  anonymousSessionId?: string;
  metadata?: Record<string, any>;
}

export interface AttributionSummary {
  dimension: string;
  clicks: number;
  landings: number;
  conversions: number;
  conversionRate: number;
  commission: number;
  status: 'DIRECT' | 'TRACKED_CLICK' | 'UNKNOWN';
}

export interface ContentPerformanceLink {
  contentId: string;
  contentVersionId: string;
  platform: 'etsy' | 'pinterest';
  title: string;
  publishedAt: string;
  externalId: string;
  status: string;
  observedMetrics: {
    impressions?: number;
    outboundClicks?: number;
    saves?: number;
    orders?: number;
    revenue?: number;
  };
  provenance: MetricSource;
}

export interface ProvenanceMetric<T = number> {
  value: T;
  source: MetricSource;
  label: string;
  description?: string;
  isAvailable: boolean;
}

export interface VerifiedOverviewKPIs {
  etsySales: ProvenanceMetric<number>;
  etsyOrders: ProvenanceMetric<number>;
  etsyActiveListings: ProvenanceMetric<number>;
  pinterestImpressions: ProvenanceMetric<number>;
  pinterestEngagements: ProvenanceMetric<number>;
  pinterestOutboundClicks: ProvenanceMetric<number>;
  publishedContent: ProvenanceMetric<number>;
  scheduledContent: ProvenanceMetric<number>;
  lastSyncTimestamp?: string;
}

// ==========================================
// Phase 7: Monetization & Affiliate Engine
// ==========================================

export type AffiliateProviderStatus = 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'UNAVAILABLE';
export type ConversionStatus = 'CLICKED' | 'CONVERTED' | 'QUALIFYING' | 'REJECTED' | 'CANCELLED' | 'RETURNED' | 'UNKNOWN';
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVERSED' | 'PAID' | 'UNKNOWN';
export type PayoutStatus = 'PENDING' | 'PAID' | 'FAILED' | 'UNKNOWN';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type ChannelStatus = 'AUTHORIZED' | 'NOT_AUTHORIZED' | 'PENDING_REVIEW' | 'UNKNOWN';

export interface AffiliateAccount {
  id: string;
  userId: string;
  provider: string; // 'etsy_affiliate' | 'awin' | 'shareasale' | 'manual'
  externalAccountId?: string;
  status: AffiliateProviderStatus;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateCampaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  platform: 'pinterest' | 'etsy' | 'both';
  channel: string; // e.g. 'pinterest_profile'
  channelStatus: ChannelStatus;
  disclosureText: string;
  destinationStrategy: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateConversionRecord {
  id: string;
  affiliateAccountId: string;
  externalId?: string;
  affiliateLinkId?: string;
  trackingLinkId?: string;
  campaignId?: string;
  occurredAt: string;
  status: ConversionStatus;
  orderValue?: number;
  currency: string;
  source: MetricSource | 'IMPORTED_PROVIDER_DATA';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateCommissionRecord {
  id: string;
  affiliateAccountId: string;
  conversionId?: string;
  externalId?: string;
  commissionAmount: number;
  currency: string;
  status: CommissionStatus;
  commissionDate?: string;
  approvedAt?: string;
  paidAt?: string;
  source: MetricSource | 'IMPORTED_PROVIDER_DATA';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliatePayoutRecord {
  id: string;
  affiliateAccountId: string;
  externalId?: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  payoutDate?: string;
  source: MetricSource | 'IMPORTED_PROVIDER_DATA';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MonetizationOverviewKPIs {
  affiliateClicks: ProvenanceMetric<number>;
  conversions: ProvenanceMetric<number>;
  qualifyingSales: ProvenanceMetric<number>;
  pendingCommission: ProvenanceMetric<number>;
  approvedCommission: ProvenanceMetric<number>;
  paidCommission: ProvenanceMetric<number>;
  pendingPayout: ProvenanceMetric<number>;
  paidPayout: ProvenanceMetric<number>;
  providerStatus: AffiliateProviderStatus;
  currency: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
  errors: string[];
  records: any[];
}

// ==========================================
// Phase 8: Advanced AI Insights & Recommendations
// ==========================================

export type AIInsightType = 
  | 'PERFORMANCE_CHANGE' 
  | 'ANOMALY' 
  | 'CONTENT_OPPORTUNITY' 
  | 'SEO_OPPORTUNITY' 
  | 'CAMPAIGN_OPPORTUNITY' 
  | 'MONETIZATION_OPPORTUNITY' 
  | 'ENGAGEMENT_OPPORTUNITY' 
  | 'CONVERSION_OPPORTUNITY' 
  | 'DATA_QUALITY' 
  | 'SYNC_WARNING' 
  | 'CONTENT_RECOMMENDATION' 
  | 'SCHEDULING_RECOMMENDATION';

export type AIInsightSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
export type AIInsightConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type AIInsightStatus = 'NEW' | 'VIEWED' | 'DISMISSED' | 'SAVED' | 'IMPLEMENTED' | 'EXPIRED';

export interface AIInsightEvidence {
  label: string;
  previousValue?: number | string;
  currentValue?: number | string;
  changePercent?: number;
  source: MetricSource | 'IMPORTED_PROVIDER_DATA';
  period?: string;
  details?: string;
}

export interface AIInsightV2 {
  id: string;
  userId: string;
  type: AIInsightType;
  severity: AIInsightSeverity;
  title: string;
  summary: string;
  explanation: string;
  evidence: AIInsightEvidence[];
  recommendation: string;
  confidence: AIInsightConfidence;
  platform: 'etsy' | 'pinterest' | 'all';
  entityType?: string;
  entityId?: string;
  periodStart?: string;
  periodEnd?: string;
  sourceMetrics: string[];
  status: AIInsightStatus;
  createdAt: string;
  expiresAt?: string;
}

export type AIExperimentVariable = 
  | 'TITLE' 
  | 'DESCRIPTION' 
  | 'TAGS' 
  | 'KEYWORDS' 
  | 'IMAGE_STYLE' 
  | 'CTA' 
  | 'PUBLICATION_TIME' 
  | 'BOARD';

export type AIExperimentStatus = 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';

export interface AIExperiment {
  id: string;
  userId: string;
  name: string;
  hypothesis: string;
  platform: 'etsy' | 'pinterest';
  contentType: string;
  variable: AIExperimentVariable;
  control: string;
  variant: string;
  startDate?: string;
  endDate?: string;
  status: AIExperimentStatus;
  successMetric: string;
  sampleSize: number;
  controlMetricValue?: number;
  variantMetricValue?: number;
  differencePercent?: number;
  source: MetricSource;
  createdAt: string;
  updatedAt: string;
}

export type TrendDirection = 'INCREASING' | 'DECREASING' | 'STABLE' | 'INSUFFICIENT_DATA';

export interface TrendAnalysisResult {
  metricName: string;
  direction: TrendDirection;
  sampleCount: number;
  previousAverage: number;
  currentAverage: number;
  changePercent: number;
  confidence: AIInsightConfidence;
}

export interface AnomalyDetectionResult {
  metricName: string;
  isAnomaly: boolean;
  severity: AIInsightSeverity;
  baseline: number;
  currentValue: number;
  deviationPercent: number;
  explanation: string;
}



