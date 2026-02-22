-- Reword AI Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2026-02-18

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profile data linked to Supabase Auth

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    preferred_mode TEXT DEFAULT 'lite' CHECK (preferred_mode IN ('lite', 'moderate', 'creative')),
    theme TEXT DEFAULT 'auto' CHECK (theme IN ('auto', 'dark', 'light')),
    language TEXT DEFAULT 'ru' CHECK (language IN ('ru', 'en')),
    sound_enabled BOOLEAN DEFAULT true,
    haptic_enabled BOOLEAN DEFAULT true,
    auto_correct_enabled BOOLEAN DEFAULT true,
    show_suggestions BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
-- Stores subscription status and IAP data

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'expired', 'cancelled', 'trial')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_monthly', 'pro_yearly')),
    
    -- App Store / Google Play data
    store TEXT CHECK (store IN ('apple', 'google')),
    store_product_id TEXT,
    store_transaction_id TEXT,
    store_original_transaction_id TEXT,
    
    -- Subscription dates
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    
    -- Billing
    price_amount INTEGER, -- in kopeks/cents
    price_currency TEXT DEFAULT 'RUB',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_store_transaction ON subscriptions(store_original_transaction_id);

-- ============================================
-- USAGE_LOG TABLE
-- ============================================
-- Tracks paraphrase usage for quota management

CREATE TABLE IF NOT EXISTS usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Request details
    action TEXT NOT NULL CHECK (action IN ('paraphrase', 'check', 'spellcheck')),
    mode TEXT CHECK (mode IN ('shorten', 'expand', 'formal', 'friendly', 'confident', 'professional', 'colloquial', 'empathetic')),
    
    -- Text metrics (NO raw text stored!)
    input_length INTEGER NOT NULL,
    output_length INTEGER,
    input_hash TEXT, -- SHA256 hash for deduplication
    
    -- Token usage for billing
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    
    -- LLM metadata
    model TEXT,
    latency_ms INTEGER,
    cached BOOLEAN DEFAULT false,
    
    -- Error tracking
    success BOOLEAN DEFAULT true,
    error_code TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_hash ON usage_log(input_hash);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_date ON usage_log(user_id, created_at DESC);

-- Partial index for daily quota counting
CREATE INDEX IF NOT EXISTS idx_usage_log_daily ON usage_log(user_id, created_at) 
    WHERE action = 'paraphrase' AND success = true;

-- ============================================
-- PARAPHRASE_CACHE TABLE (Optional)
-- ============================================
-- Caches paraphrase results for deduplication

CREATE TABLE IF NOT EXISTS paraphrase_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    input_hash TEXT NOT NULL,
    mode TEXT NOT NULL,
    output_text TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER,
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    
    UNIQUE(input_hash, mode)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_cache_hash_mode ON paraphrase_cache(input_hash, mode);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON paraphrase_cache(expires_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO subscriptions (user_id, status, plan)
    VALUES (NEW.id, 'free', 'free');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to count daily usage
CREATE OR REPLACE FUNCTION get_daily_usage_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM usage_log
        WHERE user_id = p_user_id
          AND action = 'paraphrase'
          AND success = true
          AND created_at >= CURRENT_DATE
          AND created_at < CURRENT_DATE + INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's remaining quota
CREATE OR REPLACE FUNCTION get_remaining_quota(p_user_id UUID, p_daily_limit INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
    is_premium BOOLEAN;
    daily_count INTEGER;
BEGIN
    -- Check if user has premium
    SELECT has_premium_access(p_user_id) INTO is_premium;
    
    -- Premium users have unlimited (-1)
    IF is_premium THEN
        RETURN -1;
    END IF;
    
    -- Count today's usage
    SELECT get_daily_usage_count(p_user_id) INTO daily_count;
    
    -- Return remaining quota
    RETURN GREATEST(0, p_daily_limit - daily_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
