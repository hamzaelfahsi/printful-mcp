import crypto from 'crypto';
import { AuditService } from './AuditService.js';
import { PinterestTokenService } from './PinterestTokenService.js';

export interface PinterestRawAccount {
  account_type: string;
  id: string;
  profile_image?: string;
  website_url?: string;
  username: string;
  business_name?: string;
  board_count?: number;
  pin_count?: number;
  follower_count?: number;
  monthly_views?: number;
}

export interface PinterestRawBoard {
  id: string;
  name: string;
  description?: string;
  owner?: { username: string };
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
  pin_count?: number;
  follower_count?: number;
  media?: { image_cover_url?: string };
  created_at?: string;
}

export interface PinterestRawPin {
  id: string;
  created_at: string;
  link?: string;
  title?: string;
  description?: string;
  dominant_color?: string;
  alt_text?: string;
  board_id: string;
  board_section_id?: string;
  board_owner?: { username: string };
  media?: {
    media_type: string;
    images?: {
      '150x150'?: { url: string; width: number; height: number };
      '400x300'?: { url: string; width: number; height: number };
      '600x'?: { url: string; width: number; height: number };
      '1200x'?: { url: string; width: number; height: number };
    };
  };
}

export interface PinterestPinAnalytics {
  pin_id: string;
  impressions: number;
  saves: number;
  outbound_clicks: number;
  pin_clicks: number;
  ctr: number;
}

export class PinterestService {
  private static instance: PinterestService;
  private tokenService: PinterestTokenService;
  private readonly baseUrl = 'https://api.pinterest.com/v5';

  // Throttling & Rate limits (Configurable for Trial vs Standard Production Access)
  private readonly minRequestIntervalMs = Number(process.env.PINTEREST_REQUEST_INTERVAL_MS) || 120;
  private readonly maxRetries = Number(process.env.PINTEREST_MAX_RETRIES) || 3;
  private lastRequestTime = 0;

  private currentUserId = 'pinterest_user_craftcases';
  private isConnected = false;
  private accountData: PinterestRawAccount | null = null;
  private lastSyncTimestamp: string | null = null;
  private stateStore: Map<string, { createdAt: number }> = new Map();

  private constructor() {
    this.tokenService = PinterestTokenService.getInstance();
  }

