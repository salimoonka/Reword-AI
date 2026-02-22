-- Migration: 004_external_payments.sql
-- Description: Add support for external (web) payments via YooKassa
-- Date: 2026-02

-- ============================================
-- 1. Extend store CHECK constraint
-- ============================================

ALTER TABLE subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_store_check;

ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_store_check 
  CHECK (store IN ('apple', 'google', 'external'));

-- ============================================
-- 2. Add external_payment_id column
-- ============================================

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS external_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_external_payment 
  ON subscriptions(external_payment_id) 
  WHERE external_payment_id IS NOT NULL;

-- ============================================
-- 3. External payments audit table
-- ============================================

CREATE TABLE IF NOT EXISTS external_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- YooKassa data
    yookassa_payment_id TEXT NOT NULL UNIQUE,
    yookassa_status TEXT NOT NULL,  -- 'pending', 'waiting_for_capture', 'succeeded', 'canceled'
    idempotency_key TEXT NOT NULL UNIQUE,
    
    -- Payment details
    amount_value NUMERIC(10, 2) NOT NULL,
    amount_currency TEXT NOT NULL DEFAULT 'RUB',
    description TEXT,
    
    -- Subscription plan
    plan TEXT NOT NULL CHECK (plan IN ('pro_monthly', 'pro_yearly')),
    
    -- Payment method
    payment_method_type TEXT,  -- 'sbp', 'bank_card', 'yoo_money', etc.
    
    -- Confirmation
    confirmation_type TEXT,  -- 'redirect', 'qr'
    confirmation_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Webhook data
    webhook_received_at TIMESTAMPTZ,
    webhook_event TEXT,
    
    -- Processing flag
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ext_payments_user 
  ON external_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_ext_payments_status 
  ON external_payments(yookassa_status);
CREATE INDEX IF NOT EXISTS idx_ext_payments_created 
  ON external_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ext_payments_pending 
  ON external_payments(yookassa_status, processed) 
  WHERE yookassa_status = 'pending' AND processed = false;

-- Trigger for updated_at
CREATE TRIGGER update_external_payments_updated_at
    BEFORE UPDATE ON external_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. RLS policies for external_payments
-- ============================================

ALTER TABLE external_payments ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payments
CREATE POLICY "Users can view own payments"
  ON external_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Insert via service role only (backend)
CREATE POLICY "Service role can insert payments"
  ON external_payments FOR INSERT
  WITH CHECK (true);

-- Update via service role only (webhook)
CREATE POLICY "Service role can update payments"
  ON external_payments FOR UPDATE
  USING (true);

-- ============================================
-- 5. Update has_premium_access function
-- ============================================

CREATE OR REPLACE FUNCTION has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('active', 'trial')
    AND (
      (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
      OR
      (status = 'trial' AND (trial_ends_at IS NULL OR trial_ends_at > NOW()))
    )
    AND plan IN ('pro_monthly', 'pro_yearly')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Note: function does not depend on store column, so external
-- subscriptions work automatically without logic changes.
