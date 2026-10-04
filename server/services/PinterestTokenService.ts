import crypto from 'crypto';
import { AuditService } from './AuditService.js';

export interface EncryptedPinterestTokenData {
  encryptedAccessToken: string;
  accessTokenIv: string;
  accessTokenTag: string;
  encryptedRefreshToken?: string;
  refreshTokenIv?: string;
  refreshTokenTag?: string;
  expiresAt: Date;
  scopes: string[];
  userId: string;
  username?: string;
}

export class PinterestTokenService {
  private static instance: PinterestTokenService;
  private encryptionKey: Buffer;
  private tokenStore: Map<string, EncryptedPinterestTokenData> = new Map();

  private constructor() {
    const secret = process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  public static getInstance(): PinterestTokenService {
    if (!PinterestTokenService.instance) {
      PinterestTokenService.instance = new PinterestTokenService();
    }
    return PinterestTokenService.instance;
  }

  public encrypt(plainText: string): { cipherText: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let cipherText = cipher.update(plainText, 'utf8', 'hex');
    cipherText += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { cipherText, iv: iv.toString('hex'), tag };
  }

  public decrypt(cipherText: string, ivHex: string, tagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  public async saveTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken?: string; expiresIn: number; scopes: string[]; username?: string }
  ): Promise<void> {
    const encAccess = this.encrypt(tokens.accessToken);
    let encRefresh: { cipherText: string; iv: string; tag: string } | undefined;
    if (tokens.refreshToken) {
      encRefresh = this.encrypt(tokens.refreshToken);
    }

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const data: EncryptedPinterestTokenData = {
      encryptedAccessToken: encAccess.cipherText,
      accessTokenIv: encAccess.iv,
      accessTokenTag: encAccess.tag,
      encryptedRefreshToken: encRefresh?.cipherText,
      refreshTokenIv: encRefresh?.iv,
      refreshTokenTag: encRefresh?.tag,
      expiresAt,
      scopes: tokens.scopes,
      userId,
      username: tokens.username
    };

    this.tokenStore.set(userId, data);
    await AuditService.log('PINTEREST_TOKEN_STORED', 'oauth_token', userId, `Stored encrypted token for Pinterest user ${userId}`);
  }

  public hasScope(userId: string, requiredScope: string): boolean {
    const stored = this.tokenStore.get(userId);
    if (!stored) return false;
    return stored.scopes.includes(requiredScope);
  }

  public async getValidAccessToken(userId: string): Promise<string | null> {
    const stored = this.tokenStore.get(userId);
    if (!stored) return null;

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
        await AuditService.log('PINTEREST_TOKEN_REFRESH_FAILED', 'oauth_token', userId, (err as Error).message, 'error');
        return null;
      }
    }

    return this.decrypt(stored.encryptedAccessToken, stored.accessTokenIv, stored.accessTokenTag);
  }

  public async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    const appId = process.env.PINTEREST_APP_ID;
    const appSecret = process.env.PINTEREST_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error('PINTEREST_APP_ID or PINTEREST_APP_SECRET not configured');
    }

    const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pinterest Token Refresh HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    await this.saveTokens(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 2592000,
      scopes: data.scope ? data.scope.split(',') : ['user_accounts:read', 'boards:read', 'pins:read', 'pins:write', 'ads:read']
    });

    await AuditService.log('PINTEREST_TOKEN_REFRESHED', 'oauth_token', userId, 'Refreshed access token successfully');
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
      username: stored.username,
      expiresAt: stored.expiresAt,
      scopes: stored.scopes,
      isExpired: stored.expiresAt.getTime() <= Date.now()
    };
  }
}
