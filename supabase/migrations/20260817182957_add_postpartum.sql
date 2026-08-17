-- Migration: Add Postpartum Care module
-- Creates the postpartum_records table and RLS policies

CREATE TABLE public.postpartum_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  delivery_date date NOT NULL,
  delivery_type text CHECK (delivery_type IN ('Vaginal', 'Cesarean', 'VBAC')),
  baby_vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  maternal_recovery_notes text,
  feeding_method text CHECK (feeding_method IN ('Breastfeeding', 'Formula', 'Mixed')),
  follow_up_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.postpartum_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage postpartum records" ON public.postpartum_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff'))
);

CREATE POLICY "Patients view own postpartum records" ON public.postpartum_records FOR SELECT USING (auth.uid() = patient_id);
