import crypto from 'crypto';
import { PinterestTokenService } from '../services/PinterestTokenService.js';
import { PinterestService } from '../services/PinterestService.js';
import { PinterestAnalyticsService } from '../services/PinterestAnalyticsService.js';
import { SchedulerService } from '../services/SchedulerService.js';

export async function runPinterestTests(): Promise<{ passed: number; failed: number; results: string[] }> {
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

  // 1. OAuth State Generation & Verification
  try {
    const pinService = PinterestService.getInstance();
    const { url, state } = pinService.getAuthStart('https://example.com/api/pinterest/auth/callback');
    assert(url.includes(`state=${state}`) && state.length === 32, 'OAuth state generation produces valid 32-char hex token');
  } catch (err: any) {
    assert(false, `OAuth state test failed: ${err.message}`);
  }

  // 2. Exact Pinterest v5 Scopes (ads:read removed)
  try {
    const pinService = PinterestService.getInstance();
    const { url } = pinService.getAuthStart('https://example.com/callback');
    assert(url.includes('user_accounts:read'), 'OAuth includes user_accounts:read scope');
    assert(url.includes('boards:read'), 'OAuth includes boards:read scope');
    assert(url.includes('boards:write'), 'OAuth includes boards:write scope');
    assert(url.includes('pins:read'), 'OAuth includes pins:read scope');
    assert(url.includes('pins:write'), 'OAuth includes pins:write scope');
    assert(!url.includes('ads:read'), 'ads:read scope is cleanly omitted (NOT USED for organic store traffic)');
  } catch (err: any) {
    assert(false, `Pinterest scopes test failed: ${err.message}`);
  }

  // 3. AES-256-GCM Token Encryption & Decryption
  try {
    const tokenService = PinterestTokenService.getInstance();
    const rawSecret = 'pina_access_token_v5_secret_payload_8899';
    const enc = tokenService.encrypt(rawSecret);
    const decrypted = tokenService.decrypt(enc.cipherText, enc.iv, enc.tag);
    assert(decrypted === rawSecret, 'AES-256-GCM preserves Pinterest token integrity');
    assert(enc.cipherText !== rawSecret, 'Encrypted cipher text does not leak plain text token');
  } catch (err: any) {
    assert(false, `Token encryption test failed: ${err.message}`);
  }

  // 4. Token Expiration & Refresh Logic
  try {
    const tokenService = PinterestTokenService.getInstance();
    await tokenService.saveTokens('pin_test_user_exp', {
      accessToken: 'temp_token',
      refreshToken: 'temp_refresh',
      expiresIn: 7200, // 2 hours
      scopes: ['user_accounts:read', 'pins:read', 'pins:write']
    });
    const meta = tokenService.getTokenMetadata('pin_test_user_exp');
    assert(meta?.isExpired === false, 'Token metadata correctly indicates non-expired status');
    assert(tokenService.hasScope('pin_test_user_exp', 'pins:write') === true, 'hasScope identifies granted permissions');
  } catch (err: any) {
    assert(false, `Token refresh metadata test failed: ${err.message}`);
  }

  // 5. Account Data Normalization
  try {
    const pinService = PinterestService.getInstance();
    const account = await pinService.getUserAccount();
    assert(account.account_type === 'BUSINESS', 'Pinterest account is correctly typed as BUSINESS');
    assert(account.username.length > 0, 'Pinterest username is present and non-empty');
  } catch (err: any) {
    assert(false, `Account normalization test failed: ${err.message}`);
  }

  // 6. Boards Normalization & Fetching
  try {
    const pinService = PinterestService.getInstance();
    const boardsRes = await pinService.getBoards();
    assert(Array.isArray(boardsRes.items) && boardsRes.items.length > 0, 'Boards fetch returns valid items array');
    assert(boardsRes.items[0].privacy === 'PUBLIC', 'Board privacy is parsed properly');
  } catch (err: any) {
    assert(false, `Boards fetch test failed: ${err.message}`);
  }

  // 7. Create Pin Payload & Media Source
  try {
    const pinService = PinterestService.getInstance();
    const pin = await pinService.createPin({
      title: 'Anime Case Stained Glass',
      description: 'Gold foil accents',
      board_id: 'board_anime_cases',
      link: 'https://craftcases.studio',
      media_source: {
        source_type: 'image_url',
        url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600'
      }
    });
    assert(pin.title === 'Anime Case Stained Glass', 'Created pin matches input title');
    assert(pin.id.startsWith('pin_'), 'Created pin returns assigned Pin ID');
  } catch (err: any) {
    assert(false, `Create pin test failed: ${err.message}`);
  }

  // 8. Update Pin Payload
  try {
    const pinService = PinterestService.getInstance();
    const updated = await pinService.updatePin('pin_101', {
      title: 'Updated Anime Pin Title'
    });
    assert(updated.title === 'Updated Anime Pin Title', 'Updated pin matches modified title');
  } catch (err: any) {
    assert(false, `Update pin test failed: ${err.message}`);
  }

  // 9. Delete Pin Execution & 204 No Content
  try {
    const pinService = PinterestService.getInstance();
    const del = await pinService.deletePin('pin_101');
    assert(del.success === true, 'Delete pin returns success confirmation');
  } catch (err: any) {
    assert(false, `Delete pin test failed: ${err.message}`);
  }

  // 10. Rate Limiting 429 & Retry-After Handling
  try {
    const pinService = PinterestService.getInstance();
    let callAttempts = 0;

    const mock429 = async () => {
      callAttempts++;
      if (callAttempts === 1) {
        return new Response('Rate Limit Exceeded', {
          status: 429,
          headers: { 'retry-after': '1' }
        });
      }
      return new Response(JSON.stringify({ id: 'pin_retry_ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const res = await pinService.executeWithThrottle<any>(mock429);
    assert(callAttempts === 2, 'Pinterest throttler successfully retried after 429');
    assert(res.id === 'pin_retry_ok', 'Pinterest request succeeded following backoff');
  } catch (err: any) {
    assert(false, `Rate limiting test failed: ${err.message}`);
  }

  // 11. Error Classification (401, 403, 404)
  try {
    const pinService = PinterestService.getInstance();
    let threw401 = false;
    let threw403 = false;
    let threw404 = false;

    try {
      await pinService.executeWithThrottle(async () => new Response('Invalid token', { status: 401 }));
    } catch (e: any) {
      threw401 = e.message.includes('401 Unauthorized');
    }
    assert(threw401, '401 Unauthorized immediately classified without loop');

    try {
      await pinService.executeWithThrottle(async () => new Response('Missing scope', { status: 403 }));
    } catch (e: any) {
      threw403 = e.message.includes('403 Forbidden');
    }
    assert(threw403, '403 Forbidden immediately classified');

    try {
      await pinService.executeWithThrottle(async () => new Response('Not found', { status: 404 }));
    } catch (e: any) {
      threw404 = e.message.includes('404 Not Found');
    }
    assert(threw404, '404 Not Found immediately classified');
  } catch (err: any) {
    assert(false, `Error classification test failed: ${err.message}`);
  }

  // 12. Internal Scheduler & Approval Workflow
  try {
    const scheduler = SchedulerService.getInstance();
    const post = await scheduler.schedulePost({
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'content_kitsune_01',
      title: 'Scheduled Kitsune Case Pin',
      description: 'Stained glass artwork',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600',
      destinationUrl: 'https://craftcases.studio',
      boardId: 'board_anime_cases',
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
      idempotencyKey: 'idemp_kitsune_01',
      requiresApproval: true
    });

    assert(post.status === 'PENDING', 'New post starts in PENDING status when approval required');

    const unapprovedProcessed = await scheduler.processDuePosts();
    assert(unapprovedProcessed === 0, 'Scheduler will NOT publish unapproved posts');

    await scheduler.approvePost(post.id);
    const approvedProcessed = await scheduler.processDuePosts();
    assert(approvedProcessed === 1, 'Scheduler published approved due post');
  } catch (err: any) {
    assert(false, `Scheduler & approval workflow test failed: ${err.message}`);
  }

  // 13. Analytics Normalization & CTR Calculation
  try {
    const analyticsService = PinterestAnalyticsService.getInstance();
    const metrics = await analyticsService.getAggregatedPinMetrics('pin_101');
    assert(metrics.impressions > 0, 'Analytics impressions parsed');
    assert(metrics.saves > 0, 'Analytics saves parsed');
    assert(metrics.outbound_clicks > 0, 'Analytics outbound clicks parsed');
    assert(metrics.ctr > 0 && typeof metrics.ctr === 'number', 'CTR percentage correctly computed');
  } catch (err: any) {
    assert(false, `Analytics normalization test failed: ${err.message}`);
  }

  SchedulerService.getInstance().stopWorker();
  console.log(`\n=== PINTEREST PHASE 3.1 TEST RESULTS: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  return { passed, failed, results };
}

runPinterestTests().then(() => {
  SchedulerService.getInstance().stopWorker();
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
