-- Migration: Module 2 - Clinical Records & Maternal Protocols
-- Adds structured prenatal lab results, clinical safety trigger flags to visit logs,
-- and Philippine DOH EINC / Newborn Care Package (NCP) protocols to postpartum records.

-- 1. Create public.prenatal_lab_results table
CREATE TABLE IF NOT EXISTS public.prenatal_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  maternal_episode_id UUID REFERENCES public.maternal_episodes(id) ON DELETE SET NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  laboratory_name TEXT DEFAULT 'AR-JEN Clinic Laboratory',
  hemoglobin NUMERIC(4, 1),       -- g/dL (< 11.0 = Anemia)
  hematocrit NUMERIC(4, 1),       -- % (< 33.0% = Low)
  blood_type TEXT,                -- A+, B+, AB+, O+, Rh-
  urinalysis_protein TEXT,        -- Negative, Trace, 1+, 2+, 3+, 4+
  urinalysis_glucose TEXT,        -- Negative, Trace, 1+, 2+, 3+, 4+
  urinalysis_pus_cells TEXT,      -- e.g. 0-2 /hpf, 5-10 /hpf
  urinalysis_rbc TEXT,            -- e.g. 0-1 /hpf
  hbsag_status TEXT DEFAULT 'Pending',         -- Non-Reactive, Reactive, Pending
  vdrl_rpr_status TEXT DEFAULT 'Pending',      -- Non-Reactive, Reactive, Pending
  hiv_screening_status TEXT DEFAULT 'Pending', -- Non-Reactive, Reactive, Pending, Declined
  ogtt_fasting NUMERIC(5, 1),     -- Fasting Blood Sugar mg/dL (>= 92 = GDM)
  ogtt_1hr NUMERIC(5, 1),         -- 1-hr mg/dL (>= 180 = GDM)
  ogtt_2hr NUMERIC(5, 1),         -- 2-hr mg/dL (>= 153 = GDM)
  ultrasound_summary TEXT,        -- Biometry, AFI, placenta, presentation
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast clinical lookups
CREATE INDEX IF NOT EXISTS idx_prenatal_labs_patient ON public.prenatal_lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_prenatal_labs_date ON public.prenatal_lab_results(test_date DESC);

-- Enable RLS
ALTER TABLE public.prenatal_lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage prenatal labs" ON public.prenatal_lab_results;
CREATE POLICY "Staff manage prenatal labs" ON public.prenatal_lab_results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Patients view own prenatal labs" ON public.prenatal_lab_results;
CREATE POLICY "Patients view own prenatal labs" ON public.prenatal_lab_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = prenatal_lab_results.patient_id
      AND public.patients.account_id = auth.uid()
    )
  );

-- 2. Enhance postpartum_records with Philippine DOH EINC & NCP Protocol Tracking
ALTER TABLE public.postpartum_records
  ADD COLUMN IF NOT EXISTS nbs_filter_card_number TEXT,
  ADD COLUMN IF NOT EXISTS nbs_date_collected DATE,
  ADD COLUMN IF NOT EXISTS nbs_status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS bcg_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bcg_date DATE,
  ADD COLUMN IF NOT EXISTS hepb_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hepb_date DATE,
  ADD COLUMN IF NOT EXISTS vit_k_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS eye_prophylaxis_given BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cord_care_done BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS skin_to_skin_initiated BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS early_breastfeeding_initiated BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hearing_screening_status TEXT DEFAULT 'Pending';

-- 3. Enhance visit_logs with Clinical Safety Trigger fields & Trimester metadata
ALTER TABLE public.visit_logs
  ADD COLUMN IF NOT EXISTS is_high_risk_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS high_risk_reasons TEXT[],
  ADD COLUMN IF NOT EXISTS aog_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS aog_days INTEGER,
  ADD COLUMN IF NOT EXISTS trimester TEXT;
