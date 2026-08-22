-- Migration: Create clinical_record_exports for DPA 2012 compliance audit trail
CREATE TABLE IF NOT EXISTS public.clinical_record_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  export_type TEXT NOT NULL DEFAULT 'PRINT_SUMMARY',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.clinical_record_exports ENABLE ROW LEVEL SECURITY;

-- Staff / Admins can view and create export records
CREATE POLICY "Staff can view all clinical exports" ON public.clinical_record_exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can insert clinical exports" ON public.clinical_record_exports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff')
    )
  );

-- Patients can view their own export audit log
CREATE POLICY "Patients view own clinical exports" ON public.clinical_record_exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients WHERE public.patients.id = patient_id AND public.patients.account_id = auth.uid()
    )
  );

-- Patients can insert export record if they print their own record
CREATE POLICY "Patients insert own clinical exports" ON public.clinical_record_exports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients WHERE public.patients.id = patient_id AND public.patients.account_id = auth.uid()
    )
  );
