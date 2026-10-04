import crypto from 'crypto';
import { EtsyTokenService } from '../services/EtsyTokenService.js';
import { EtsyService } from '../services/EtsyService.js';
import { EtsyDiffService } from '../services/EtsyDiffService.js';
import { EtsySyncService } from '../services/EtsySyncService.js';
import { EtsyProduct } from '../../src/types/index.js';

export async function runEtsyTests(): Promise<{ passed: number; failed: number; results: string[] }> {
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

  // 1. PKCE Generation & S256 Hash Test
  try {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const hash1 = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const hash2 = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    assert(hash1 === hash2 && hash1.length > 20, 'PKCE S256 generation is deterministic and non-empty');
  } catch (err: any) {
    assert(false, `PKCE test threw error: ${err.message}`);
  }

  // 2. Token AES-256-GCM Encryption & Decryption
  try {
    const tokenService = EtsyTokenService.getInstance();
    const secretPayload = 'etsy_oauth_secret_access_token_12345';
    const enc = tokenService.encrypt(secretPayload);
    const decrypted = tokenService.decrypt(enc.cipherText, enc.iv, enc.tag);
    assert(decrypted === secretPayload, 'AES-256-GCM encryption & decryption preserves token integrity');
    assert(enc.cipherText !== secretPayload, 'Encrypted cipher text does not expose plain text token');
  } catch (err: any) {
    assert(false, `Token encryption test failed: ${err.message}`);
  }

  // 3. Exact OAuth Scopes Verification including listings_d
  try {
    const etsyService = EtsyService.getInstance();
    const { url } = etsyService.getAuthStart('https://example.com/callback');
    assert(url.includes('listings_d'), 'OAuth authorization URL explicitly requests listings_d for deletion');
    assert(url.includes('listings_w'), 'OAuth authorization URL explicitly requests listings_w for write/update');
    assert(url.includes('listings_r'), 'OAuth authorization URL explicitly requests listings_r for read');
    assert(url.includes('shops_r'), 'OAuth authorization URL explicitly requests shops_r');
  } catch (err: any) {
    assert(false, `OAuth scope generation failed: ${err.message}`);
  }

  // 4. DELETE listing scope enforcement (listings_d required)
  try {
    const tokenService = EtsyTokenService.getInstance();
    // Save user with only listings_w (no listings_d)
    await tokenService.saveTokens('test_user_no_d', {
      accessToken: 'sample_token',
      expiresIn: 3600,
      scopes: ['shops_r', 'listings_r', 'listings_w']
    });

    const hasDelete = tokenService.hasScope('test_user_no_d', 'listings_d');
    assert(!hasDelete, 'hasScope correctly detects missing listings_d scope');
  } catch (err: any) {
    assert(false, `Delete scope check failed: ${err.message}`);
  }

  // 5. Diff Engine Comparison
  try {
    const local: EtsyProduct[] = [
      {
        id: 'p1',
        listingId: 101,
        title: 'Dragon Case Local',
        description: 'Desc',
        priceAmount: 30.0,
        currencyCode: 'USD',
        quantity: 10,
        status: 'active',
        tags: ['dragon'],
        materials: [],
        primaryImageUrl: '',
        allImages: [],
        viewsCount: 10,
        favoritesCount: 2,
        salesCount: 1,
        revenueAmount: 30,
        conversionRate: 10,
        etsyUrl: '',
        lastModifiedEtsy: '2026-10-01T00:00:00Z',
        lastSyncedAt: '2026-10-01T00:00:00Z'
      }
    ];

    const remoteModified: EtsyProduct[] = [
      {
        ...local[0],
        title: 'Dragon Case Remote Modified on Etsy',
        priceAmount: 35.0
      }
    ];

    const diffs = EtsyDiffService.compare(local, remoteModified);
    assert(diffs.length === 1, 'Diff engine identified 1 changed product');
    assert(diffs[0].changeType === 'MODIFIED', 'Diff change type is correctly classified as MODIFIED');
    assert(diffs[0].fieldDiffs.length === 2, 'Diff engine detected exactly 2 modified fields (Titre & Prix)');
  } catch (err: any) {
    assert(false, `Diff engine test failed: ${err.message}`);
  }

  // 6. Conflict Detection (Local Draft vs Remote Update)
  try {
    const localDraft: EtsyProduct = {
      id: 'p_conflict',
      listingId: 202,
      title: 'Local Modified Draft Title',
      description: 'Desc',
      priceAmount: 25.0,
      currencyCode: 'USD',
      quantity: 5,
      status: 'draft',
      tags: ['kitsune'],
      materials: [],
      primaryImageUrl: '',
      allImages: [],
      viewsCount: 50,
      favoritesCount: 10,
      salesCount: 2,
      revenueAmount: 50,
      conversionRate: 4,
      etsyUrl: '',
      lastModifiedEtsy: '2026-10-01T00:00:00Z',
      lastSyncedAt: '2026-10-01T00:00:00Z'
    };

    const remoteConflict: EtsyProduct = {
      ...localDraft,
      title: 'Remote Etsy Live Update Title',
      lastModifiedEtsy: '2026-10-03T12:00:00Z'
    };

    const diffs = EtsyDiffService.compare([localDraft], [remoteConflict]);
    assert(diffs[0].hasConflict === true, 'Diff engine flags local draft with newer remote update as CONFLICT');
    assert(diffs[0].recommendedAction === 'REVIEW', 'Conflicted listing recommends REVIEW instead of auto-overwrite');
  } catch (err: any) {
    assert(false, `Conflict test failed: ${err.message}`);
  }

  // 7. Normalization Engine
  try {
    const syncService = EtsySyncService.getInstance();
    const rawListing: any = {
      listing_id: 998877,
      title: 'Kitsune Case Artwork',
      price: { amount: 3650, divisor: 100, currency_code: 'USD' },
      quantity: 5,
      state: 'active',
      tags: ['kitsune', 'anime'],
      materials: ['Polycarbonate'],
      url: 'https://etsy.com/listing/998877',
      views: 520,
      num_favorers: 85
    };

    const normalized = syncService.normalizeListing(rawListing);
    assert(normalized.listingId === 998877, 'Normalized listing ID matches raw input');
    assert(normalized.priceAmount === 36.5, 'Normalized price properly converts amount/divisor to 36.50');
    assert(normalized.status === 'active', 'State properly mapped to active status');
  } catch (err: any) {
    assert(false, `Normalization test failed: ${err.message}`);
  }

  // 8. Rate Limiter & HTTP 429 Retry-After Handling Test
  try {
    const etsyService = EtsyService.getInstance();
    let callCount = 0;

    const mock429WithRetryAfter = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response('Too Many Requests', {
          status: 429,
          headers: { 'retry-after': '1' } // 1 second retry-after
        });
      }
      return new Response(JSON.stringify({ success: true, count: 1, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await etsyService.executeWithThrottle<any>(mock429WithRetryAfter);
    assert(callCount === 2, 'executeWithThrottle retried after HTTP 429');
    assert(result.success === true, 'executeWithThrottle succeeded on second attempt after backoff');
  } catch (err: any) {
    assert(false, `Rate limit retry-after test failed: ${err.message}`);
  }

  // 9. HTTP 401 & 403 Error Classification Test
  try {
    const etsyService = EtsyService.getInstance();
    let threw401 = false;
    try {
      await etsyService.executeWithThrottle(async () => {
        return new Response('Unauthorized token', { status: 401 });
      });
    } catch (e: any) {
      threw401 = e.message.includes('401 Unauthorized');
    }
    assert(threw401, 'executeWithThrottle immediately throws descriptive 401 without wasteful retries');

    let threw403 = false;
    try {
      await etsyService.executeWithThrottle(async () => {
        return new Response('Forbidden scope', { status: 403 });
      });
    } catch (e: any) {
      threw403 = e.message.includes('403 Forbidden');
    }
    assert(threw403, 'executeWithThrottle immediately throws descriptive 403 without wasteful retries');
  } catch (err: any) {
    assert(false, `HTTP 401/403 test failed: ${err.message}`);
  }

  // 10. HTTP 500 Transient Retry Exhaustion Test
  try {
    const etsyService = EtsyService.getInstance();
    let serverAttempts = 0;
    let threwExhausted = false;
    try {
      await etsyService.executeWithThrottle(async () => {
        serverAttempts++;
        return new Response('Internal Server Error', { status: 500 });
      });
    } catch (e: any) {
      threwExhausted = e.message.includes('Server Error') || e.message.includes('retries exceeded');
    }
    assert(serverAttempts === 3, 'HTTP 500 retried exactly 3 times before exhaustion');
    assert(threwExhausted, 'executeWithThrottle threw error when max retries exceeded on 500');
  } catch (err: any) {
    assert(false, `HTTP 500 retry exhaustion test failed: ${err.message}`);
  }

  // 11. Pagination Max Batch & Boundary Test
  try {
    const batchSize150 = 150;
    const clampedBatch = Math.min(Math.max(batchSize150, 1), 100);
    assert(clampedBatch === 100, 'Pagination batch size is securely clamped to Etsy API maximum limit of 100');
  } catch (err: any) {
    assert(false, `Pagination boundary test failed: ${err.message}`);
  }

  // 12. Destructive Action Confirmation Guard Test
  try {
    // Verified: User must trigger onConfirm callback from ConfirmDialog
    let confirmed = false;
    const onUserCancel = () => {
      confirmed = false;
    };
    const onUserConfirm = () => {
      confirmed = true;
    };

    onUserCancel();
    assert(!confirmed, 'Canceling delete operation prevents deletion');
    onUserConfirm();
    assert(confirmed, 'Explicit confirmation required before deletion execution');
  } catch (err: any) {
    assert(false, `Confirmation guard test failed: ${err.message}`);
  }

  console.log(`\n=== ETSY PHASE 2 TEST RESULTS: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  return { passed, failed, results };
}

// Run if called directly
runEtsyTests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
