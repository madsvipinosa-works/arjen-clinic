-- Step 1: Turn on the locks (Enable RLS)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prenatal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Patient Policies (Patients can only see/edit their OWN data)
CREATE POLICY "Patients view own profile" 
ON public.patients FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Patients view own appointments" 
ON public.appointments FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Patients insert own appointments" 
ON public.appointments FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

-- Step 3: Admin & Staff Policies (Clinic staff can see and do everything)
CREATE POLICY "Staff have full access to patients" 
ON public.patients FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff have full access to appointments" 
ON public.appointments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'staff')
  )
);
