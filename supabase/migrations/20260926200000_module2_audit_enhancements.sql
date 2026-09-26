-- Migration: Module 2 Audit Enhancements
-- Adds is_high_risk and high_risk_reasons to maternal_episodes for pregnancy-isolated risk tracking
ALTER TABLE public.maternal_episodes
  ADD COLUMN IF NOT EXISTS is_high_risk BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS high_risk_reasons TEXT[];

NOTIFY pgrst, 'reload schema';
