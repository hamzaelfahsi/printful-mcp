import crypto from 'crypto';
import { AuditService } from './AuditService.js';
import { EtsyTokenService } from './EtsyTokenService.js';

export interface EtsyRawShop {
  shop_id: number;
  shop_name: string;
  user_id: number;
  title?: string;
  url: string;
  currency_code: string;
  is_vacation: boolean;
  listing_active_count: number;
  digital_listing_count: number;
  transaction_sold_count: number;
}

export interface EtsyRawListing {
  listing_id: number;
  user_id: number;
  shop_id: number;
  title: string;
  description: string;
  state: 'active' | 'inactive' | 'draft' | 'expired' | 'sold_out';
  creation_timestamp: number;
  created_timestamp: number;
  ending_timestamp: number;
  original_creation_timestamp: number;
  last_modified_timestamp: number;
  updated_timestamp: number;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  tags: string[];
  materials: string[];
  url: string;
  num_favorers?: number;
  views?: number;
  images?: Array<{
    listing_image_id: number;
    url_75x75: string;
    url_170x135: string;
    url_570xN: string;
    url_fullxfull: string;
  }>;
}

export interface EtsyRawReceipt {
  receipt_id: number;
  receipt_type: number;
  seller_user_id: number;
  buyer_user_id: number;
  name: string;
  first_line?: string;
  second_line?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: string;
  formatted_address: string;
  country_iso: string;
  payment_method: string;
  payment_email?: string;
  message_from_seller?: string;
  message_from_buyer?: string;
  was_paid: boolean;
  total_vat_cost: { amount: number; divisor: number; currency_code: string };
  total_price: { amount: number; divisor: number; currency_code: string };
  grandtotal: { amount: number; divisor: number; currency_code: string };
  created_timestamp: number;
  updated_timestamp: number;
  transactions?: Array<{
    transaction_id: number;
    title: string;
    description: string;
    seller_user_id: number;
    buyer_user_id: number;
    create_timestamp: number;
    created_timestamp: number;
    paid_timestamp: number;
    shipped_timestamp: number;
    quantity: number;
    listing_id: number;
    price: { amount: number; divisor: number; currency_code: string };
  }>;
}

export class EtsyService {
  private static instance: EtsyService;
  private tokenService: EtsyTokenService;
  private readonly baseUrl = 'https://api.etsy.com/v3/application';

  // Rate Limiting & Throttling
  // Default QPS: 10 req/sec; QPD: 10,000 req/day (configurable)
  private readonly minRequestIntervalMs = Number(process.env.ETSY_REQUEST_INTERVAL_MS) || 110;
  private readonly maxRetries = Number(process.env.ETSY_MAX_RETRIES) || 3;
  private lastRequestTime = 0;

  // Active session status
  private currentUserId = 'etsy_user_default';
  private shopData: EtsyRawShop | null = null;
  private isConnected = false;
  private lastSyncTimestamp: string | null = null;
  private syncStatus: 'IDLE' | 'SYNCING' | 'ERROR' | 'SUCCESS' = 'IDLE';
  private lastError: string | null = null;

  // PKCE store for pending auth requests
  private pkceStore: Map<string, { codeVerifier: string; createdAt: number }> = new Map();

  private constructor() {
    this.tokenService = EtsyTokenService.getInstance();
  }

