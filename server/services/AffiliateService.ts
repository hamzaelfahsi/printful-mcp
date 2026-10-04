import { AffiliateLink } from '../../src/types/index.js';
import { AuditService } from './AuditService.js';

export class AffiliateService {
  private static links: AffiliateLink[] = [
    {
      id: 'aff_1',
      campaignName: 'Pinterest Autumn Showcase 2026',
      trackingCode: 'pin-autumn-dragon',
      productId: 'prod_1',
      productTitle: 'Japanese Celestial Dragon Case',
      originalUrl: 'https://etsy.com/listing/982341234/japanese-celestial-dragon',
      affiliateUrl: 'https://etsy.me/3XkL98Q?utm_source=etsypilot&utm_campaign=autumn',
      isActive: true,
      totalClicks: 1420,
      uniqueClicks: 1190,
      conversions: 24,
      commission: 84.50,
      createdAt: '2026-09-15T10:00:00Z'
    },
    {
      id: 'aff_2',
      campaignName: 'Anime Art Nouveau Special',
      trackingCode: 'anime-kitsune-glass',
      productId: 'prod_2',
      productTitle: 'Mystic Kitsune Stained Glass Art Case',
      originalUrl: 'https://etsy.com/listing/982345678/mystic-kitsune-case',
      affiliateUrl: 'https://etsy.me/49YqK1M?utm_source=etsypilot&utm_campaign=kitsune',
      isActive: true,
      totalClicks: 890,
      uniqueClicks: 740,
      conversions: 31,
      commission: 122.80,
      createdAt: '2026-09-20T14:30:00Z'
    }
  ];

  public static getLinks(): AffiliateLink[] {
    return this.links;
  }

  public static async createLink(data: Omit<AffiliateLink, 'id' | 'totalClicks' | 'uniqueClicks' | 'conversions' | 'commission' | 'createdAt'>): Promise<AffiliateLink> {
    const newLink: AffiliateLink = {
      ...data,
      id: 'aff_' + Math.random().toString(36).substring(2, 9),
      totalClicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      commission: 0,
      createdAt: new Date().toISOString()
    };
    this.links.unshift(newLink);
    await AuditService.log('AFFILIATE_LINK_CREATED', 'affiliate_link', newLink.trackingCode, `Campaign: ${newLink.campaignName}`);
    return newLink;
  }
}
