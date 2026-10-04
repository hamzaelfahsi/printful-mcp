import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { EtsyService } from './services/EtsyService.js';
import { EtsySyncService } from './services/EtsySyncService.js';
import { EtsyDiffService } from './services/EtsyDiffService.js';
import { PinterestService } from './services/PinterestService.js';
import { PinterestAnalyticsService } from './services/PinterestAnalyticsService.js';
import { GeminiService } from './services/GeminiService.js';
import { KeywordService } from './services/KeywordService.js';
import { ContentVersioningService } from './services/ContentVersioningService.js';
import { AIInsightService } from './services/AIInsightService.js';
import { AdvancedAIInsightService } from './services/AdvancedAIInsightService.js';
import { AIExperimentService } from './services/AIExperimentService.js';
import { PublicationWorker } from './services/PublicationWorker.js';
import { NotificationService } from './services/NotificationService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { AnalyticsDailyService } from './services/AnalyticsDailyService.js';
import { AnalyticsSyncService } from './services/AnalyticsSyncService.js';
import { FirstPartyTrackingService } from './services/FirstPartyTrackingService.js';
import { AffiliateEngineService } from './services/AffiliateEngineService.js';
import { AffiliateImportService } from './services/AffiliateImportService.js';
import { AffiliateSyncService } from './services/AffiliateSyncService.js';
import { AffiliateService } from './services/AffiliateService.js';
import { TrackingService } from './services/TrackingService.js';
import { AuditService } from './services/AuditService.js';
import { 
  securityHeadersMiddleware, 
  corsSecurityMiddleware, 
  rateLimiter, 
  safeErrorHandler 
} from './services/SecurityMiddleware.js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  
  // Security & Protocol Middlewares
  app.use(securityHeadersMiddleware);
  app.use(corsSecurityMiddleware);
  app.use(express.json({ limit: '5mb' }));

  // === SYSTEM OBSERVABILITY & HEALTH CHECK ===
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      phase: 9,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // === ETSY OAUTH 2.0 PKCE & SYNC ENDPOINTS ===
  app.get('/api/etsy/auth/start', rateLimiter.limit({ windowMs: 60000, maxRequests: 30 }), (req, res) => {
    const redirectUri =
      process.env.ETSY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/etsy/auth/callback`;
    const authData = EtsyService.getInstance().getAuthStart(redirectUri);
    res.json(authData);
  });

  app.get('/api/etsy/auth/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    const isProd = process.env.NODE_ENV === 'production' && !process.env.APP_URL?.includes('run.app');
    const targetOrigin = isProd
      ? 'https://etsypilot-ai.ai.studio'
      : (process.env.APP_URL || `${req.protocol}://${req.get('host')}`);

    if (error) {
      const errorMsg = String(error_description || error);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Erreur Authentification Etsy</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; padding: 40px; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #131c31; border: 1px solid #ef4444; border-radius: 16px; padding: 32px;">
            <h2 style="color: #ef4444; margin-top: 0;">Échec de Connexion Etsy</h2>
            <p style="color: #94a3b8; font-size: 14px;">${errorMsg}</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Vous pouvez fermer cette fenêtre et réessayer depuis CraftCases Studio.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter in Etsy OAuth callback.');
    }

    const redirectUri =
      process.env.ETSY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/etsy/auth/callback`;

    try {
      await EtsyService.getInstance().handleOAuthCallback(String(code), String(state), redirectUri);

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Connexion Etsy Réussie</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; padding: 40px; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #131c31; border: 1px solid #10b981; border-radius: 16px; padding: 32px;">
            <div style="font-size: 40px; margin-bottom: 16px;">✨</div>
            <h2 style="color: #10b981; margin-top: 0;">Connexion Etsy Réussie !</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">Votre boutique Etsy est désormais connectée à CraftCases Studio.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Cette fenêtre va se fermer automatiquement...</p>
            <p style="color: #475569; font-size: 11px; margin-top: 10px;">Si la fenêtre ne se ferme pas, vous pouvez la fermer et revenir à l'application.</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'ETSY_AUTH_SUCCESS' }, '${targetOrigin}');
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            } catch (e) {
              console.error('postMessage error:', e);
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Erreur Validation OAuth</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; padding: 40px; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #131c31; border: 1px solid #ef4444; border-radius: 16px; padding: 32px;">
            <h2 style="color: #ef4444; margin-top: 0;">Erreur OAuth</h2>
            <p style="color: #94a3b8; font-size: 14px;">${err?.message || 'Validation échouée'}</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  app.get('/api/etsy/status', (req, res) => {
    res.json(EtsyService.getInstance().getStatus());
  });

  // === GET /api/etsy/listings (Live authenticated listings) ===
  app.get('/api/etsy/listings', async (req, res) => {
    try {
      const etsyService = EtsyService.getInstance();
      const shop = await etsyService.getConnectedShop();

      if (!shop) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Aucun compte Etsy connecté. Veuillez connecter votre boutique Etsy dans les Paramètres.'
        });
      }

      const rawListings = await etsyService.fetchAllPaginatedListings(shop.shop_id, 'active');
      const normalizedListings = rawListings.map((raw) =>
        EtsySyncService.getInstance().normalizeListing(raw)
      );

      res.json({
        success: true,
        count: normalizedListings.length,
        shopId: shop.shop_id,
        shopName: shop.shop_name,
        listings: normalizedListings
      });
    } catch (err: any) {
      const isAuthErr =
        err.message?.includes('401') ||
        err.message?.includes('token') ||
        err.message?.includes('Unauthorized') ||
        err.message?.includes('ETSY_CLIENT_ID is not configured');
      res.status(isAuthErr ? 401 : 500).json({
        error: isAuthErr ? 'UNAUTHORIZED' : 'ETSY_FETCH_ERROR',
        message: err?.message || 'Erreur lors de la récupération des listings Etsy'
      });
    }
  });

  app.post('/api/etsy/disconnect', async (req, res) => {
    try {
      await EtsyService.getInstance().disconnect();
      res.json({ success: true, message: 'Disconnected Etsy store successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/etsy/sync/shop', async (req, res) => {
    try {
      const { shopId, type } = req.body;
      const targetShopId = shopId || 18492039;
      const result = await EtsySyncService.getInstance().executeSync(targetShopId, type || 'FULL_SYNC');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/etsy/diff', (req, res) => {
    try {
      const { localProducts, remoteListings } = req.body;
      const diffResults = EtsyDiffService.compare(localProducts || [], remoteListings || []);
      res.json(diffResults);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/etsy/sync/history', (req, res) => {
    res.json(EtsySyncService.getInstance().getSyncHistory());
  });

  app.post('/api/etsy/listing/update', async (req, res) => {
    try {
      const { shopId, listingId, fields } = req.body;
      const result = await EtsyService.getInstance().updateListing(shopId || 18492039, Number(listingId), fields);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/etsy/listing/delete', async (req, res) => {
    try {
      const { listingId } = req.body;
      const result = await EtsyService.getInstance().deleteListing(Number(listingId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === PINTEREST BUSINESS API v5 ENDPOINTS ===
  app.get('/api/pinterest/auth/start', (req, res) => {
    const redirectUri =
      process.env.PINTEREST_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/pinterest/auth/callback`;
    const authData = PinterestService.getInstance().getAuthStart(redirectUri);
    res.json(authData);
  });

  app.get('/api/pinterest/auth/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    if (error) {
      return res.redirect(`/?pinterest_error=${encodeURIComponent(String(error_description || error))}`);
    }
    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter in Pinterest OAuth callback.');
    }
    const redirectUri =
      process.env.PINTEREST_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/pinterest/auth/callback`;
    try {
      await PinterestService.getInstance().handleOAuthCallback(String(code), String(state), redirectUri);
      res.redirect('/?pinterest_connected=true');
    } catch (err: any) {
      res.redirect(`/?pinterest_error=${encodeURIComponent(err?.message || 'Pinterest OAuth exchange failed')}`);
    }
  });

  app.get('/api/pinterest/status', (req, res) => {
    res.json(PinterestService.getInstance().getStatus());
  });

  app.post('/api/pinterest/disconnect', async (req, res) => {
    try {
      await PinterestService.getInstance().disconnect();
      res.json({ success: true, message: 'Disconnected Pinterest account successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/pinterest/account', async (req, res) => {
    try {
      const account = await PinterestService.getInstance().getUserAccount();
      res.json(account);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/pinterest/boards', async (req, res) => {
    try {
      const boards = await PinterestService.getInstance().getBoards();
      res.json(boards);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/pinterest/pins/create', async (req, res) => {
    try {
      const pin = await PinterestService.getInstance().createPin(req.body);
      res.json(pin);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/pinterest/pins/:pinId', async (req, res) => {
    try {
      const updated = await PinterestService.getInstance().updatePin(req.params.pinId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/pinterest/pins/:pinId', async (req, res) => {
    try {
      const result = await PinterestService.getInstance().deletePin(req.params.pinId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/pinterest/pins/:pinId/analytics', async (req, res) => {
    try {
      const analytics = await PinterestAnalyticsService.getInstance().getAggregatedPinMetrics(req.params.pinId);
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === AI CONTENT & SEO ENGINE ENDPOINTS (PHASE 4) ===
  app.post('/api/ai/generate-package', async (req, res) => {
    try {
      const pkg = await GeminiService.generateFullContentPackage(req.body);
      const saved = await ContentVersioningService.getInstance().addGeneratedVersion(
        req.body.productId || `prod_${Date.now()}`,
        req.body.productTitle,
        pkg
      );

      const kwService = KeywordService.getInstance();
      pkg.etsy.keywords.forEach((kw) => kwService.addKeyword({ keyword: kw, platform: 'etsy', productId: req.body.productId }));
      pkg.pinterest.keywords.forEach((kw) => kwService.addKeyword({ keyword: kw, platform: 'pinterest', productId: req.body.productId }));

      res.json({ package: pkg, contentItem: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/content/approve', async (req, res) => {
    try {
      const { productId } = req.body;
      const approved = await ContentVersioningService.getInstance().approveContent(productId);
      res.json(approved);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/content/restore-version', async (req, res) => {
    try {
      const { productId, versionNumber } = req.body;
      const restored = await ContentVersioningService.getInstance().restoreVersion(productId, Number(versionNumber));
      res.json(restored);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/ai/content/items', (req, res) => {
    res.json(ContentVersioningService.getInstance().getAllContentItems());
  });

  app.get('/api/ai/keywords', (req, res) => {
    res.json({
      keywords: KeywordService.getInstance().getKeywords(),
      grouped: KeywordService.getInstance().getGroupedByCategory()
    });
  });

  app.get('/api/ai/insights/recommendations', (req, res) => {
    res.json(AIInsightService.getInstance().getRecommendations());
  });

  // === SCHEDULER & PUBLICATION ENGINE ENDPOINTS (PHASE 5) ===
  app.post('/api/publications/schedule', async (req, res) => {
    try {
      const task = await PublicationWorker.getInstance().scheduleTask(req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/publications/publish-now', async (req, res) => {
    try {
      const task = await PublicationWorker.getInstance().publishNow(req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/publications/:id/cancel', async (req, res) => {
    try {
      const success = await PublicationWorker.getInstance().cancelTask(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/publications/:id/retry', async (req, res) => {
    try {
      const success = await PublicationWorker.getInstance().processTask(req.params.id);
      res.json({ success, task: PublicationWorker.getInstance().getTask(req.params.id) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/publications/tasks', (req, res) => {
    res.json(PublicationWorker.getInstance().getTasks());
  });

  app.get('/api/notifications', (req, res) => {
    res.json(NotificationService.getInstance().getNotifications());
  });

  app.post('/api/notifications/read-all', (req, res) => {
    NotificationService.getInstance().markAllAsRead();
    res.json({ success: true });
  });

  // Legacy compat endpoints
  app.post('/api/ai/seo', async (req, res) => {
    try {
      const result = await GeminiService.generateSEOSuggestions(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/pin', async (req, res) => {
    try {
      const result = await GeminiService.generatePinterestPin(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === PHASE 6: UNIFIED ANALYTICS & TRACKING CENTER ENDPOINTS ===
  app.get('/api/analytics/overview', (req, res) => {
    res.json(AnalyticsDailyService.getInstance().getVerifiedOverviewKPIs());
  });

  app.get('/api/analytics/performance', (req, res) => {
    const days = Number(req.query.days) || 30;
    const platform = req.query.platform ? String(req.query.platform) : undefined;
    res.json(AnalyticsDailyService.getInstance().getPerformanceTimeSeries(days, platform));
  });

  app.get('/api/analytics/products/top', (req, res) => {
    const sortBy = (req.query.sortBy as any) || 'orders';
    const limit = Number(req.query.limit) || 10;
    res.json(AnalyticsDailyService.getInstance().getTopEtsyProducts(sortBy, limit));
  });

  app.get('/api/analytics/pins/top', (req, res) => {
    const sortBy = (req.query.sortBy as any) || 'impressions';
    const limit = Number(req.query.limit) || 10;
    res.json(AnalyticsDailyService.getInstance().getTopPinterestPins(sortBy, limit));
  });

  app.get('/api/analytics/etsy/listing/:listingId', (req, res) => {
    const listingId = Number(req.params.listingId);
    res.json(AnalyticsDailyService.getInstance().getListingDetail(listingId));
  });

  app.get('/api/analytics/pinterest/pin/:pinId', (req, res) => {
    res.json(AnalyticsDailyService.getInstance().getPinDetail(req.params.pinId));
  });

  app.get('/api/analytics/content-performance', (req, res) => {
    res.json(AnalyticsDailyService.getInstance().getContentPerformanceLinks());
  });

  app.post('/api/analytics/sync/trigger', async (req, res) => {
    try {
      const syncRun = await AnalyticsSyncService.getInstance().syncAllAccounts();
      res.json(syncRun);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/analytics/sync/status', (req, res) => {
    res.json({
      isSyncing: AnalyticsSyncService.getInstance().isCurrentlySyncing(),
      recentRuns: AnalyticsSyncService.getInstance().getRecentSyncRuns(10)
    });
  });

  // First-party Tracking & Attribution
  app.get('/api/tracking/links', (req, res) => {
    res.json(FirstPartyTrackingService.getInstance().getTrackingLinks());
  });

  app.post('/api/tracking/links', async (req, res) => {
    try {
      const link = await FirstPartyTrackingService.getInstance().createTrackingLink(req.body);
      res.json(link);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/tracking/events', (req, res) => {
    try {
      const event = FirstPartyTrackingService.getInstance().recordEvent(req.body);
      res.json(event);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/attribution/summary', (req, res) => {
    res.json(FirstPartyTrackingService.getInstance().getAttributionSummary());
  });

  // First-party Redirect Handler with Open Redirect Protection & Zero PII
  app.get('/t/:code', async (req, res) => {
    const code = req.params.code;
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || '';
    const result = await FirstPartyTrackingService.getInstance().handleRedirect(code, ip, userAgent, referrer);
    res.redirect(302, result.destinationUrl);
  });

  // Legacy compat endpoints
  app.get('/api/analytics/kpis', (req, res) => {
    res.json(AnalyticsService.getKPIs());
  });

  app.get('/api/ai/insights', (req, res) => {
    res.json(AnalyticsService.generateInsights());
  });

  // === PHASE 8: ADVANCED AI INSIGHTS & EXPERIMENTS ENDPOINTS ===
  app.get('/api/ai/insights/v2', (req, res) => {
    const { type, platform, status } = req.query;
    res.json(AdvancedAIInsightService.getInstance().getInsights({
      type: type as string,
      platform: platform as string,
      status: status as string
    }));
  });

  app.post('/api/ai/insights/v2/generate', async (req, res) => {
    try {
      const result = await AdvancedAIInsightService.getInstance().generateInsights();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/insights/v2/:id/status', async (req, res) => {
    try {
      const updated = await AdvancedAIInsightService.getInstance().updateInsightStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/ai/experiments', (req, res) => {
    res.json(AIExperimentService.getInstance().getExperiments());
  });

  app.post('/api/ai/experiments', async (req, res) => {
    try {
      const experiment = await AIExperimentService.getInstance().createExperiment(req.body);
      res.json(experiment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/experiments/:id/status', async (req, res) => {
    try {
      const updated = await AIExperimentService.getInstance().updateExperimentStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // === PHASE 7: MONETIZATION & AFFILIATE ENGINE ENDPOINTS ===
  app.get('/api/monetization/overview', (req, res) => {
    res.json(AffiliateEngineService.getInstance().getMonetizationKPIs());
  });

  app.get('/api/monetization/performance', (req, res) => {
    const days = Number(req.query.days) || 30;
    res.json(AffiliateEngineService.getInstance().getMonetizationPerformanceTimeSeries(days));
  });

  app.get('/api/monetization/campaigns', (req, res) => {
    res.json(AffiliateEngineService.getInstance().getCampaigns());
  });

  app.post('/api/monetization/campaigns', async (req, res) => {
    try {
      const campaign = await AffiliateEngineService.getInstance().createCampaign(req.body);
      res.json(campaign);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/monetization/campaigns/:id/status', async (req, res) => {
    try {
      const updated = await AffiliateEngineService.getInstance().updateCampaignStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/monetization/conversions', (req, res) => {
    res.json(AffiliateEngineService.getInstance().getConversions());
  });

  app.get('/api/monetization/commissions', (req, res) => {
    res.json(AffiliateEngineService.getInstance().getCommissions());
  });

  app.post('/api/monetization/commissions/:id/status', async (req, res) => {
    try {
      const updated = await AffiliateEngineService.getInstance().updateCommissionStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/monetization/payouts', (req, res) => {
    res.json(AffiliateEngineService.getInstance().getPayouts());
  });

  app.post('/api/monetization/import/csv', async (req, res) => {
    try {
      const { csv } = req.body;
      const result = await AffiliateImportService.getInstance().importCsv(csv);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/monetization/import/json', async (req, res) => {
    try {
      const { json } = req.body;
      const result = await AffiliateImportService.getInstance().importJson(typeof json === 'string' ? json : JSON.stringify(json));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/monetization/sync', async (req, res) => {
    try {
      const result = await AffiliateSyncService.getInstance().syncAll();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Affiliate & Tracking
  app.get('/api/affiliate/links', (req, res) => {
    res.json(AffiliateService.getLinks());
  });

  app.post('/api/affiliate/links', async (req, res) => {
    try {
      const link = await AffiliateService.createLink(req.body);
      res.json(link);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/track/:code', async (req, res) => {
    const code = req.params.code;
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || '';
    const result = await TrackingService.handleRedirect(code, ip, userAgent, referrer);
    res.redirect(302, result.destinationUrl);
  });

  app.get('/api/audit-logs', (req, res) => {
    res.json(AuditService.getRecentLogs(40));
  });

  // === VITE DEV MIDDLEWARE OR STATIC SERVING ===
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '..')
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Safe Centralized Error Handler
  app.use(safeErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EtsyPilot AI Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
