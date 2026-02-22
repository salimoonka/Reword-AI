-- Migration: Align subscriptions table with TypeScript types
-- Adds missing columns for full receipt tracking

-- Add plan column
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' 
  CHECK (plan IN ('free', 'pro_monthly', 'pro_yearly'));

-- Add store column 
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS store TEXT 
  CHECK (store IN ('apple', 'google'));

-- Add store_transaction_id and store_original_transaction_id
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS store_transaction_id TEXT;

-- Rename original_transaction_id → store_original_transaction_id if old column exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'subscriptions' 
             AND column_name = 'original_transaction_id') 
  THEN
    ALTER TABLE subscriptions 
      RENAME COLUMN original_transaction_id TO store_original_transaction_id;
  ELSE
    ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS store_original_transaction_id TEXT;
  END IF;
END $$;

-- Add started_at, cancelled_at, trial_ends_at
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add price tracking
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(10,2);

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'RUB';

-- Drop old tier constraint and add new status values
-- First update the status column to support all values
DO $$
BEGIN
  -- If 'tier' column exists, migrate to 'plan' and drop it
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'subscriptions' 
             AND column_name = 'tier') 
  THEN
    -- Copy tier data to plan: 'free' → 'free', 'pro' → 'pro_monthly'
    UPDATE subscriptions 
    SET plan = CASE WHEN tier = 'pro' THEN 'pro_monthly' ELSE 'free' END
    WHERE plan IS NULL OR plan = 'free';
    
    ALTER TABLE subscriptions DROP COLUMN tier;
  END IF;
END $$;

-- Update status column to support new values (free, active, expired, cancelled, trial)
ALTER TABLE subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('free', 'active', 'expired', 'cancelled', 'trial'));

-- Update has_premium_access function to check plan column
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

-- Add index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON subscriptions(status) WHERE status IN ('active', 'trial');

CREATE INDEX IF NOT EXISTS idx_subscriptions_expires 
  ON subscriptions(expires_at) WHERE status = 'active';
