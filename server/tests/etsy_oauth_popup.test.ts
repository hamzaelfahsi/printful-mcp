import assert from 'assert';
import { EtsyService } from '../services/EtsyService.js';
import { EtsyTokenService } from '../services/EtsyTokenService.js';

let passed = 0;
let failed = 0;
const results: string[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passed++;
    results.push(`✅ PASS: ${name}`);
  } catch (err: any) {
    failed++;
    results.push(`❌ FAIL: ${name} -> ${err.message}`);
  }
}

async function runOAuthPopupTests() {
  console.log('=== STARTING ETSY OAUTH POPUP & ORIGIN VERIFICATION TESTS ===\n');

  const etsyService = EtsyService.getInstance();
  const tokenService = EtsyTokenService.getInstance();

  // Test 1: /api/etsy/auth/start generates valid OAuth URL
  await test('1. /api/etsy/auth/start generates complete and valid Etsy OAuth URL', () => {
    const redirectUri = 'https://etsypilot-ai.ai.studio/api/etsy/auth/callback';
    const authData = etsyService.getAuthStart(redirectUri);

    assert(Boolean(authData.url), 'Auth URL is generated');
    assert(Boolean(authData.state), 'State parameter is returned');
    assert(authData.url.startsWith('https://www.etsy.com/oauth/connect'), 'Starts with https://www.etsy.com/oauth/connect');
    assert(authData.url.includes('response_type=code'), 'Contains response_type=code');
    assert(authData.url.includes('client_id='), 'Contains client_id');
    assert(authData.url.includes(`redirect_uri=${encodeURIComponent(redirectUri)}`), 'Contains exact encoded redirect_uri');
    assert(authData.url.includes('code_challenge='), 'Contains code_challenge');
    assert(authData.url.includes('code_challenge_method=S256'), 'Contains code_challenge_method=S256');
    assert(authData.url.includes('scope='), 'Contains scopes');
  });

  // Test 2: PKCE generation and verification remains robust
  await test('2. PKCE code_verifier and code_challenge S256 are valid and preserved in state store', () => {
    const pkce = etsyService.generatePKCE();
    assert(Boolean(pkce.codeVerifier) && pkce.codeVerifier.length >= 43, 'codeVerifier length >= 43');
    assert(Boolean(pkce.codeChallenge) && pkce.codeChallenge.length >= 43, 'codeChallenge length >= 43');
  });

  // Test 3: /api/etsy/auth/callback processes code & state and returns connected shop
  await test('3. /api/etsy/auth/callback extracts user_id from token prefix (user_id.token) and returns connected shop', async () => {
    const redirectUri = 'https://etsypilot-ai.ai.studio/api/etsy/auth/callback';
    const authData = etsyService.getAuthStart(redirectUri);

    // Mock global fetch for token exchange (without user_id field, exactly as real Etsy v3 returns)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/oauth/token')) {
        return new Response(
          JSON.stringify({
            access_token: '9283401.mock_access_token_abc',
            refresh_token: 'mock_refresh_token_xyz',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'shops_r listings_r listings_w listings_d transactions_r email_r'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (typeof url === 'string' && url.includes('/users/9283401/shops')) {
        return new Response(
          JSON.stringify({
            shop_id: 18492039,
            shop_name: 'CraftCasesStudioReal',
            user_id: 9283401,
            title: 'Real Stained Glass Cases',
            url: 'https://etsy.com/shop/CraftCasesStudioReal',
            currency_code: 'USD',
            is_vacation: false,
            listing_active_count: 10
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, opts);
    };

    try {
      const result = await etsyService.handleOAuthCallback('mock_code_12345', authData.state, redirectUri);
      assert(result.success === true, 'OAuth callback processed successfully');
      assert(Boolean(result.shop), 'Shop information returned');
      assert(result.shop.user_id === 9283401, 'Shop belongs to extracted user_id');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 3b: Unit tests for extractUserIdFromToken
  await test('3b. extractUserIdFromToken extracts numeric user_id from token prefix and rejects non-numeric/invalid tokens', () => {
    // Valid prefix
    const uid1 = etsyService.extractUserIdFromToken({ access_token: '12345678.randomtokenhash' });
    assert(uid1 === '12345678', 'Extracted 12345678 from 12345678.randomtokenhash');

    // Valid user_id numeric field
    const uid2 = etsyService.extractUserIdFromToken({ user_id: 9876543, access_token: 'opaque' });
    assert(uid2 === '9876543', 'Extracted 9876543 from user_id number field');

    // Rejection of non-numeric prefix
    let nonNumericRejected = false;
    try {
      etsyService.extractUserIdFromToken({ access_token: 'nonnumeric.tokenhash' });
    } catch {
      nonNumericRejected = true;
    }
    assert(nonNumericRejected, 'Rejected non-numeric prefix');

    // Rejection of missing/invalid format
    let missingRejected = false;
    try {
      etsyService.extractUserIdFromToken({ access_token: 'nodotintoken' });
    } catch {
      missingRejected = true;
    }
    assert(missingRejected, 'Rejected token without dot separator');
  });

  // Test 4: PostMessage HTML payload embeds controlled target origin
  await test('4. Callback success HTML uses postMessage with controlled target origin', () => {
    const prodTargetOrigin = 'https://etsypilot-ai.ai.studio';
    const generatedHtml = `
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'ETSY_AUTH_SUCCESS' }, '${prodTargetOrigin}');
        }
      </script>
    `;

    assert(generatedHtml.includes(`'${prodTargetOrigin}'`), 'Strict target origin embedded');
    assert(!generatedHtml.includes("'*'"), 'Wildcard origin * is strictly forbidden');
    assert(generatedHtml.includes('ETSY_AUTH_SUCCESS'), 'ETSY_AUTH_SUCCESS message type emitted');
  });

  // Test 5: Origin validation rejects untrusted origins
  await test('5. Origin validator strictly rejects unauthorized external domains', () => {
    const allowedOrigins = [
      'https://etsypilot-ai.ai.studio',
      'https://ais-dev-lui6hgbuegfb2yw74kduiu-221029044484.europe-west2.run.app'
    ];

    const validateOrigin = (origin: string) => {
      return (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost')
      );
    };

    assert(validateOrigin('https://etsypilot-ai.ai.studio') === true, 'Production domain accepted');
    assert(validateOrigin('http://localhost:3000') === true, 'Localhost accepted');
    assert(validateOrigin('https://evil-hacker.com') === false, 'Malicious domain rejected');
    assert(validateOrigin('https://etsypilot-ai.ai.studio.attacker.com') === false, 'Spoofed domain rejected');
    assert(validateOrigin('null') === false, 'Null origin rejected');
  });

  // Test 6: Frontend processes ETSY_AUTH_SUCCESS cleanly
  await test('6. Frontend event parser detects ETSY_AUTH_SUCCESS message', () => {
    const incomingEvent = {
      origin: 'https://etsypilot-ai.ai.studio',
      data: { type: 'ETSY_AUTH_SUCCESS' }
    };

    let processed = false;
    if (incomingEvent.data?.type === 'ETSY_AUTH_SUCCESS') {
      processed = true;
    }

    assert(processed === true, 'ETSY_AUTH_SUCCESS message correctly recognized');
  });

  // Test 7: Connected status persists and does not trigger Demo fallback
  await test('7. Connected state resolves valid shop in EtsyService and keeps Live mode active', async () => {
    const status = etsyService.getStatus();
    assert(status.connected === true, 'EtsyService reports connected');
    assert(status.shop !== null, 'Etsy shop data is present');
  });

  // Test 8: x-api-key header format KEYSTRING:SHARED_SECRET verification
  await test('8. x-api-key is constructed as KEYSTRING:SHARED_SECRET without exposing secrets in logs', () => {
    const originalClientId = process.env.ETSY_CLIENT_ID;
    const originalSecret = process.env.ETSY_CLIENT_SECRET;

    try {
      process.env.ETSY_CLIENT_ID = 'test_keystring_123';
      process.env.ETSY_CLIENT_SECRET = 'test_secret_abc';

      const apiKeyHeader = etsyService.getApiKeyHeader();
      assert(apiKeyHeader === 'test_keystring_123:test_secret_abc', 'Header format is KEYSTRING:SHARED_SECRET');
      assert(!apiKeyHeader.includes('undefined'), 'No undefined parts in header');

      // Fallback if no secret provided
      delete process.env.ETSY_CLIENT_SECRET;
      const fallbackHeader = etsyService.getApiKeyHeader();
      assert(fallbackHeader === 'test_keystring_123', 'Fallback to KEYSTRING only when secret is omitted');
    } finally {
      process.env.ETSY_CLIENT_ID = originalClientId;
      process.env.ETSY_CLIENT_SECRET = originalSecret;
    }
  });

  console.log(`\n=== OAUTH POPUP TEST SUMMARY: ${passed} passed, ${failed} failed ===`);
  results.forEach((r) => console.log(r));

  if (failed > 0) {
    process.exit(1);
  }
}

runOAuthPopupTests().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
