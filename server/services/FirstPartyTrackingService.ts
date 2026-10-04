import crypto from 'crypto';
import { 
  TrackingLink, 
  TrackingEventRecord, 
  TrackingEventType, 
  AttributionSummary 
} from '../../src/types/index.js';
import { AuditService } from './AuditService.js';

export class FirstPartyTrackingService {
  private static instance: FirstPartyTrackingService;
  private links: Map<string, TrackingLink> = new Map();
  private events: TrackingEventRecord[] = [];

  // Allowed domains for redirection to prevent open redirect vulnerabilities
  private readonly allowedDomains = [
    'etsy.com',
    'www.etsy.com',
    'pinterest.com',
    'www.pinterest.com',
    'craftcases.studio',
    'www.craftcases.studio'
  ];

  private constructor() {
    this.seedTrackingLinks();
  }

  public static getInstance(): FirstPartyTrackingService {
    if (!FirstPartyTrackingService.instance) {
      FirstPartyTrackingService.instance = new FirstPartyTrackingService();
    }
    return FirstPartyTrackingService.instance;
  }

  /**
   * Validates destination URL against open redirect vulnerabilities
   */
  public isValidDestinationUrl(urlStr: string): boolean {
    try {
      if (urlStr.startsWith('/')) return true; // Safe relative URL
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();
      return this.allowedDomains.some((d) => hostname === d || hostname.endsWith('.' + d));
    } catch {
      return false;
    }
  }

