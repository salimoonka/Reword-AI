-- Migration: 005_fix_external_payments_rls.sql
-- 
-- Security fix: Restrict INSERT and UPDATE on external_payments to service_role only.
-- Previously, any authenticated user could insert/update payment records because
-- the policies used WITH CHECK (true) / USING (true) without a role restriction.

-- Drop the insecure policies
DROP POLICY IF EXISTS "Service role can insert payments" ON external_payments;
DROP POLICY IF EXISTS "Service role can update payments" ON external_payments;

-- Re-create with explicit TO service_role restriction
CREATE POLICY "Service role can insert payments"
  ON external_payments FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON external_payments FOR UPDATE
  TO service_role
  USING (true);
