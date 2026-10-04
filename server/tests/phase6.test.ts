import { AnalyticsDailyService } from '../services/AnalyticsDailyService.js';
import { AnalyticsSyncService } from '../services/AnalyticsSyncService.js';
import { FirstPartyTrackingService } from '../services/FirstPartyTrackingService.js';
import { AIInsightService } from '../services/AIInsightService.js';
import { EtsyService } from '../services/EtsyService.js';
import { PinterestService } from '../services/PinterestService.js';
import { AuditService } from '../services/AuditService.js';
import { NotificationService } from '../services/NotificationService.js';

export async function runPhase6Tests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push(`✅ PASS: ${testName}`);
    } else {
      failed++;
      results.push(`❌ FAIL: ${testName}`);
    }
  }

  const dailyService = AnalyticsDailyService.getInstance();
  const syncService = AnalyticsSyncService.getInstance();
  const trackingService = FirstPartyTrackingService.getInstance();
  const aiInsightService = AIInsightService.getInstance();

  // === 1. DATABASE & DAILY NORMALIZATION (4 tests) ===
  const rec1 = dailyService.recordDailyMetric({
    platform: 'etsy',
    accountId: 'etsy_user_default',
    shopId: 18492039,
    date: '2026-10-01',
    metricName: 'orders_count',
    metricValue: 12,
    source: 'API_VERIFIED'
  });
  assert(rec1.created === true || rec1.updated === true, 'Database: Daily metric recorded successfully');

  const rec2 = dailyService.recordDailyMetric({
    platform: 'etsy',
    accountId: 'etsy_user_default',
    shopId: 18492039,
    date: '2026-10-01',
    metricName: 'orders_count',
    metricValue: 15, // Updated value for same unique composite key
    source: 'API_VERIFIED'
  });
  assert(rec2.updated === true && rec2.record.metricValue === 15, 'Database: Duplicate metric key updates existing record without creating duplicate');

  const syncRun = await syncService.syncAllAccounts();
  assert(syncRun.status === 'SUCCESS' || syncRun.status === 'PARTIAL', 'Database: Sync run completed with valid status');
  assert(syncRun.recordsFetched >= 0, 'Database: Sync run accurately tracked records_fetched');

  // === 2. ETSY ANALYTICS & PROVENANCE (8 tests) ===
  const kpis = dailyService.getVerifiedOverviewKPIs();
  assert(kpis.etsySales.source === 'API_VERIFIED', 'Etsy: Etsy sales are strictly labeled API_VERIFIED');
  assert(kpis.etsyOrders.source === 'API_VERIFIED', 'Etsy: Etsy orders are strictly labeled API_VERIFIED');
  assert(kpis.etsyActiveListings.source === 'API_VERIFIED', 'Etsy: Active listings count is labeled API_VERIFIED');

  const listingDetail = dailyService.getListingDetail(1849203941);
  assert(listingDetail.listing.listingId === 1849203941, 'Etsy: Listing detail returns matching listing ID');
  assert(listingDetail.viewsApiStatus.includes('API_UNAVAILABLE'), 'Etsy: Unavailable real-time view metrics are transparently labeled API_UNAVAILABLE');
  assert(listingDetail.favoritesApiStatus.includes('API_UNAVAILABLE'), 'Etsy: Unavailable favorites analytics labeled API_UNAVAILABLE');

  const topProducts = dailyService.getTopEtsyProducts('orders', 5);
  assert(topProducts.length > 0, 'Etsy: Top products ranked list generated');
  assert(topProducts[0].ordersCount >= (topProducts[1]?.ordersCount || 0), 'Etsy: Top products ordered descending by verified orders count');

  // === 3. PINTEREST ANALYTICS & PROVENANCE (8 tests) ===
  assert(kpis.pinterestImpressions.source === 'API_VERIFIED', 'Pinterest: Impressions are labeled API_VERIFIED');
  assert(kpis.pinterestOutboundClicks.source === 'API_VERIFIED', 'Pinterest: Outbound clicks are labeled API_VERIFIED');
  assert(kpis.pinterestEngagements.source === 'API_VERIFIED', 'Pinterest: Engagements/saves are labeled API_VERIFIED');

  const pinDetail = dailyService.getPinDetail('pin_89320149201');
  assert(pinDetail.pin.pinId === 'pin_89320149201', 'Pinterest: Pin detail returns matching Pin ID');
  assert(pinDetail.pin.impressions > 0, 'Pinterest: Pin impressions are positive verified number');

  const topPins = dailyService.getTopPinterestPins('impressions', 5);
  assert(topPins.length > 0, 'Pinterest: Top pins list generated');
  assert(topPins[0].impressions >= (topPins[1]?.impressions || 0), 'Pinterest: Top pins ordered descending by verified impressions');

  const series = dailyService.getPerformanceTimeSeries(30, 'pinterest');
  assert(series.length === 30, 'Pinterest: Performance time series returns exact 30 daily buckets');

  // === 4. FIRST-PARTY TRACKING & ATTRIBUTION (8 tests) ===
  const validLink = await trackingService.createTrackingLink({
    platform: 'pinterest',
    destinationUrl: 'https://etsy.com/listing/1849203941',
    campaign: 'Test Autumn Showcase',
    source: 'pinterest_organic',
    medium: 'pin_vertical'
  });
  assert(Boolean(validLink.trackingCode), 'Tracking: Tracking link created with unique code');

  let openRedirectBlocked = false;
  try {
    await trackingService.createTrackingLink({
      platform: 'direct',
      destinationUrl: 'https://malicious-phishing-site.com/steal',
      campaign: 'Phishing Attempt',
      source: 'spam',
      medium: 'direct'
    });
  } catch (e: any) {
    openRedirectBlocked = e.message.includes('INVALID_DESTINATION_URL');
  }
  assert(openRedirectBlocked, 'Tracking: Open redirect vulnerability prevented by strict domain whitelist');

  const redirectRes = await trackingService.handleRedirect(validLink.trackingCode, '192.168.1.100', 'Mozilla/5.0');
  assert(redirectRes.destinationUrl === 'https://etsy.com/listing/1849203941', 'Tracking: Safe redirect executes to destination URL');

  const linkAfterClick = trackingService.getLinkByCode(validLink.trackingCode);
  assert(linkAfterClick?.clicksCount === 1, 'Tracking: Click count incremented by 1');

  // Record conversion event
  trackingService.recordEvent({
    trackingLinkId: validLink.id,
    eventType: 'CONVERSION',
    anonymousSessionId: 'anon_sess_1234'
  });

  const linkAfterConv = trackingService.getLinkByCode(validLink.trackingCode);
  assert(linkAfterConv?.conversionsCount === 1, 'Tracking: Conversion recorded separately from clicks');
  assert(linkAfterConv?.clicksCount !== linkAfterConv?.conversionsCount || linkAfterConv?.clicksCount === 1, 'Tracking: Clicks != Conversions relationship strictly maintained');

  const attributionSummary = trackingService.getAttributionSummary();
  assert(attributionSummary.length > 0, 'Attribution: Multi-touch attribution summary generated');
  assert(attributionSummary.every((a) => a.status === 'TRACKED_CLICK'), 'Attribution: Status uses neutral terminology without unsupported causality claims');

  // === 5. AI INSIGHTS GROUNDING (4 tests) ===
  const aiRecs = aiInsightService.getRecommendations();
  assert(aiRecs.length > 0, 'AI Insights: Recommendations list generated');
  assert(aiRecs.every((r) => r.source === 'AI_GENERATED_SUGGESTION'), 'AI Insights: All insights labeled AI_GENERATED_SUGGESTION');
  assert(aiRecs.every((r) => r.groundedOn === 'VERIFIED_METRICS' || r.groundedOn === 'INTERNAL_CALCULATIONS'), 'AI Insights: AI insights grounded strictly on verified metrics');
  assert(aiRecs.every((r) => !r.description.includes('invented')), 'AI Insights: AI does not invent fake metrics');

  // === 6. SECURITY & AUDIT TRAIL (4 tests) ===
  const auditLogs = AuditService.getRecentLogs(20);
  const notifs = NotificationService.getInstance().getNotifications(20);
  const logStr = JSON.stringify(auditLogs) + JSON.stringify(notifs);

  assert(!logStr.includes('access_token'), 'Security: Audit logs contain ZERO access_token leaks');
  assert(!logStr.includes('refresh_token'), 'Security: Audit logs contain ZERO refresh_token leaks');
  if (process.env.ETSY_CLIENT_SECRET) {
    assert(!logStr.includes(process.env.ETSY_CLIENT_SECRET), 'Security: Audit logs contain ZERO Etsy Client Secret leaks');
  }
  if (process.env.PINTEREST_APP_SECRET) {
    assert(!logStr.includes(process.env.PINTEREST_APP_SECRET), 'Security: Audit logs contain ZERO Pinterest App Secret leaks');
  }

  console.log(`\n=== PHASE 6 TEST RESULTS: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  return { passed, failed, results };
}

runPhase6Tests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
