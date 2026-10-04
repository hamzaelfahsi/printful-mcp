import { AuditService } from './AuditService.js';
import { AffiliateService } from './AffiliateService.js';

export class TrackingService {
  public static async handleRedirect(trackingCode: string, ip: string, userAgent: string, referrer: string) {
    const links = AffiliateService.getLinks();
    const link = links.find((l) => l.trackingCode === trackingCode);

    if (!link || !link.isActive) {
      return { destinationUrl: 'https://etsy.com', notFound: true };
    }

    link.totalClicks += 1;
    // Anonymized tracking log
    await AuditService.log('TRACKING_CLICK', 'affiliate_redirect', trackingCode, `Referrer: ${referrer || 'Direct'}`);

    return { destinationUrl: link.affiliateUrl || link.originalUrl, notFound: false };
  }
}
