-- Migration: 20261016000200_purge_out_of_scope_billing.sql
-- Module: Scope Freeze Enforcement & Deprecation of Out-of-Scope Billing / Claims
-- Status: Scope Frozen per AGENTS.md Mandate.
-- The AR-JEN system focuses strictly on clinical triage, maternal EMR, consultations, and DOH protocols.
-- Financial revenue tracking, cashiering, invoices, and external PhilHealth claims adjudication are permanently purged.

-- Drop any invoice or claims tables if they were provisioned
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.philhealth_claims CASCADE;

-- Drop obsolete cashier roles or policies
DO $$ 
BEGIN
  -- Ensure users check constraint does not include cashier
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff', 'patient'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

NOTIFY pgrst, 'reload schema';
