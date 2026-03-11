-- Migration: 006_fix_security_definer_auth.sql
-- Fix: DB-01 — SECURITY DEFINER functions accept arbitrary user_id
-- All functions now enforce auth.uid() = p_user_id to prevent
-- authenticated users from reading other users' data.

-- ============================================
-- FIX: get_daily_usage_count — enforce caller identity
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_usage_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    -- Prevent users from querying other users' usage counts
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'unauthorized: cannot access other user data';
    END IF;

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

-- ============================================
-- FIX: has_premium_access — enforce caller identity
-- ============================================
CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Prevent users from querying other users' premium status
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'unauthorized: cannot access other user data';
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX: get_remaining_quota — enforce caller identity
-- ============================================
CREATE OR REPLACE FUNCTION get_remaining_quota(p_user_id UUID, p_daily_limit INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    is_premium BOOLEAN;
    daily_count INTEGER;
BEGIN
    -- Prevent users from querying other users' quota
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'unauthorized: cannot access other user data';
    END IF;

    -- Check if user has premium (auth check already passed above,
    -- but has_premium_access will also validate — that's fine)
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
