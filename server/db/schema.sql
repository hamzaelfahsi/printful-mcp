-- ==========================================
-- ETSYPILOT AI — POSTGRESQL PRODUCTION SCHEMA
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE content_status AS ENUM ('draft', 'ready', 'approved', 'scheduled', 'published', 'failed');
CREATE TYPE platform_type AS ENUM ('etsy', 'pinterest', 'both');
CREATE TYPE log_severity AS ENUM ('info', 'success', 'warning', 'error');

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'owner',
    demo_mode_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OAuth Tokens (Encrypted at rest)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'etsy' | 'pinterest'
    account_id VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scopes TEXT[] NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, account_id)
);

-- 3. Etsy Shops
CREATE TABLE IF NOT EXISTS etsy_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    etsy_shop_id BIGINT UNIQUE NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    currency_code VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    raw_data JSONB,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Etsy Products / Listings
CREATE TABLE IF NOT EXISTS etsy_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES etsy_shops(id) ON DELETE CASCADE,
    listing_id BIGINT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price_amount DECIMAL(10, 2) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    quantity INT DEFAULT 1,
    state VARCHAR(50) NOT NULL, -- active, draft, expired, sold_out
    tags TEXT[],
    materials TEXT[],
    primary_image_url TEXT,
    all_images JSONB DEFAULT '[]'::jsonb,
    views_count INT DEFAULT 0,
    favorites_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    revenue_amount DECIMAL(12, 2) DEFAULT 0.00,
    etsy_url TEXT NOT NULL,
    last_modified_etsy TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etsy_products_state ON etsy_products(state);
CREATE INDEX IF NOT EXISTS idx_etsy_products_shop_id ON etsy_products(shop_id);

-- 5. Etsy Orders
CREATE TABLE IF NOT EXISTS etsy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES etsy_shops(id) ON DELETE CASCADE,
    receipt_id BIGINT UNIQUE NOT NULL,
    buyer_user_id VARCHAR(255),
    total_amount DECIMAL(10, 2) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    items_summary JSONB NOT NULL,
    created_at_etsy TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Pinterest Accounts & Boards
CREATE TABLE IF NOT EXISTS pinterest_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pinterest_user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    account_type VARCHAR(50),
    profile_image_url TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pinterest_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES pinterest_accounts(id) ON DELETE CASCADE,
    board_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy VARCHAR(50) DEFAULT 'PUBLIC',
    pin_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Content Items & Approval Queue
CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    etsy_product_id UUID REFERENCES etsy_products(id) ON DELETE SET NULL,
    target_platform platform_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT[],
    call_to_action TEXT,
    image_url TEXT,
    destination_url TEXT NOT NULL,
    target_board_id VARCHAR(255),
    status content_status DEFAULT 'draft',
    approval_required BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_status ON content_items(status);

-- 8. Scheduled Posts (Idempotent execution)
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    attempts INT DEFAULT 0,
    last_error TEXT,
    external_post_id VARCHAR(255),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due ON scheduled_posts(scheduled_for, status);

-- 9. Affiliate Links & Tracking
CREATE TABLE IF NOT EXISTS affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    etsy_product_id UUID REFERENCES etsy_products(id) ON DELETE SET NULL,
    campaign_name VARCHAR(255) NOT NULL,
    tracking_code VARCHAR(100) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    total_clicks INT DEFAULT 0,
    unique_clicks INT DEFAULT 0,
    recorded_conversions INT DEFAULT 0,
    estimated_commission DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    referrer TEXT,
    platform VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_link_date ON tracking_events(affiliate_link_id, created_at);