  public static getInstance(): PinterestService {
    if (!PinterestService.instance) {
      PinterestService.instance = new PinterestService();
    }
    return PinterestService.instance;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      account: this.accountData,
      lastSync: this.lastSyncTimestamp,
      tokenMeta: this.tokenService.getTokenMetadata(this.currentUserId)
    };
  }

  /**
   * Generates OAuth 2.0 Authorization URL for Pinterest Business
   * Cleaned Scopes (ads:read removed as no paid campaigns are managed):
   * user_accounts:read, boards:read, boards:write, pins:read, pins:write
   */
  public getAuthStart(redirectUri: string): { url: string; state: string } {
    const appId = process.env.PINTEREST_APP_ID || 'demo_pinterest_app_id';
    const state = crypto.randomBytes(16).toString('hex');
    this.stateStore.set(state, { createdAt: Date.now() });

    const scopes = ['user_accounts:read', 'boards:read', 'boards:write', 'pins:read', 'pins:write'].join(',');
    const url = `https://www.pinterest.com/oauth/?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scopes}&state=${state}`;

    return { url, state };
  }

  /**
   * Exchanges OAuth authorization code with Basic Auth at /v5/oauth/token
   */
  public async handleOAuthCallback(code: string, state: string, redirectUri: string) {
    const storedState = this.stateStore.get(state);
    if (!storedState) {
      await AuditService.log('PINTEREST_OAUTH_FAILED', 'oauth', 'pinterest', 'Invalid or expired OAuth state', 'error');
      throw new Error('Invalid or expired Pinterest OAuth state.');
    }
    this.stateStore.delete(state);

    const appId = process.env.PINTEREST_APP_ID;
    const appSecret = process.env.PINTEREST_APP_SECRET;

    if (!appId || !appSecret) {
      // Demo sandbox fallback when live API keys are not supplied
      this.isConnected = true;
      this.accountData = {
        id: 'pin_acc_92837482',
        username: 'craftcases_studio',
        business_name: 'Craft Cases Studio Official',
        account_type: 'BUSINESS',
        profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        website_url: 'https://craftcases.studio',
        board_count: 6,
        pin_count: 142,
        follower_count: 8420,
        monthly_views: 382000
      };
      this.lastSyncTimestamp = new Date().toISOString();
      await AuditService.log('PINTEREST_CONNECTED', 'pinterest_account', 'pin_acc_92837482', 'Connected via OAuth (Sandbox Demo)');
      return { success: true, account: this.accountData };
    }

    const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      await AuditService.log('PINTEREST_OAUTH_EXCHANGE_FAILED', 'oauth', 'pinterest', `HTTP ${response.status}: ${errText}`, 'error');
      throw new Error(`Pinterest OAuth exchange failed HTTP ${response.status}: ${errText}`);
    }

    const tokenData = await response.json();
    const userId = tokenData.user_id ? String(tokenData.user_id) : this.currentUserId;
    this.currentUserId = userId;

    await this.tokenService.saveTokens(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in || 2592000,
      scopes: tokenData.scope ? tokenData.scope.split(',') : ['user_accounts:read', 'boards:read', 'boards:write', 'pins:read', 'pins:write']
    });

    this.isConnected = true;
    const account = await this.getUserAccount();
    this.accountData = account;
    this.lastSyncTimestamp = new Date().toISOString();

    await AuditService.log('PINTEREST_CONNECTED', 'pinterest_account', account.id, `Connected Pinterest account @${account.username}`);
    return { success: true, account };
  }

  public async disconnect(): Promise<void> {
    this.tokenService.clearToken(this.currentUserId);
    this.isConnected = false;
    this.accountData = null;
    this.lastSyncTimestamp = null;
    await AuditService.log('PINTEREST_DISCONNECTED', 'pinterest_account', this.currentUserId, 'Pinterest account disconnected');
  }

  public async executeWithThrottle<T>(fn: () => Promise<Response>): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minRequestIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minRequestIntervalMs - timeSinceLast));
      }
      this.lastRequestTime = Date.now();

      try {
        const response = await fn();

        if (response.status === 204) {
          return { success: true } as T;
        }

        if (response.ok) {
          return (await response.json()) as T;
        }

        const status = response.status;
        const errText = await response.text();

        if (status === 429) {
          attempt++;
          const retryAfterHeader = response.headers.get('retry-after');
          let delayMs = 2000;
          if (retryAfterHeader) {
            const sec = parseInt(retryAfterHeader, 10);
            delayMs = !isNaN(sec) ? sec * 1000 : 2000;
          } else {
            delayMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          }

          await AuditService.log(
            'PINTEREST_RATE_LIMIT_429',
            'pinterest_api',
            'rate_limit',
            `Received HTTP 429. Backing off for ${delayMs}ms (Attempt ${attempt}/${this.maxRetries})`,
            'warning'
          );

          if (attempt >= this.maxRetries) {
            throw new Error(`Pinterest API Rate Limit 429 exceeded after ${this.maxRetries} attempts.`);
          }
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (status === 401) {
          throw new Error('Pinterest API HTTP 401 Unauthorized: Invalid or expired access token.');
        }

        if (status === 403) {
          throw new Error('Pinterest API HTTP 403 Forbidden: Insufficient scope or access denied.');
        }

        if (status === 404) {
          throw new Error('Pinterest API HTTP 404 Not Found: Board or Pin does not exist.');
        }

        if (status >= 500) {
          attempt++;
          if (attempt >= this.maxRetries) {
            throw new Error(`Pinterest API Server Error HTTP ${status}: ${errText}`);
          }
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        throw new Error(`Pinterest API HTTP ${status}: ${errText}`);
      } catch (err: any) {
        if (err.message.includes('Rate Limit') || err.message.includes('401') || err.message.includes('403') || err.message.includes('404')) {
          throw err;
        }
        attempt++;
        if (attempt >= this.maxRetries) {
          await AuditService.log('PINTEREST_API_ERROR', 'pinterest_api', 'request', `Attempt ${attempt} failed: ${err.message}`, 'error');
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    throw new Error('Max retries exceeded on Pinterest API request.');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await this.tokenService.getValidAccessToken(this.currentUserId);
    if (!accessToken && process.env.PINTEREST_APP_ID) {
      throw new Error('No valid Pinterest OAuth access token found. Please connect your account.');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken || 'demo_token'}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    return this.executeWithThrottle<T>(() =>
      fetch(`${this.baseUrl}${endpoint}`, { ...options, headers })
    );
  }

  // === OFFICIAL PINTEREST API v5 ENDPOINTS ===

  /**
   * GET /v5/user_account
   * Requires scope: user_accounts:read
   */
  public async getUserAccount(): Promise<PinterestRawAccount> {
    if (!process.env.PINTEREST_APP_ID) {
      return this.accountData || {
        id: 'pin_acc_92837482',
        username: 'craftcases_studio',
        business_name: 'Craft Cases Studio Official',
        account_type: 'BUSINESS',
        profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        website_url: 'https://craftcases.studio',
        board_count: 6,
        pin_count: 142,
        follower_count: 8420,
        monthly_views: 382000
      };
    }
    return this.request<PinterestRawAccount>('/user_account');
  }

  /**
   * GET /v5/boards
   * Requires scope: boards:read
   */
  public async getBoards(pageSize = 50, bookmark?: string): Promise<{ items: PinterestRawBoard[]; bookmark?: string }> {
    if (!process.env.PINTEREST_APP_ID) {
      return {
        items: [
          {
            id: 'board_anime_cases',
            name: 'Stained Glass Anime Phone Cases',
            description: 'Intricate celestial & anime aesthetic phone covers with gold foil details',
            privacy: 'PUBLIC',
            pin_count: 48,
            follower_count: 3200,
            media: { image_cover_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80' }
          },
          {
            id: 'board_celestial_dragons',
            name: 'Celestial Dragon & Mythic Art Cases',
            description: 'Japanese mythical creatures and stained glass cases for iPhone & Samsung',
            privacy: 'PUBLIC',
            pin_count: 34,
            follower_count: 2840,
            media: { image_cover_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80' }
          },
          {
            id: 'board_botanical_cases',
            name: 'Botanical & Flora Stained Glass Cases',
            description: 'Sakura, roses and enchanted floral protective cases',
            privacy: 'PUBLIC',
            pin_count: 28,
            follower_count: 1950,
            media: { image_cover_url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80' }
          }
        ]
      };
    }

    const query = new URLSearchParams({ page_size: String(Math.min(pageSize, 100)) });
    if (bookmark) query.set('bookmark', bookmark);
    return this.request<{ items: PinterestRawBoard[]; bookmark?: string }>(`/boards?${query.toString()}`);
  }

  /**
   * POST /v5/pins
   * Requires scope: pins:write
   */
  public async createPin(payload: {
    title: string;
    description: string;
    board_id: string;
    link: string;
    media_source: { source_type: 'image_url'; url: string };
    alt_text?: string;
  }): Promise<PinterestRawPin> {
    if (!process.env.PINTEREST_APP_ID) {
      const pinId = `pin_${Date.now()}`;
      await AuditService.log('PINTEREST_PIN_CREATED', 'pinterest_pin', pinId, `Created Pin "${payload.title}" (Sandbox Demo)`);
      return {
        id: pinId,
        created_at: new Date().toISOString(),
        title: payload.title,
        description: payload.description,
        link: payload.link,
        board_id: payload.board_id,
        alt_text: payload.alt_text,
        media: {
          media_type: 'image',
          images: {
            '600x': { url: payload.media_source.url, width: 600, height: 900 }
          }
        }
      };
    }

    const pin = await this.request<PinterestRawPin>('/pins', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await AuditService.log('PINTEREST_PIN_CREATED', 'pinterest_pin', pin.id, `Created live Pin "${payload.title}" on board ${payload.board_id}`);
    return pin;
  }

  /**
   * GET /v5/pins
   * Requires scope: pins:read
   */
  public async getPins(pageSize = 50, bookmark?: string): Promise<{ items: PinterestRawPin[]; bookmark?: string }> {
    if (!process.env.PINTEREST_APP_ID) {
      return {
        items: [
          {
            id: 'pin_89320149201',
            created_at: '2026-09-18T10:00:00Z',
            title: 'Celestial Dragon Stained Glass Case — Exclusive Artwork',
            description: 'Japanese mythical dragon phone cover with stained glass aesthetic',
            board_id: 'board_anime_cases',
            link: 'https://craftcases.studio'
          },
          {
            id: 'pin_89320149202',
            created_at: '2026-09-22T14:30:00Z',
            title: 'Mystic Kitsune Art Nouveau Glow Aesthetic Case',
            description: 'Kitsune deity stained glass anime case for iPhone',
            board_id: 'board_anime_cases',
            link: 'https://craftcases.studio'
          }
        ]
      };
    }

    const query = new URLSearchParams({ page_size: String(Math.min(pageSize, 250)) });
    if (bookmark) query.set('bookmark', bookmark);
    return this.request<{ items: PinterestRawPin[]; bookmark?: string }>(`/pins?${query.toString()}`);
  }

  /**
   * GET /v5/pins/{pin_id}
   * Requires scope: pins:read
   */
  public async getPin(pinId: string): Promise<PinterestRawPin> {
    return this.request<PinterestRawPin>(`/pins/${pinId}`);
  }

  /**
   * PATCH /v5/pins/{pin_id}
   * Requires scope: pins:write
   */
  public async updatePin(
    pinId: string,
    payload: { title?: string; description?: string; link?: string; alt_text?: string; board_id?: string }
  ): Promise<PinterestRawPin> {
    if (!process.env.PINTEREST_APP_ID) {
      await AuditService.log('PINTEREST_PIN_UPDATED', 'pinterest_pin', pinId, `Updated Pin fields: ${Object.keys(payload).join(', ')}`);
      return {
        id: pinId,
        created_at: new Date().toISOString(),
        title: payload.title || 'Updated Pin Title',
        description: payload.description || 'Updated Pin Description',
        link: payload.link || 'https://craftcases.studio',
        board_id: payload.board_id || 'board_anime_cases'
      };
    }

    const updated = await this.request<PinterestRawPin>(`/pins/${pinId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    await AuditService.log('PINTEREST_PIN_UPDATED', 'pinterest_pin', pinId, `Updated Pin fields: ${Object.keys(payload).join(', ')}`);
    return updated;
  }

  /**
   * DELETE /v5/pins/{pin_id}
   * Requires scope: pins:write
   * Returns HTTP 204 No Content
   */
  public async deletePin(pinId: string): Promise<{ success: boolean }> {
    if (!process.env.PINTEREST_APP_ID) {
      await AuditService.log('PINTEREST_PIN_DELETED', 'pinterest_pin', pinId, 'Deleted Pin (Sandbox Demo)');
      return { success: true };
    }

    await this.request<{ success: boolean }>(`/pins/${pinId}`, {
      method: 'DELETE'
    });

    await AuditService.log('PINTEREST_PIN_DELETED', 'pinterest_pin', pinId, 'Deleted Pin via Pinterest API v5');
    return { success: true };
  }

  /**
   * GET /v5/pins/{pin_id}/analytics
   * Requires scope: pins:read
   */
  public async getPinAnalytics(pinId: string, startDate?: string, endDate?: string): Promise<PinterestPinAnalytics> {
    if (!process.env.PINTEREST_APP_ID) {
      return {
        pin_id: pinId,
        impressions: 14850,
        saves: 840,
        outbound_clicks: 1220,
        pin_clicks: 2150,
        ctr: 8.21
      };
    }

    const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    const metrics = 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE';

    const data = await this.request<any>(
      `/pins/${pinId}/analytics?start_date=${start}&end_date=${end}&metric_types=${metrics}`
    );

    const imp = data?.all?.summary_metrics?.IMPRESSION || 0;
    const saves = data?.all?.summary_metrics?.SAVE || 0;
    const clicks = data?.all?.summary_metrics?.OUTBOUND_CLICK || 0;
    const pinClicks = data?.all?.summary_metrics?.PIN_CLICK || 0;
    const ctr = imp > 0 ? Number(((clicks / imp) * 100).toFixed(2)) : 0;

    return {
      pin_id: pinId,
      impressions: imp,
      saves,
      outbound_clicks: clicks,
      pin_clicks: pinClicks,
      ctr
    };
  }

  public async publishPin(data: {
    title: string;
    description: string;
    imageUrl: string;
    destinationUrl: string;
    boardId: string;
  }) {
    return this.createPin({
      title: data.title,
      description: data.description,
      link: data.destinationUrl,
      board_id: data.boardId,
      media_source: {
        source_type: 'image_url',
        url: data.imageUrl
      }
    });
  }
}
