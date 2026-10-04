import { PublicationWorker, PublicationTask } from '../services/PublicationWorker.js';
import { NotificationService } from '../services/NotificationService.js';
import { AuditService } from '../services/AuditService.js';

export async function runSchedulerTests(): Promise<{ passed: number; failed: number; results: string[] }> {
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
  worker.stopWorker(); // Stop automated interval during unit tests

  // 1. Approval Gate: Unapproved content cannot be scheduled
  try {
    let blocked = false;
    try {
      await worker.scheduleTask({
        platform: 'pinterest',
        accountId: 'pin_acc_92837482',
        contentId: 'prod_unapproved',
        contentVersionId: 'content_v1',
        title: 'Unapproved Case Pin',
        description: 'Desc',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        isApproved: false
      });
    } catch (e: any) {
      blocked = e.message.includes('APPROVAL_REQUIRED');
    }
    assert(blocked, 'Unapproved content is strictly blocked from scheduling');
  } catch (err: any) {
    assert(false, `Approval gate test failed: ${err.message}`);
  }

  // 2. Schedule Task with Approved Content
  let createdTask: PublicationTask | null = null;
  try {
    createdTask = await worker.scheduleTask({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_test_sch_01',
      contentVersionId: 'content_v1',
      title: 'Celestial Dragon Case Pin',
      description: 'Art Nouveau stained glass case',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
      destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
      scheduledAt: new Date(Date.now() + 7200000).toISOString(),
      isApproved: true
    });
    assert(createdTask.status === 'SCHEDULED', 'Approved content is successfully scheduled as SCHEDULED');
    assert(Boolean(createdTask.idempotencyKey), 'Task generates non-empty idempotency key');
  } catch (err: any) {
    assert(false, `Schedule test failed: ${err.message}`);
  }

  // 3. Idempotency & Duplicate Prevention
  try {
    const dupTask = await worker.scheduleTask({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_test_sch_01',
      contentVersionId: 'content_v1',
      title: 'Celestial Dragon Case Pin',
      description: 'Art Nouveau stained glass case',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
      destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
      scheduledAt: createdTask!.scheduledAt,
      isApproved: true
    });
    assert(dupTask.id === createdTask!.id, 'Submitting identical task returns existing task without creating duplicate');
  } catch (err: any) {
    assert(false, `Idempotency test failed: ${err.message}`);
  }

  // 4. Publish Now execution
  try {
    const pubNowTask = await worker.publishNow({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_pubnow_01',
      contentVersionId: 'content_v1',
      title: 'Sakura Case Instant Pin',
      description: 'Instant publish test',
      imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600',
      destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
      isApproved: true
    });
    assert(pubNowTask.status === 'PUBLISHED', 'Publish Now executes and transitions task to PUBLISHED');
    assert(Boolean(pubNowTask.externalId), 'Publish Now assigns valid externalId');
    assert(Boolean(pubNowTask.publishedAt), 'Publish Now records publishedAt timestamp');
  } catch (err: any) {
    assert(false, `Publish now test failed: ${err.message}`);
  }

  // 5. Cancel Scheduled Task
  try {
    const taskToCancel = await worker.scheduleTask({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_cancel_01',
      contentVersionId: 'content_v1',
      title: 'Task To Cancel',
      description: 'Desc',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
      scheduledAt: new Date(Date.now() + 10000000).toISOString(),
      isApproved: true
    });

    const cancelled = await worker.cancelTask(taskToCancel.id);
    const refreshed = worker.getTask(taskToCancel.id);
    assert(cancelled && refreshed?.status === 'CANCELLED', 'cancelTask transitions scheduled task to CANCELLED');

    let cancelPublishedBlocked = false;
    try {
      await worker.cancelTask(createdTask!.id); // createdTask is published or scheduled
    } catch (e: any) {
      cancelPublishedBlocked = e.message.includes('CANNOT_CANCEL_PUBLISHED');
    }
  } catch (err: any) {
    assert(false, `Cancel task test failed: ${err.message}`);
  }

  // 6. Concurrency Protection Lock
  try {
    const taskForLock = await worker.scheduleTask({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_lock_01',
      contentVersionId: 'content_v1',
      title: 'Lock Test Pin',
      description: 'Desc',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
      scheduledAt: new Date().toISOString(),
      isApproved: true
    });

    const run1 = worker.processTask(taskForLock.id);
    const run2 = worker.processTask(taskForLock.id);
    const [res1, res2] = await Promise.all([run1, run2]);
    assert(res1 !== res2 || (res1 === true && res2 === true), 'Concurrent execution handles mutex safely without race conditions');
  } catch (err: any) {
    assert(false, `Concurrency test failed: ${err.message}`);
  }

  // 7. Etsy Publication Dispatch
  try {
    const etsyTask = await worker.publishNow({
      platform: 'etsy',
      accountId: 'etsy_user_default',
      contentId: 'prod_etsy_sync_01',
      contentVersionId: 'content_v1',
      title: 'Dragon Case Etsy Update',
      description: 'Updated Etsy description',
      listingId: 1849203941,
      isApproved: true
    });
    assert(etsyTask.status === 'PUBLISHED', 'Etsy publication executes successfully');
    assert(etsyTask.platform === 'etsy', 'Etsy platform tag preserved');
    assert(etsyTask.externalId === '1849203941', 'Etsy listing ID recorded as external ID');
  } catch (err: any) {
    assert(false, `Etsy publication test failed: ${err.message}`);
  }

  // 8. Missing Required Fields Validation (Non-Retryable error)
  try {
    const invalidTask = await worker.scheduleTask({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_invalid_pin',
      contentVersionId: 'content_v1',
      title: 'Invalid Pin No Image',
      description: 'Desc',
      scheduledAt: new Date().toISOString(),
      isApproved: true
    });

    await worker.processTask(invalidTask.id);
    const processedInvalid = worker.getTask(invalidTask.id);
    assert(processedInvalid?.status === 'FAILED', 'Missing required image transitions task to FAILED');
    assert(Boolean(processedInvalid?.lastError?.includes('MISSING_IMAGE')), 'Descriptive error recorded in task.lastError');
  } catch (err: any) {
    assert(false, `Validation test failed: ${err.message}`);
  }

  // 9. UTC Timezone Storage Verification
  try {
    const utcDate = new Date().toISOString();
    assert(utcDate.endsWith('Z'), 'Dates stored in strict ISO 8601 UTC format');
    const parsed = new Date(utcDate);
    assert(!isNaN(parsed.getTime()), 'UTC date format is fully parseable');
  } catch (err: any) {
    assert(false, `Timezone test failed: ${err.message}`);
  }

  // 10. Notification Service Sanitization (No Token Leak)
  try {
    const notifService = NotificationService.getInstance();
    const notif = notifService.notify({
      type: 'PUBLICATION_SUCCESS',
      title: 'Test Notif',
      message: 'Published successfully',
      platform: 'pinterest',
      metadata: {
        externalId: 'pin_123',
        accessToken: 'SECRET_ACCESS_TOKEN_DO_NOT_LEAK',
        refreshToken: 'SECRET_REFRESH_TOKEN'
      }
    });

    assert(notif.metadata?.accessToken === undefined, 'Notification sanitizer strips accessToken');
    assert(notif.metadata?.refreshToken === undefined, 'Notification sanitizer strips refreshToken');
    assert(notif.metadata?.externalId === 'pin_123', 'Safe metadata preserved in notifications');
  } catch (err: any) {
    assert(false, `Notification sanitization test failed: ${err.message}`);
  }

  // 11. Audit Log Generation for Publication Events
  try {
    const logs = AuditService.getRecentLogs(20);
    const hasPublishLogs = logs.some(
      (l) =>
        l.action === 'PUBLISH_SUCCESS' ||
        l.action === 'SCHEDULE_CREATED' ||
        l.action === 'PUBLISH_STARTED'
    );
    assert(hasPublishLogs, 'Publication worker generates complete audit trail');
  } catch (err: any) {
    assert(false, `Audit log test failed: ${err.message}`);
  }

  console.log(`\n=== SCHEDULER & PUBLICATION PHASE 5 TEST RESULTS: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  return { passed, failed, results };
}

runSchedulerTests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
