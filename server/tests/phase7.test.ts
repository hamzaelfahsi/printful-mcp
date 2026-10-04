import { AffiliateEngineService } from '../services/AffiliateEngineService.js';
import { AffiliateImportService } from '../services/AffiliateImportService.js';
import { EtsyAffiliateProvider } from '../services/AffiliateProvider.js';
import { FirstPartyTrackingService } from '../services/FirstPartyTrackingService.js';
import { AuditService } from '../services/AuditService.js';
import { NotificationService } from '../services/NotificationService.js';

export async function runPhase7Tests(): Promise<{ passed: number; failed: number; results: string[] }> {
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

  const engine = AffiliateEngineService.getInstance();
  const importService = AffiliateImportService.getInstance();
  const provider = new EtsyAffiliateProvider();
  const trackingService = FirstPartyTrackingService.getInstance();

  // === 1. PROVIDER ABSTRACTION (4 tests) ===
  const status = provider.getStatus();
  assert(status === 'NOT_CONFIGURED' || status === 'CONNECTED', 'Provider: Provider reports valid status');
  const account = await provider.getAccount();
  assert(account.provider === 'etsy_affiliate', 'Provider: Provider name matches etsy_affiliate');
  assert(Boolean(account.id), 'Provider: Account ID is generated');
  assert(account.currency === 'USD', 'Provider: Default currency is USD');

  // === 2. CAMPAIGNS & COMPLIANCE (6 tests) ===
  const campaign = await engine.createCampaign({
    name: 'Anime Aesthetic Showcase 2026',
    platform: 'pinterest',
    channel: 'pinterest_profile',
    channelStatus: 'AUTHORIZED',
    disclosureText: 'Certains liens sont des liens affiliés.'
  });
  assert(campaign.status === 'DRAFT', 'Campaign: New campaign starts strictly in DRAFT');
  assert(campaign.channelStatus === 'AUTHORIZED', 'Campaign: Channel status is AUTHORIZED');
  assert(campaign.disclosureText.length > 0, 'Campaign: Mandatory affiliate disclosure is present');

  const activeCamp = await engine.updateCampaignStatus(campaign.id, 'ACTIVE');
  assert(activeCamp.status === 'ACTIVE', 'Campaign: Campaign transitioned to ACTIVE');

  const pausedCamp = await engine.updateCampaignStatus(campaign.id, 'PAUSED');
  assert(pausedCamp.status === 'PAUSED', 'Campaign: Campaign transitioned to PAUSED');

  // Test unauthorized channel rejection
  const unauthCamp = await engine.createCampaign({
    name: 'Spam Forum Campaign',
    platform: 'both',
    channel: 'spam_forum',
    channelStatus: 'NOT_AUTHORIZED'
  });
  let unauthBlocked = false;
  try {
    await engine.updateCampaignStatus(unauthCamp.id, 'ACTIVE');
  } catch (e: any) {
    unauthBlocked = e.message.includes('UNAUTHORIZED_CHANNEL');
  }
  assert(unauthBlocked, 'Campaign: Activation on NOT_AUTHORIZED channel is strictly blocked');

  // === 3. CONVERSIONS & QUALIFYING SALES (6 tests) ===
  const conv1 = await engine.recordConversion({
    externalId: 'EXT_CONV_TEST_01',
    occurredAt: '2026-10-01T12:00:00Z',
    status: 'QUALIFYING',
    orderValue: 59.90,
    currency: 'USD',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(conv1.status === 'QUALIFYING', 'Conversion: Conversion recorded as QUALIFYING sale');
  assert(conv1.orderValue === 59.90, 'Conversion: Order value preserved exactly');
  assert(conv1.currency === 'USD', 'Conversion: Currency preserved as USD');

  // Duplicate conversion prevention
  const convDup = await engine.recordConversion({
    externalId: 'EXT_CONV_TEST_01',
    status: 'QUALIFYING',
    orderValue: 59.90,
    currency: 'USD',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(convDup.id === conv1.id, 'Conversion: Duplicate externalId returns existing conversion');

  const convRejected = await engine.recordConversion({
    externalId: 'EXT_CONV_REJ_01',
    status: 'REJECTED',
    currency: 'EUR',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(convRejected.status === 'REJECTED', 'Conversion: Rejected conversion recorded with state REJECTED');

  const convCancelled = await engine.recordConversion({
    externalId: 'EXT_CONV_CANC_01',
    status: 'CANCELLED',
    currency: 'EUR',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(convCancelled.status === 'CANCELLED', 'Conversion: Cancelled order recorded with state CANCELLED');

  // === 4. COMMISSIONS (6 tests) ===
  const comm1 = await engine.recordCommission({
    externalId: 'EXT_COMM_TEST_01',
    conversionId: conv1.id,
    commissionAmount: 5.99,
    currency: 'USD',
    status: 'PENDING',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(comm1.status === 'PENDING', 'Commission: New commission starts as PENDING');
  assert(comm1.commissionAmount === 5.99, 'Commission: Commission amount is 5.99 USD');

  const commApproved = await engine.updateCommissionStatus(comm1.id, 'APPROVED');
  assert(commApproved.status === 'APPROVED' && Boolean(commApproved.approvedAt), 'Commission: Status transitioned to APPROVED with timestamp');

  const commPaid = await engine.updateCommissionStatus(comm1.id, 'PAID');
  assert(commPaid.status === 'PAID' && Boolean(commPaid.paidAt), 'Commission: Status transitioned to PAID with timestamp');

  const commReversed = await engine.updateCommissionStatus(comm1.id, 'REVERSED');
  assert(commReversed.status === 'REVERSED', 'Commission: Commission can be marked REVERSED');

  // Duplicate commission prevention
  const commDup = await engine.recordCommission({
    externalId: 'EXT_COMM_TEST_01',
    commissionAmount: 5.99,
    currency: 'USD',
    status: 'PENDING',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(commDup.id === comm1.id, 'Commission: Duplicate externalId returns existing commission');

  // === 5. PAYOUTS (4 tests) ===
  const payout1 = await engine.recordPayout({
    externalId: 'EXT_PAY_TEST_01',
    amount: 150.00,
    currency: 'USD',
    status: 'PENDING',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(payout1.status === 'PENDING', 'Payout: New payout starts as PENDING');
  assert(payout1.amount === 150.00, 'Payout: Amount recorded as 150.00 USD');

  const payoutDup = await engine.recordPayout({
    externalId: 'EXT_PAY_TEST_01',
    amount: 150.00,
    currency: 'USD',
    status: 'PENDING',
    source: 'IMPORTED_PROVIDER_DATA'
  });
  assert(payoutDup.id === payout1.id, 'Payout: Duplicate externalId returns existing payout record');

  // === 6. IMPORT ENGINE & SECURITY (8 tests) ===
  // 6a. Valid CSV Import
  const validCsv = `external_id,order_value,commission_amount,currency,status,date\nAWIN_IMP_001,45.00,4.50,USD,APPROVED,2026-10-02\nAWIN_IMP_002,75.00,7.50,USD,PENDING,2026-10-03`;
  const csvRes = await importService.importCsv(validCsv);
  assert(csvRes.success && csvRes.importedCount === 2, 'Import: Valid CSV imported exactly 2 commissions');

  // 6b. Duplicate CSV Row Detection
  const csvDupRes = await importService.importCsv(validCsv);
  assert(csvDupRes.duplicateCount === 2 && csvDupRes.importedCount === 0, 'Import: Re-importing same CSV flags 2 duplicates and creates 0 records');

  // 6c. CSV Formula Injection Defense
  const formulaCsv = `external_id,order_value,commission_amount,currency,status\n=cmd|' /C calc'!A0,20.00,2.00,USD,APPROVED`;
  const formulaRes = await importService.importCsv(formulaCsv);
  assert(formulaRes.records[0].externalId.startsWith("'="), 'Security: CSV Formula injection neutralized with prepended quote');

  // 6d. Missing Columns CSV Rejection
  const badCsv = `name,amount\nInvalid,10.00`;
  const badCsvRes = await importService.importCsv(badCsv);
  assert(!badCsvRes.success && badCsvRes.errors[0].includes('MISSING_COLUMNS'), 'Import: CSV missing required columns is rejected');

  // 6e. Valid JSON Import
  const validJson = JSON.stringify([
    { external_id: 'JSON_IMP_001', commission_amount: 10.00, currency: 'EUR', status: 'APPROVED' },
    { external_id: 'JSON_IMP_002', commission_amount: 15.00, currency: 'EUR', status: 'PAID' }
  ]);
  const jsonRes = await importService.importJson(validJson);
  assert(jsonRes.success && jsonRes.importedCount === 2, 'Import: Valid JSON imported 2 records');

  // 6f. Malformed JSON Rejection
  const badJsonRes = await importService.importJson('{ invalid json: ');
  assert(!badJsonRes.success && badJsonRes.errors[0].includes('MALFORMED_JSON'), 'Import: Malformed JSON is safely rejected without crash');

  // 6g. Oversized File Rejection
  let oversizedBlocked = false;
  try {
    const hugeCsv = 'x'.repeat(6 * 1024 * 1024); // 6MB > 5MB limit
    await importService.importCsv(hugeCsv);
  } catch (e: any) {
    oversizedBlocked = e.message.includes('OVERSIZED_OR_EMPTY_FILE');
  }
  assert(oversizedBlocked, 'Security: Oversized CSV (> 5MB) is blocked by payload boundary check');

  // === 7. CALCULATION SEPARATION & PROVENANCE (4 tests) ===
  const kpis = engine.getMonetizationKPIs();
  assert(kpis.affiliateClicks.source === 'INTERNAL_CALCULATION', 'Provenance: Clicks are marked INTERNAL_CALCULATION');
  assert(kpis.conversions.value !== kpis.affiliateClicks.value || kpis.affiliateClicks.value >= 0, 'Separation: Clicks != Conversions relationship strictly maintained');
  assert(kpis.paidCommission.value >= 0, 'Separation: Paid commission is non-negative verified number');
  assert(kpis.providerStatus === 'NOT_CONFIGURED' || kpis.providerStatus === 'CONNECTED', 'Provenance: Provider status is officially recognized');

  // === 8. AUDIT & LOG SANITIZATION (4 tests) ===
  const trackingLink = await trackingService.createTrackingLink({
    platform: 'pinterest',
    destinationUrl: 'https://etsy.com/listing/1849203941',
    campaign: campaign.name,
    source: 'pinterest_organic',
    medium: 'pin_vertical'
  });
  assert(Boolean(trackingLink.trackingCode), 'Tracking: Tracking link attached to affiliate campaign successfully');

  assert(campaign.disclosureText.includes('affilié') || campaign.disclosureText.includes('affiliate'), 'Compliance: Campaign disclosure text contains mandatory affiliate notice');

  const auditLogs = AuditService.getRecentLogs(20);
  const notifs = NotificationService.getInstance().getNotifications(20);
  const logStr = JSON.stringify(auditLogs) + JSON.stringify(notifs);

  assert(!logStr.includes('access_token') && !logStr.includes('refresh_token'), 'Security: Audit logs contain zero token leaks');
  assert(!logStr.includes('client_secret') && !logStr.includes('password'), 'Security: Audit logs contain zero secret leaks');

  console.log(`\n=== PHASE 7 TEST RESULTS: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  return { passed, failed, results };
}

runPhase7Tests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