-- 10. AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    etsy_product_id UUID REFERENCES etsy_products(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    data_trigger TEXT NOT NULL,
    recommended_actions JSONB NOT NULL,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    status VARCHAR(50) DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 12. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    severity log_severity DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 13. Phase 6: Normalized Daily Analytics Storage
-- ==========================================
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL, -- 'etsy' | 'pinterest'
    account_id VARCHAR(255) NOT NULL,
    shop_id BIGINT,
    pin_id VARCHAR(255),
    listing_id BIGINT,
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(16, 4) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'API_VERIFIED', 'INTERNAL_CALCULATION', 'USER_PROVIDED', 'AI_ESTIMATE'
    currency VARCHAR(10),
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_analytics_daily UNIQUE (
        platform,
        account_id,
        shop_id,
        pin_id,
        listing_id,
        date,
        metric_name
    )
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_platform_date ON analytics_daily(platform, date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_account ON analytics_daily(account_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_listing ON analytics_daily(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_pin ON analytics_daily(pin_id);

-- ==========================================
-- 14. Phase 6: Analytics Sync Runs Tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS analytics_sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL, -- 'etsy' | 'pinterest' | 'all'
    account_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL, -- 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED'
    records_fetched INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_skipped INT DEFAULT 0,
    error_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sync_runs_status ON analytics_sync_runs(status, started_at DESC);

-- ==========================================
-- 15. Phase 6: First-Party Tracking Links
-- ==========================================
CREATE TABLE IF NOT EXISTS tracking_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    content_version_id VARCHAR(100),
    destination_url TEXT NOT NULL,
    tracking_url TEXT NOT NULL,
    tracking_code VARCHAR(100) UNIQUE NOT NULL,
    campaign VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    medium VARCHAR(100) NOT NULL,
    term VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(tracking_code);

-- ==========================================
-- 16. Phase 7: Monetization & Affiliate Accounts
-- ==========================================
CREATE TABLE IF NOT EXISTS affiliate_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- 'etsy_affiliate', 'awin', 'shareasale', 'manual'
    external_account_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_CONFIGURED', -- 'CONNECTED', 'DISCONNECTED', 'NOT_CONFIGURED', 'UNAVAILABLE'
    currency VARCHAR(10) DEFAULT 'USD',
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_affiliate_accounts UNIQUE (provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS affiliate_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platform VARCHAR(50) NOT NULL,
    channel VARCHAR(100) DEFAULT 'pinterest_profile',
    channel_status VARCHAR(50) DEFAULT 'AUTHORIZED', -- 'AUTHORIZED', 'NOT_AUTHORIZED', 'PENDING_REVIEW', 'UNKNOWN'
    disclosure_text TEXT,
    destination_strategy VARCHAR(100) DEFAULT 'direct_product',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_account_id UUID REFERENCES affiliate_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    affiliate_link_id UUID,
    tracking_link_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'CLICKED', 'CONVERTED', 'QUALIFYING', 'REJECTED', 'CANCELLED', 'RETURNED', 'UNKNOWN'
    order_value DECIMAL(12, 2),
    currency VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'API_VERIFIED', 'IMPORTED_PROVIDER_DATA', 'INTERNAL_CALCULATION'
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_affiliate_conversions UNIQUE (affiliate_account_id, external_id)
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_account_id UUID REFERENCES affiliate_accounts(id) ON DELETE CASCADE,
    conversion_id UUID REFERENCES affiliate_conversions(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    commission_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'APPROVED', 'REJECTED', 'REVERSED', 'PAID', 'UNKNOWN'
    commission_date TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL, -- 'API_VERIFIED', 'IMPORTED_PROVIDER_DATA', 'INTERNAL_CALCULATION'
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_affiliate_commissions UNIQUE (affiliate_account_id, external_id)
);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_account_id UUID REFERENCES affiliate_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'PAID', 'FAILED', 'UNKNOWN'
    payout_date TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL, -- 'API_VERIFIED', 'IMPORTED_PROVIDER_DATA'
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_affiliate_payouts UNIQUE (affiliate_account_id, external_id)
);

-- ==========================================
-- 17. Phase 8: Advanced AI Insights & Recommendations
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_insights_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'PERFORMANCE_CHANGE', 'ANOMALY', 'CONTENT_OPPORTUNITY', 'SEO_OPPORTUNITY', etc.
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- 'INFO', 'LOW', 'MEDIUM', 'HIGH'
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    explanation TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation TEXT NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW'
    platform VARCHAR(50) NOT NULL DEFAULT 'all', -- 'etsy', 'pinterest', 'all'
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    source_metrics JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- 'NEW', 'VIEWED', 'DISMISSED', 'SAVED', 'IMPLEMENTED', 'EXPIRED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_v2_status ON ai_insights_v2(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_v2_type ON ai_insights_v2(type);

CREATE TABLE IF NOT EXISTS ai_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hypothesis TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'etsy' | 'pinterest'
    content_type VARCHAR(50) NOT NULL,
    variable VARCHAR(50) NOT NULL, -- 'TITLE', 'DESCRIPTION', 'TAGS', 'KEYWORDS', 'IMAGE_STYLE', 'CTA', 'PUBLICATION_TIME', 'BOARD'
    control TEXT NOT NULL,
    variant TEXT NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'RUNNING', 'COMPLETED', 'CANCELLED'
    success_metric VARCHAR(100) NOT NULL,
    sample_size INT DEFAULT 0,
    control_metric_value DECIMAL(16, 4),
    variant_metric_value DECIMAL(16, 4),
    difference_percent DECIMAL(10, 2),
    source VARCHAR(50) DEFAULT 'API_VERIFIED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_experiments_status ON ai_experiments(status, created_at DESC);