  /**
   * Creates a verified first-party tracking link
   */
  public async createTrackingLink(data: {
    platform: 'pinterest' | 'etsy' | 'direct' | 'social';
    contentId?: string;
    contentVersionId?: string;
    destinationUrl: string;
    campaign: string;
    source: string;
    medium: string;
    term?: string;
  }): Promise<TrackingLink> {
    if (!this.isValidDestinationUrl(data.destinationUrl)) {
      throw new Error('INVALID_DESTINATION_URL: Destination URL must be a verified domain (etsy.com, pinterest.com, craftcases.studio).');
    }

    const trackingCode = `trk_${crypto.randomBytes(4).toString('hex')}`;
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/t/${trackingCode}`;

    const link: TrackingLink = {
      id: 'link_' + crypto.randomBytes(6).toString('hex'),
      platform: data.platform,
      contentId: data.contentId,
      contentVersionId: data.contentVersionId,
      destinationUrl: data.destinationUrl,
      trackingUrl,
      trackingCode,
      campaign: data.campaign,
      source: data.source,
      medium: data.medium,
      term: data.term,
      createdAt: new Date().toISOString(),
      clicksCount: 0,
      conversionsCount: 0
    };

    this.links.set(link.trackingCode, link);

    await AuditService.log(
      'TRACKING_LINK_CREATED',
      'tracking_link',
      link.id,
      `Created link for campaign "${link.campaign}" targeting ${link.destinationUrl}`
    );

    return link;
  }

  public getTrackingLinks(): TrackingLink[] {
    return Array.from(this.links.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getLinkByCode(trackingCode: string): TrackingLink | undefined {
    return this.links.get(trackingCode);
  }

  /**
   * Handles tracked redirect securely and records a CLICK event with anonymized session hash
   */
  public async handleRedirect(trackingCode: string, ip: string, userAgent: string, referrer?: string) {
    const link = this.links.get(trackingCode);
    if (!link) {
      return { destinationUrl: 'https://craftcases.studio', notFound: true };
    }

    // Anonymized session hash: SHA256(ip + userAgent + daily_salt)
    // NEVER stores raw IP or personally identifiable information
    const salt = new Date().toISOString().split('T')[0];
    const anonymousSessionId = crypto
      .createHash('sha256')
      .update(`${ip || '127.0.0.1'}-${userAgent || 'unknown'}-${salt}`)
      .digest('hex')
      .substring(0, 16);

    link.clicksCount += 1;
    this.links.set(trackingCode, link);

    this.recordEvent({
      trackingLinkId: link.id,
      eventType: 'CLICK',
      anonymousSessionId,
      metadata: { referrer: referrer ? referrer.substring(0, 100) : 'direct' }
    });

    return { destinationUrl: link.destinationUrl, notFound: false };
  }

  /**
   * Records a tracking event (CLICK, LANDING, CONVERSION)
   */
  public recordEvent(eventData: {
    trackingLinkId: string;
    eventType: TrackingEventType;
    anonymousSessionId?: string;
    metadata?: Record<string, any>;
  }): TrackingEventRecord {
    const eventRecord: TrackingEventRecord = {
      id: 'evt_' + crypto.randomBytes(8).toString('hex'),
      trackingLinkId: eventData.trackingLinkId,
      eventType: eventData.eventType,
      timestamp: new Date().toISOString(),
      anonymousSessionId: eventData.anonymousSessionId,
      metadata: eventData.metadata
    };

    this.events.push(eventRecord);

    if (eventData.eventType === 'CONVERSION') {
      for (const link of this.links.values()) {
        if (link.id === eventData.trackingLinkId) {
          link.conversionsCount += 1;
          this.links.set(link.trackingCode, link);
          break;
        }
      }
    }

    return eventRecord;
  }

  public getEvents(limit = 100): TrackingEventRecord[] {
    return this.events.slice(-limit);
  }

  /**
   * Generates neutral attribution summary
   */
  public getAttributionSummary(): AttributionSummary[] {
    const map = new Map<string, { clicks: number; landings: number; conversions: number; commission: number }>();

    for (const link of this.links.values()) {
      const dim = `${link.platform.toUpperCase()} — ${link.campaign}`;
      const existing = map.get(dim) || { clicks: 0, landings: 0, conversions: 0, commission: 0 };
      existing.clicks += link.clicksCount;
      existing.conversions += link.conversionsCount;
      // Landing estimations from tracked events
      const linkEvents = this.events.filter((e) => e.trackingLinkId === link.id);
      existing.landings += linkEvents.filter((e) => e.eventType === 'LANDING').length;
      
      // Separate commissions strictly: Only calculate commission when supported conversions exist
      existing.commission += existing.conversions * 4.50; // $4.50 standard commission per conversion
      map.set(dim, existing);
    }

    return Array.from(map.entries()).map(([dimension, data]) => ({
      dimension,
      clicks: data.clicks,
      landings: data.landings,
      conversions: data.conversions,
      conversionRate: data.clicks > 0 ? Number(((data.conversions / data.clicks) * 100).toFixed(2)) : 0,
      commission: data.commission,
      status: 'TRACKED_CLICK'
    }));
  }

  private seedTrackingLinks() {
    const initial = [
      {
        platform: 'pinterest' as const,
        destinationUrl: 'https://etsy.com/listing/1849203941',
        campaign: 'Celestial Dragon Autumn 2026',
        source: 'pinterest_organic',
        medium: 'pin_vertical_916',
        trackingCode: 'trk_dragon_pin'
      },
      {
        platform: 'pinterest' as const,
        destinationUrl: 'https://etsy.com/listing/1849203942',
        campaign: 'Mystic Kitsune Art Nouveau',
        source: 'pinterest_organic',
        medium: 'pin_carousel',
        trackingCode: 'trk_kitsune_pin'
      },
      {
        platform: 'etsy' as const,
        destinationUrl: 'https://craftcases.studio/cases/sakura',
        campaign: 'Etsy Storefront Bio Link',
        source: 'etsy_shop_bio',
        medium: 'referral',
        trackingCode: 'trk_etsy_bio'
      }
    ];

    for (const item of initial) {
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const link: TrackingLink = {
        id: 'link_' + crypto.randomBytes(6).toString('hex'),
        platform: item.platform,
        destinationUrl: item.destinationUrl,
        trackingUrl: `${baseUrl}/t/${item.trackingCode}`,
        trackingCode: item.trackingCode,
        campaign: item.campaign,
        source: item.source,
        medium: item.medium,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        clicksCount: item.platform === 'pinterest' ? 142 : 56,
        conversionsCount: item.platform === 'pinterest' ? 6 : 2
      };
      this.links.set(link.trackingCode, link);
    }
  }
}
