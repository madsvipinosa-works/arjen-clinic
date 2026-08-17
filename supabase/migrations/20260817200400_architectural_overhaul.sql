-- Migration: Architectural Overhaul (Maternal Episodes & Staff Attribution)

-- 1. Create maternal_episodes
CREATE TABLE public.maternal_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  lmp date,
  edc date,
  gravida integer,
  para integer,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Delivered', 'Archived')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Alter patients table to decouple from auth.users
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_id_fkey;

-- Add account_id to link patients to users who manage them
ALTER TABLE public.patients ADD COLUMN account_id uuid REFERENCES auth.users(id);

-- Migrate existing patient.id to account_id since they are the same currently (1:1 relation previously)
UPDATE public.patients SET account_id = id;

-- Add new flags
ALTER TABLE public.patients
  ADD COLUMN allergies text,
  ADD COLUMN is_high_risk boolean DEFAULT false;

-- Auto-migrate existing LMP and EDC data to a default maternal episode
INSERT INTO public.maternal_episodes (patient_id, lmp, edc, status)
SELECT id, lmp, edc, 'Active'
FROM public.patients
WHERE lmp IS NOT NULL OR edc IS NOT NULL;

-- Now drop lmp and edc from patients
ALTER TABLE public.patients DROP COLUMN IF EXISTS lmp, DROP COLUMN IF EXISTS edc;

-- 3. Alter other tables for Staff Attribution and Episode Linking
ALTER TABLE public.appointments ADD COLUMN attending_staff_id uuid REFERENCES auth.users(id);

ALTER TABLE public.visit_logs 
  ADD COLUMN attending_staff_id uuid REFERENCES auth.users(id),
  ADD COLUMN maternal_episode_id uuid REFERENCES public.maternal_episodes(id);

ALTER TABLE public.birth_plans 
  ADD COLUMN maternal_episode_id uuid REFERENCES public.maternal_episodes(id);

-- Map existing visit logs and birth plans to the active maternal episode
UPDATE public.visit_logs vl
SET maternal_episode_id = me.id
FROM public.maternal_episodes me
WHERE vl.patient_id = me.patient_id AND me.status = 'Active';

UPDATE public.birth_plans bp
SET maternal_episode_id = me.id
FROM public.maternal_episodes me
WHERE bp.patient_id = me.patient_id AND me.status = 'Active';

ALTER TABLE public.postpartum_records 
  ADD COLUMN attending_staff_id uuid REFERENCES auth.users(id),
  ADD COLUMN maternal_episode_id uuid REFERENCES public.maternal_episodes(id);

UPDATE public.postpartum_records pr
SET maternal_episode_id = me.id
FROM public.maternal_episodes me
WHERE pr.patient_id = me.patient_id AND me.status = 'Active';

-- 4. Set RLS on maternal_episodes
ALTER TABLE public.maternal_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage maternal_episodes" ON public.maternal_episodes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff')
  )
);

CREATE POLICY "Patients view own maternal_episodes" ON public.maternal_episodes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.patients WHERE public.patients.id = patient_id AND public.patients.account_id = auth.uid()
  )
);
