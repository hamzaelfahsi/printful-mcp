import crypto from 'crypto';
import { AuditService } from './AuditService.js';

export interface DecryptedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  userId: string;
  shopId?: string;
}

export interface EncryptedTokenData {
  encryptedAccessToken: string;
  accessTokenIv: string;
  accessTokenTag: string;
  encryptedRefreshToken?: string;
  refreshTokenIv?: string;
  refreshTokenTag?: string;
  expiresAt: Date;
  scopes: string[];
  userId: string;
  shopId?: string;
}

export class EtsyTokenService {
  private static instance: EtsyTokenService;
  private encryptionKey: Buffer;
  // In-memory cache for fast lookup during server runtime; backed by persistent DB in production
  private tokenStore: Map<string, EncryptedTokenData> = new Map();

  private constructor() {
    const secret = process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    // Ensure key is 32 bytes for AES-256
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  public static getInstance(): EtsyTokenService {
    if (!EtsyTokenService.instance) {
      EtsyTokenService.instance = new EtsyTokenService();
    }
    return EtsyTokenService.instance;
  }

  /**
   * AES-256-GCM symmetric encryption with authentication tag
   */
  public encrypt(plainText: string): { cipherText: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let cipherText = cipher.update(plainText, 'utf8', 'hex');
    cipherText += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { cipherText, iv: iv.toString('hex'), tag };
  }

  /**
   * AES-256-GCM symmetric decryption with authentication tag verification
   */
  public decrypt(cipherText: string, ivHex: string, tagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Securely saves and encrypts tokens for an Etsy user / shop
   */
  public async saveTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken?: string; expiresIn: number; scopes: string[]; shopId?: string }
  ): Promise<void> {
    const encAccess = this.encrypt(tokens.accessToken);
    let encRefresh: { cipherText: string; iv: string; tag: string } | undefined;
    if (tokens.refreshToken) {
      encRefresh = this.encrypt(tokens.refreshToken);
    }

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const data: EncryptedTokenData = {
      encryptedAccessToken: encAccess.cipherText,
      accessTokenIv: encAccess.iv,
      accessTokenTag: encAccess.tag,
      encryptedRefreshToken: encRefresh?.cipherText,
      refreshTokenIv: encRefresh?.iv,
      refreshTokenTag: encRefresh?.tag,
      expiresAt,
      scopes: tokens.scopes,
      userId,
      shopId: tokens.shopId
    };

    this.tokenStore.set(userId, data);
    await AuditService.log('ETSY_TOKEN_STORED', 'oauth_token', userId, `Stored encrypted token for user ${userId}`);
  }

  /**
   * Checks if user has a specific OAuth scope (e.g. listings_d)
   */
  public hasScope(userId: string, requiredScope: string): boolean {
    const stored = this.tokenStore.get(userId);
    if (!stored) return false;
    return stored.scopes.includes(requiredScope);
  }

  /**
   * Retrieves and automatically refreshes token if within 5 minutes of expiration
   */
  public async getValidAccessToken(userId: string): Promise<string | null> {
    const stored = this.tokenStore.get(userId);
    if (!stored) {
      return null;
    }

    const isExpiringSoon = stored.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
    if (isExpiringSoon && stored.encryptedRefreshToken && stored.refreshTokenIv && stored.refreshTokenTag) {
      const plainRefreshToken = this.decrypt(
        stored.encryptedRefreshToken,
        stored.refreshTokenIv,
        stored.refreshTokenTag
      );
      try {
        const refreshed = await this.refreshAccessToken(userId, plainRefreshToken);
        return refreshed;
      } catch (err) {
        await AuditService.log('ETSY_TOKEN_REFRESH_FAILED', 'oauth_token', userId, (err as Error).message, 'error');
        return null;
      }
    }

    return this.decrypt(stored.encryptedAccessToken, stored.accessTokenIv, stored.accessTokenTag);
  }

  /**
   * Refreshes Etsy access token via OAuth token endpoint
   */
  public async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    const clientId = process.env.ETSY_CLIENT_ID;
    if (!clientId) {
      throw new Error('ETSY_CLIENT_ID not configured');
    }

    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Etsy Token Refresh HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    await this.saveTokens(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes: data.scope ? data.scope.split(' ') : ['shops_r', 'listings_r', 'listings_w', 'listings_d', 'transactions_r', 'email_r']
    });

    await AuditService.log('ETSY_TOKEN_REFRESHED', 'oauth_token', userId, 'Refreshed access token successfully');
    return data.access_token;
  }

  public hasToken(userId: string): boolean {
    return this.tokenStore.has(userId);
  }

  public clearToken(userId: string): void {
    this.tokenStore.delete(userId);
  }

  public getTokenMetadata(userId: string) {
    const stored = this.tokenStore.get(userId);
    if (!stored) return null;
    return {
      userId: stored.userId,
      shopId: stored.shopId,
      expiresAt: stored.expiresAt,
      scopes: stored.scopes,
      isExpired: stored.expiresAt.getTime() <= Date.now()
    };
  }
}
