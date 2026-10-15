-- Migration: 20261016000600_cron_delivery_tracking.sql
-- Module: Scheduled Cron Delivery Tracking & Deduplication Hygiene
-- Closes Finding 8: Eliminates duplicate patient emails on retries & mid-batch timeouts

-- 1. Delivery tracking on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent 
  ON public.appointments(appointment_date, status, reminder_sent_at);

-- 2. Delivery tracking on postpartum records
ALTER TABLE public.postpartum_records
  ADD COLUMN IF NOT EXISTS nbs_recall_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS immunization_recall_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_postpartum_nbs_recall 
  ON public.postpartum_records(delivery_date, nbs_recall_sent_at);

CREATE INDEX IF NOT EXISTS idx_postpartum_immunization_recall 
  ON public.postpartum_records(delivery_date, immunization_recall_sent_at);

NOTIFY pgrst, 'reload schema';