  public static getInstance(): EtsyService {
    if (!EtsyService.instance) {
      EtsyService.instance = new EtsyService();
    }
    return EtsyService.instance;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      shop: this.shopData,
      lastSync: this.lastSyncTimestamp,
      syncStatus: this.syncStatus,
      lastError: this.lastError,
      tokenMeta: this.tokenService.getTokenMetadata(this.currentUserId)
    };
  }

  public async getConnectedShop(): Promise<EtsyRawShop | null> {
    if (this.isConnected && this.shopData) {
      return this.shopData;
    }
    const token = await this.tokenService.getValidAccessToken(this.currentUserId);
    if (!token && process.env.ETSY_CLIENT_ID) {
      return null;
    }
    try {
      const shop = await this.getShopByUserId(this.currentUserId);
      if (shop) {
        this.shopData = shop;
        this.isConnected = true;
      }
      return shop;
    } catch {
      return null;
    }
  }

  /**
   * Generates PKCE pair (code_verifier and code_challenge S256)
   */
  public generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge: hash };
  }

  /**
   * Generates OAuth Authorization URL with PKCE, State, and exact verified scopes:
   * shops_r, listings_r, listings_w, listings_d (required for DELETE), transactions_r, email_r
   */
  public getAuthStart(redirectUri: string): { url: string; state: string } {
    const clientId = process.env.ETSY_CLIENT_ID || 'demo_etsy_client_id';
    const state = crypto.randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // Store verifier for state validation (10 min TTL)
    this.pkceStore.set(state, { codeVerifier, createdAt: Date.now() });

    const scopes = ['shops_r', 'listings_r', 'listings_w', 'listings_d', 'transactions_r', 'email_r'].join('%20');
    const url = `https://www.etsy.com/oauth/connect?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scopes}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    return { url, state };
  }

  /**
   * Extracts and strictly validates numeric Etsy user_id from OAuth token response ({user_id}.{token})
   */
  public extractUserIdFromToken(tokenData: { user_id?: string | number; access_token?: string }): string {
    if (tokenData.user_id && /^\d+$/.test(String(tokenData.user_id))) {
      return String(tokenData.user_id);
    }
    if (typeof tokenData.access_token === 'string' && tokenData.access_token.includes('.')) {
      const candidateUserId = tokenData.access_token.split('.')[0];
      if (/^\d+$/.test(candidateUserId)) {
        return candidateUserId;
      }
    }
    throw new Error('Etsy OAuth exchange failed: Invalid access token format, missing numeric user ID.');
  }

  /**
   * Validates OAuth callback and exchanges code for tokens
   */
  public async handleOAuthCallback(code: string, state: string, redirectUri: string) {
    const pkce = this.pkceStore.get(state);
    if (!pkce) {
      await AuditService.log('ETSY_OAUTH_FAILED', 'oauth', 'etsy', 'Invalid or expired state parameter', 'error');
      throw new Error('Invalid or expired OAuth state parameter.');
    }
    this.pkceStore.delete(state);

    const clientId = process.env.ETSY_CLIENT_ID;
    if (!clientId) {
      // In development / demo environment without keys: simulate clean connection
      this.isConnected = true;
      this.shopData = {
        shop_id: 18492039,
        shop_name: 'CraftCasesStudio',
        user_id: 9283401,
        title: 'Artistic & Celestial Stained Glass Phone Cases',
        url: 'https://etsy.com/shop/CraftCasesStudio',
        currency_code: 'USD',
        is_vacation: false,
        listing_active_count: 24,
        digital_listing_count: 0,
        transaction_sold_count: 142
      };
      this.lastSyncTimestamp = new Date().toISOString();
      await AuditService.log('ETSY_CONNECTED', 'etsy_shop', '18492039', 'Connected via OAuth (Demo Sandbox)');
      return { success: true, shop: this.shopData };
    }

    // Exchange token at Etsy OAuth token endpoint
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: pkce.codeVerifier
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      await AuditService.log('ETSY_OAUTH_EXCHANGE_FAILED', 'oauth', 'etsy', `HTTP ${response.status}: ${errText}`, 'error');
      throw new Error(`Etsy OAuth exchange failed with status ${response.status}: ${errText}`);
    }

    const tokenData = await response.json();
    let userId: string;
    try {
      userId = this.extractUserIdFromToken(tokenData);
    } catch (extractErr: any) {
      await AuditService.log('ETSY_OAUTH_FAILED', 'oauth', 'etsy', extractErr.message, 'error');
      throw extractErr;
    }
    this.currentUserId = userId;

    await this.tokenService.saveTokens(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scopes: tokenData.scope ? tokenData.scope.split(' ') : ['shops_r', 'listings_r', 'listings_w', 'listings_d', 'transactions_r', 'email_r']
    });

    this.isConnected = true;
    const shop = await this.getShopByUserId(userId);
    this.shopData = shop;
    this.lastSyncTimestamp = new Date().toISOString();

    await AuditService.log('ETSY_CONNECTED', 'etsy_shop', String(shop.shop_id), `Connected shop ${shop.shop_name}`);
    return { success: true, shop };
  }

  public async disconnect(): Promise<void> {
    this.tokenService.clearToken(this.currentUserId);
    this.isConnected = false;
    this.shopData = null;
    this.lastSyncTimestamp = null;
    await AuditService.log('ETSY_DISCONNECTED', 'etsy_shop', this.currentUserId, 'Etsy store disconnected');
  }

  /**
   * Request throttling and retry with exponential backoff and retry-after header parsing
   */
  public async executeWithThrottle<T>(fn: () => Promise<Response>): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      // Throttle to respect Etsy rate limits
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minRequestIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minRequestIntervalMs - timeSinceLast));
      }
      this.lastRequestTime = Date.now();

      try {
        const response = await fn();

        // Check for 204 No Content (e.g. successful DELETE)
        if (response.status === 204) {
          return { success: true } as T;
        }

        if (response.ok) {
          return (await response.json()) as T;
        }

        // Handle Errors & 429 Rate Limit
        const status = response.status;
        const errText = await response.text();

        if (status === 429) {
          attempt++;
          const retryAfterHeader = response.headers.get('retry-after');
          let delayMs = 0;

          if (retryAfterHeader) {
            const seconds = parseInt(retryAfterHeader, 10);
            delayMs = !isNaN(seconds) ? seconds * 1000 : 2000;
          } else {
            // Exponential backoff + jitter (2s, 4s, 8s)
            delayMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          }

          await AuditService.log(
            'ETSY_RATE_LIMIT_429',
            'etsy_api',
            'rate_limit',
            `Received HTTP 429. Backing off for ${delayMs}ms (Attempt ${attempt}/${this.maxRetries})`,
            'warning'
          );

          if (attempt >= this.maxRetries) {
            throw new Error(`Etsy API Rate Limit (429) exceeded after ${this.maxRetries} attempts.`);
          }

          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (status >= 500) {
          attempt++;
          if (attempt >= this.maxRetries) {
            throw new Error(`Etsy API Server Error HTTP ${status}: ${errText}`);
          }
          const backoffMs = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        if (status === 401) {
          throw new Error(`Etsy API HTTP 401 Unauthorized: Invalid or expired token.`);
        }

        if (status === 403) {
          throw new Error(`Etsy API HTTP 403 Forbidden: Insufficient OAuth scope or permission denied.`);
        }

        if (status === 404) {
          throw new Error(`Etsy API HTTP 404 Not Found: Resource does not exist.`);
        }

        throw new Error(`Etsy API HTTP ${status}: ${errText}`);
      } catch (err: any) {
        if (err.message.includes('Rate Limit') || err.message.includes('401') || err.message.includes('403') || err.message.includes('404')) {
          throw err;
        }
        attempt++;
        if (attempt >= this.maxRetries) {
          await AuditService.log('ETSY_API_ERROR', 'etsy_api', 'request', `Attempt ${attempt} failed: ${err.message}`, 'error');
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    throw new Error('Max retries exceeded on Etsy API request.');
  }

  /**
   * Helper to format the x-api-key header according to Etsy Open API v3 (KEYSTRING:SHARED_SECRET)
   */
  public getApiKeyHeader(): string {
    const clientId = process.env.ETSY_CLIENT_ID;
    const clientSecret = process.env.ETSY_CLIENT_SECRET;
    if (!clientId) {
      throw new Error('ETSY_CLIENT_ID is not configured.');
    }
    return clientSecret ? `${clientId}:${clientSecret}` : clientId;
  }

  /**
   * Authenticated HTTP request to Etsy API v3
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiKeyHeader = this.getApiKeyHeader();

    const accessToken = await this.tokenService.getValidAccessToken(this.currentUserId);
    if (!accessToken) {
      throw new Error('No valid Etsy OAuth access token found. Please connect your store.');
    }

    const headers: Record<string, string> = {
      'x-api-key': apiKeyHeader,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    return this.executeWithThrottle<T>(() =>
      fetch(`${this.baseUrl}${endpoint}`, { ...options, headers })
    );
  }

  // === OFFICIAL ETSY API ENDPOINTS ===

  /**
   * GET /v3/application/users/{user_id}/shops
   */
  public async getShopByUserId(userId: string): Promise<EtsyRawShop> {
    if (!process.env.ETSY_CLIENT_ID) {
      return this.shopData || {
        shop_id: 18492039,
        shop_name: 'CraftCasesStudio',
        user_id: Number(userId) || 9283401,
        url: 'https://etsy.com/shop/CraftCasesStudio',
        currency_code: 'USD',
        is_vacation: false,
        listing_active_count: 24,
        digital_listing_count: 0,
        transaction_sold_count: 142
      };
    }
    return this.request<EtsyRawShop>(`/users/${userId}/shops`);
  }

  /**
   * GET /v3/application/shops/{shop_id}
   */
  public async getShop(shopId: number): Promise<EtsyRawShop> {
    return this.request<EtsyRawShop>(`/shops/${shopId}`);
  }

  /**
   * Generic paginated fetcher for Etsy listings with boundary and offset depth protection
   * GET /v3/application/shops/{shop_id}/listings?state=active&limit=100&offset=...
   */
  public async fetchAllPaginatedListings(
    shopId: number,
    state: 'active' | 'draft' | 'inactive' = 'active',
    batchSize = 100
  ): Promise<EtsyRawListing[]> {
    if (!process.env.ETSY_CLIENT_ID) {
      return [];
    }

    const maxBatchSize = Math.min(Math.max(batchSize, 1), 100); // Etsy allows max 100 per page
    const maxOffsetSafety = 50000; // Protection against runaway pagination loops
    let offset = 0;
    const allListings: EtsyRawListing[] = [];
    let hasMore = true;

    while (hasMore) {
      if (offset >= maxOffsetSafety) {
        await AuditService.log(
          'ETSY_PAGINATION_LIMIT_REACHED',
          'etsy_sync',
          String(shopId),
          `Reached max offset depth limit (${maxOffsetSafety}). Stopping pagination.`,
          'warning'
        );
        break;
      }

      const res = await this.request<{ count: number; results: EtsyRawListing[] }>(
        `/shops/${shopId}/listings?state=${state}&limit=${maxBatchSize}&offset=${offset}&includes=Images`
      );

      allListings.push(...res.results);
      offset += res.results.length;

      if (allListings.length >= res.count || res.results.length === 0) {
        hasMore = false;
      }
    }

    return allListings;
  }

  /**
   * GET /v3/application/listings/{listing_id}
   */
  public async getListing(listingId: number): Promise<EtsyRawListing> {
    return this.request<EtsyRawListing>(`/listings/${listingId}?includes=Images`);
  }

  /**
   * POST /v3/application/shops/{shop_id}/listings
   * Creates a draft listing strictly in 'draft' state.
   * NEVER creates or converts to 'active'.
   */
  public async createDraftListing(
    shopId: number,
    fields: {
      title: string;
      description: string;
      price: number;
      quantity: number;
      tags: string[];
      taxonomy_id?: number;
      who_made?: 'i_did' | 'someone_else' | 'collective';
      is_supply?: boolean;
      when_made?: string;
    }
  ): Promise<EtsyRawListing> {
    const listingId = Math.floor(1000000000 + Math.random() * 900000000);

    if (!process.env.ETSY_CLIENT_ID || process.env.CONTROLLED_PUBLICATION_TEST === 'true') {
      const draftListing: EtsyRawListing = {
        listing_id: listingId,
        user_id: 9283401,
        shop_id: shopId,
        title: fields.title,
        description: fields.description,
        state: 'draft', // Strictly DRAFT
        created_timestamp: Date.now(),
        creation_timestamp: Date.now(),
        ending_timestamp: Date.now() + 3600 * 24 * 120,
        original_creation_timestamp: Date.now(),
        last_modified_timestamp: Date.now(),
        updated_timestamp: Date.now(),
        price: { amount: Math.round(fields.price * 100), divisor: 100, currency_code: 'USD' },
        quantity: fields.quantity,
        tags: fields.tags,
        materials: [],
        url: `https://etsy.com/your/shops/${shopId}/tools/listings/state:draft/${listingId}`
      };

      await AuditService.log(
        'ETSY_DRAFT_CREATED',
        'etsy_listing',
        String(listingId),
        `Created controlled test draft listing: "${fields.title}" (Strict State: DRAFT)`
      );

      return draftListing;
    }

    const payload = {
      title: fields.title,
      description: fields.description,
      price: fields.price,
      quantity: fields.quantity,
      tags: fields.tags,
      taxonomy_id: fields.taxonomy_id || 1001,
      who_made: fields.who_made || 'i_did',
      is_supply: fields.is_supply || false,
      when_made: fields.when_made || '2020_2026',
      state: 'draft' // Strictly enforced as draft
    };

    const created = await this.request<EtsyRawListing>(`/shops/${shopId}/listings`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await AuditService.log(
      'ETSY_DRAFT_CREATED',
      'etsy_listing',
      String(created.listing_id),
      `Created live Etsy draft listing "${fields.title}" (State: ${created.state})`
    );

    return created;
  }

  /**
   * PATCH /v3/application/shops/{shop_id}/listings/{listing_id}
   * Requires scope: listings_w
   */
  public async updateListing(
    shopId: number,
    listingId: number,
    fields: {
      title?: string;
      description?: string;
      price?: number;
      quantity?: number;
      tags?: string[];
      state?: 'active' | 'inactive' | 'draft';
    }
  ): Promise<EtsyRawListing> {
    if (!process.env.ETSY_CLIENT_ID) {
      await AuditService.log('ETSY_LISTING_UPDATED', 'etsy_listing', String(listingId), JSON.stringify(fields));
      return {
        listing_id: listingId,
        user_id: 9283401,
        shop_id: shopId,
        title: fields.title || 'Updated Title',
        description: fields.description || 'Updated Description',
        state: fields.state || 'active',
        created_timestamp: Date.now(),
        creation_timestamp: Date.now(),
        ending_timestamp: Date.now(),
        original_creation_timestamp: Date.now(),
        last_modified_timestamp: Date.now(),
        updated_timestamp: Date.now(),
        price: { amount: (fields.price || 34.9) * 100, divisor: 100, currency_code: 'USD' },
        quantity: fields.quantity || 10,
        tags: fields.tags || [],
        materials: [],
        url: `https://etsy.com/listing/${listingId}`
      };
    }

    const payload: Record<string, any> = {};
    if (fields.title) payload.title = fields.title;
    if (fields.description) payload.description = fields.description;
    if (fields.price !== undefined) payload.price = fields.price;
    if (fields.quantity !== undefined) payload.quantity = fields.quantity;
    if (fields.tags) payload.tags = fields.tags;
    if (fields.state) payload.state = fields.state;

    const updated = await this.request<EtsyRawListing>(`/shops/${shopId}/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    await AuditService.log(
      'ETSY_LISTING_UPDATED',
      'etsy_listing',
      String(listingId),
      `Updated fields: ${Object.keys(fields).join(', ')}`
    );
    return updated;
  }

  /**
   * DELETE /v3/application/listings/{listing_id}
   * Official method to permanently delete a listing on Etsy.
   * REQUIRES SCOPE: listings_d (listings_w is NOT sufficient to delete!)
   */
  public async deleteListing(listingId: number): Promise<{ success: boolean }> {
    if (!process.env.ETSY_CLIENT_ID) {
      await AuditService.log('ETSY_LISTING_DELETED', 'etsy_listing', String(listingId), 'Deleted listing (Demo mode)');
      return { success: true };
    }

    // Explicit Scope Check
    const hasDeleteScope = this.tokenService.hasScope(this.currentUserId, 'listings_d');
    if (!hasDeleteScope) {
      const errMsg = 'INSUFFICIENT_SCOPE: The scope "listings_d" is strictly required to delete listings on Etsy.';
      await AuditService.log('ETSY_DELETE_FORBIDDEN', 'etsy_listing', String(listingId), errMsg, 'error');
      throw new Error(errMsg);
    }

    await this.request<{ success: boolean }>(`/listings/${listingId}`, {
      method: 'DELETE'
    });

    await AuditService.log('ETSY_LISTING_DELETED', 'etsy_listing', String(listingId), 'Permanently deleted listing on Etsy');
    return { success: true };
  }

  /**
   * GET /v3/application/shops/{shop_id}/receipts
   * Requires scope: transactions_r
   */
  public async getOrders(shopId: number, limit = 50, offset = 0): Promise<{ count: number; results: EtsyRawReceipt[] }> {
    if (!process.env.ETSY_CLIENT_ID) {
      return { count: 0, results: [] };
    }
    return this.request<{ count: number; results: EtsyRawReceipt[] }>(
      `/shops/${shopId}/receipts?limit=${limit}&offset=${offset}&includes=Transactions`
    );
  }
}
