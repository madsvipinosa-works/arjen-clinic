-- Migration: Online Consultation Hub & Teleconsultation Messaging
-- Enhances consultation_messages with granular clinical roles, read status, urgency flags, and secure RLS.

-- 1. Drop old constraint on sender_role and add granular roles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.consultation_messages'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%sender_role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.consultation_messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.consultation_messages 
  ADD CONSTRAINT consultation_messages_sender_role_check 
  CHECK (sender_role IN ('patient', 'staff', 'admin', 'doctor', 'midwife', 'nurse'));

-- 2. Add status and clinical triage columns if not already present
ALTER TABLE public.consultation_messages 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
  ADD COLUMN IF NOT EXISTS is_flagged_urgent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'routine' CHECK (urgency_level IN ('routine', 'priority', 'urgent')),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- 3. High-performance indexes for thread loading & filtering
CREATE INDEX IF NOT EXISTS idx_consultation_messages_patient ON public.consultation_messages(patient_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_created_at ON public.consultation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_status ON public.consultation_messages(status);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_urgent ON public.consultation_messages(is_flagged_urgent);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

-- Staff Policy: Clinical staff (admin, doctor, midwife, nurse, staff) can view, insert, and update all consultation messages
DROP POLICY IF EXISTS "Clinical staff manage consultation messages" ON public.consultation_messages;
CREATE POLICY "Clinical staff manage consultation messages" ON public.consultation_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff')
    )
  );

-- Patient Policy: Patients can view messages for their linked patient profile
DROP POLICY IF EXISTS "Patients view their own consultation messages" ON public.consultation_messages;
CREATE POLICY "Patients view their own consultation messages" ON public.consultation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE public.patients.id = public.consultation_messages.patient_id 
      AND public.patients.account_id = auth.uid()
    ) OR sender_id = auth.uid()
  );

-- Patient Policy: Patients can insert messages for their linked patient profile
DROP POLICY IF EXISTS "Patients insert their own consultation messages" ON public.consultation_messages;
CREATE POLICY "Patients insert their own consultation messages" ON public.consultation_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE public.patients.id = public.consultation_messages.patient_id 
      AND public.patients.account_id = auth.uid()
    ) OR sender_id = auth.uid()
  );

-- 5. Enable Supabase Realtime publication for consultation_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'consultation_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;
  END IF;
END $$;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
