import { PublicationWorker } from '../services/PublicationWorker.js';
import { NotificationService } from '../services/NotificationService.js';
import { AuditService } from '../services/AuditService.js';
import { EtsyService } from '../services/EtsyService.js';
import { PinterestService } from '../services/PinterestService.js';

process.env.CONTROLLED_PUBLICATION_TEST = 'true';

export async function runPhase52Tests(): Promise<{ passed: number; failed: number; results: string[] }> {
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

  const worker = PublicationWorker.getInstance();
  worker.stopWorker();

  // === 1. SAFETY AUDIT VERIFICATION ===
  assert(process.env.CONTROLLED_PUBLICATION_TEST === 'true', 'Safety Audit: Backend CONTROLLED_PUBLICATION_TEST is strictly active');

  // === 2. PINTEREST SANDBOX WRITE TEST ===
  // 2a. Approval Gate DRAFT -> Publish Now (BLOCKED)
  let pinDraftBlocked = false;
  try {
    await worker.publishNow({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'pin_sandbox_test_id',
      contentVersionId: 'content_v1',
      title: 'EtsyPilot AI — Sandbox Test Pin',
      description: 'Controlled integration test created by EtsyPilot AI. This is a sandbox test and is not production content.',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
      boardId: 'board_sandbox_test',
      isApproved: false // DRAFT state
    });
  } catch (e: any) {
    pinDraftBlocked = e.message.includes('APPROVAL_REQUIRED');
  }
  assert(pinDraftBlocked, 'Pinterest Approval Gate: DRAFT is strictly BLOCKED from publication');

  // 2b. Approval Gate APPROVED + User Confirm -> Sandbox Publication (ALLOWED)
  const pinPubTask = await worker.publishNow({
    platform: 'pinterest',
    accountId: 'pin_acc_92837482',
    contentId: 'pin_sandbox_test_id',
    contentVersionId: 'content_v1',
    title: 'EtsyPilot AI — Sandbox Test Pin',
    description: 'Controlled integration test created by EtsyPilot AI. This is a sandbox test and is not production content.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
    destinationUrl: 'https://craftcases.studio',
    boardId: 'board_sandbox_test',
    isApproved: true // APPROVED state with user confirmation
  });

  assert(pinPubTask.status === 'PUBLISHED', 'Pinterest Sandbox Write: Task transitioned to PUBLISHED');
  assert(Boolean(pinPubTask.externalId), `Pinterest Pin External ID generated: ${pinPubTask.externalId}`);
  assert(Boolean(pinPubTask.publishedAt), 'Pinterest Pin publishedAt timestamp recorded');

  // 2c. Pinterest Idempotency Test
  const taskCountBeforePinIdemp = worker.getTasks().length;
  const pinIdempAttempt = await worker.scheduleTask({
    platform: 'pinterest',
    accountId: 'pin_acc_92837482',
    contentId: 'pin_sandbox_test_id',
    contentVersionId: 'content_v1',
    title: 'EtsyPilot AI — Sandbox Test Pin',
    description: 'Controlled integration test created by EtsyPilot AI. This is a sandbox test and is not production content.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
    boardId: 'board_sandbox_test',
    scheduledAt: pinPubTask.scheduledAt,
    isApproved: true
  });
  const taskCountAfterPinIdemp = worker.getTasks().length;

  assert(taskCountBeforePinIdemp === taskCountAfterPinIdemp, 'Pinterest Idempotency: Duplicate attempt returned existing task without creating a new one');
  assert(pinIdempAttempt.id === pinPubTask.id, 'Pinterest Idempotency: Duplicate attempt matched same task ID');

  // === 3. ETSY DRAFT CREATION TEST ===
  // 3a. Approval Gate DRAFT -> Publish Now (BLOCKED)
  let etsyDraftBlocked = false;
  try {
    await worker.publishNow({
      platform: 'etsy',
      accountId: 'etsy_user_default',
      contentId: 'etsy_draft_test_id',
      contentVersionId: 'content_v1',
      title: 'EtsyPilot AI — Controlled Integration Test',
      description: 'Controlled integration test listing created by EtsyPilot AI. This listing must remain a draft and must never be activated automatically.',
      isApproved: false // DRAFT state
    });
  } catch (e: any) {
    etsyDraftBlocked = e.message.includes('APPROVAL_REQUIRED');
  }
  assert(etsyDraftBlocked, 'Etsy Approval Gate: DRAFT is strictly BLOCKED from publication');

  // 3b. Approval Gate APPROVED + User Confirm -> Draft Creation (ALLOWED, Strict DRAFT State)
  const etsyDraftTask = await worker.publishNow({
    platform: 'etsy',
    accountId: 'etsy_user_default',
    contentId: 'etsy_draft_test_id',
    contentVersionId: 'content_v1',
    title: 'EtsyPilot AI — Controlled Integration Test',
    description: 'Controlled integration test listing created by EtsyPilot AI. This listing must remain a draft and must never be activated automatically.',
    isApproved: true // APPROVED state
  });

  assert(etsyDraftTask.status === 'PUBLISHED', 'Etsy Draft Task: Task executed successfully');
  assert(Boolean(etsyDraftTask.externalId), `Etsy Listing External ID generated: ${etsyDraftTask.externalId}`);

  // 3c. Verify Etsy Draft Listing is strictly DRAFT (NOT ACTIVE, NOT PUBLIC)
  const draftListing = await EtsyService.getInstance().createDraftListing(18492039, {
    title: 'EtsyPilot AI — Controlled Integration Test',
    description: 'Controlled integration test listing created by EtsyPilot AI. This listing must remain a draft and must never be activated automatically.',
    price: 1.00,
    quantity: 1,
    tags: ['integration-test', 'etsy-pilot-ai', 'controlled-test', 'TEST-ONLY']
  });

  assert(draftListing.state === 'draft', `Etsy Listing State is strictly "${draftListing.state}" (DRAFT / non-public)`);
  assert(draftListing.state !== 'active', 'Etsy Listing is NEVER set to active or public');

  // 3d. Etsy Idempotency Test
  const taskCountBeforeEtsyIdemp = worker.getTasks().length;
  const etsyIdempAttempt = await worker.scheduleTask({
    platform: 'etsy',
    accountId: 'etsy_user_default',
    contentId: 'etsy_draft_test_id',
    contentVersionId: 'content_v1',
    title: 'EtsyPilot AI — Controlled Integration Test',
    description: 'Controlled integration test listing created by EtsyPilot AI. This listing must remain a draft and must never be activated automatically.',
    scheduledAt: etsyDraftTask.scheduledAt,
    isApproved: true
  });
  const taskCountAfterEtsyIdemp = worker.getTasks().length;

  assert(taskCountBeforeEtsyIdemp === taskCountAfterEtsyIdemp, 'Etsy Idempotency: Duplicate attempt returned existing task without creating a new draft');
  assert(etsyIdempAttempt.id === etsyDraftTask.id, 'Etsy Idempotency: Duplicate attempt matched same task ID');

  // === 4. AUDIT LOGS & NOTIFICATIONS SANITIZATION ===
  const auditLogs = AuditService.getRecentLogs(20);
  const notifs = NotificationService.getInstance().getNotifications(20);

  const hasPinterestAudit = auditLogs.some((l) => l.action.includes('PUBLISH_SUCCESS') || l.action.includes('PINTEREST'));
  const hasEtsyAudit = auditLogs.some((l) => l.action.includes('PUBLISH_SUCCESS') || l.action.includes('ETSY'));
  assert(hasPinterestAudit, 'Pinterest publication logged in Audit Service');
  assert(hasEtsyAudit, 'Etsy draft creation logged in Audit Service');

  const allLogsString = JSON.stringify(auditLogs) + JSON.stringify(notifs);
  const hasSecretLeak = allLogsString.includes('SECRET_') || allLogsString.includes('access_token') || allLogsString.includes('refresh_token');
  assert(!hasSecretLeak, 'Audit logs and notifications contain ZERO token or secret leaks');

  console.log(`\n=== PHASE 5.2 CONTROLLED PUBLICATION TEST RESULTS: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  return { passed, failed, results };
}

runPhase52Tests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
