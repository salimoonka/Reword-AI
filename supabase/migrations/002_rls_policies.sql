-- Reword AI Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Created: 2026-02-18

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE paraphrase_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role can read all profiles (for admin)
CREATE POLICY "Service role can read all profiles"
    ON profiles
    FOR SELECT
    TO service_role
    USING (true);

-- Service role can insert profiles
CREATE POLICY "Service role can insert profiles"
    ON profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Service role can update profiles
CREATE POLICY "Service role can update profiles"
    ON profiles
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions
-- (IAP webhooks handled by backend)
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- USAGE_LOG POLICIES
-- ============================================

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs"
    ON usage_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert usage logs
-- (Backend records usage, not client)
CREATE POLICY "Service role can insert usage logs"
    ON usage_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Service role can read all usage logs (for analytics)
CREATE POLICY "Service role can read all usage logs"
    ON usage_log
    FOR SELECT
    TO service_role
    USING (true);

-- ============================================
-- PARAPHRASE_CACHE POLICIES
-- ============================================

-- Cache is service-role only (backend manages)
CREATE POLICY "Service role can manage cache"
    ON paraphrase_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on tables to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON usage_log TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_daily_usage_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_premium_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_quota(UUID, INTEGER) TO authenticated;
