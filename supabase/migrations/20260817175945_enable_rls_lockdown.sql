-- Step 1: Ensure table defaults
ALTER TABLE public.patients ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.appointments ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 2: Turn on the locks (Enable RLS)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prenatal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Patients Policies
DROP POLICY IF EXISTS "Patients view own profile" ON public.patients;
DROP POLICY IF EXISTS "Patients view own patients" ON public.patients;
DROP POLICY IF EXISTS "Patients insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Patients update own patients" ON public.patients;

CREATE POLICY "Patients view own patients" ON public.patients
  FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR id = auth.uid());

CREATE POLICY "Patients insert own patients" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid() OR id = auth.uid());

CREATE POLICY "Patients update own patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid() OR id = auth.uid())
  WITH CHECK (account_id = auth.uid() OR id = auth.uid());

-- Appointments
DROP POLICY IF EXISTS "Patients view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients update own appointments" ON public.appointments;

CREATE POLICY "Patients view own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = appointments.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    ) OR patient_id = auth.uid()
  );

CREATE POLICY "Patients insert own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = appointments.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    ) OR patient_id = auth.uid()
  );

CREATE POLICY "Patients update own appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = appointments.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    ) OR patient_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = appointments.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    ) OR patient_id = auth.uid()
  );

-- Prenatal Records
DROP POLICY IF EXISTS "Patients view own prenatal_records" ON public.prenatal_records;
DROP POLICY IF EXISTS "Patients insert own prenatal_records" ON public.prenatal_records;

CREATE POLICY "Patients view own prenatal_records" ON public.prenatal_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = prenatal_records.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    )
  );

CREATE POLICY "Patients insert own prenatal_records" ON public.prenatal_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = prenatal_records.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    )
  );

-- Visit Logs
DROP POLICY IF EXISTS "Patients view own visit_logs" ON public.visit_logs;
CREATE POLICY "Patients view own visit_logs" ON public.visit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = visit_logs.patient_id 
        AND (patients.account_id = auth.uid() OR patients.id = auth.uid())
    )
  );

-- Step 4: Admin & Staff Policies (Clinic staff can see and do everything)
DROP POLICY IF EXISTS "Staff have full access to patients" ON public.patients;
CREATE POLICY "Staff have full access to patients" ON public.patients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff have full access to appointments" ON public.appointments;
CREATE POLICY "Staff have full access to appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff have full access to prenatal_records" ON public.prenatal_records;
CREATE POLICY "Staff have full access to prenatal_records" ON public.prenatal_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff have full access to visit_logs" ON public.visit_logs;
CREATE POLICY "Staff have full access to visit_logs" ON public.visit_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
    )
  );
