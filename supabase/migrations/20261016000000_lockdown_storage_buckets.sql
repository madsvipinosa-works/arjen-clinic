-- Migration: 20261016000000_lockdown_storage_buckets.sql
-- Module: Security Hardening & Storage Access Lockdown
-- Compliance: Republic Act No. 10173 (Philippine Data Privacy Act of 2012)
-- Closes Security Finding 1: Patient records publicly readable from Supabase Storage

-- 1. Ensure patient-records bucket is strictly PRIVATE
UPDATE storage.buckets 
SET public = false,
    file_size_limit = 10485760, -- 10 MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'patient-records';

-- 2. Drop all insecure, overly permissive storage policies on patient-records
DROP POLICY IF EXISTS "Public Access patient-records" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload patient-records" ON storage.objects;
DROP POLICY IF EXISTS "Allow update patient-records" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete patient-records" ON storage.objects;

-- 3. Strict Staff Policy: Clinical staff (Admin, Doctor, Midwife, Nurse, Staff) have authorized access
DROP POLICY IF EXISTS "Staff manage patient records storage" ON storage.objects;
CREATE POLICY "Staff manage patient records storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'patient-records' AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff')
    )
  );

-- 4. Strict Patient Policy: Authenticated patients can only access documents in their own subfolder
-- Files are stored under: patient-records/<patient_id>/<filename>
DROP POLICY IF EXISTS "Patients view own records storage" ON storage.objects;
CREATE POLICY "Patients view own records storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'patient-records' AND
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE public.patients.account_id = auth.uid()
      AND public.patients.id::text = (storage.foldername(name))[1]
    )
  );

-- 5. Add structured file_path column to public.patient_attachments if not present
ALTER TABLE public.patient_attachments
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 6. Backfill file_path from legacy file_url strings
UPDATE public.patient_attachments
SET file_path = CASE 
  WHEN file_url LIKE '%/patient-records/%' THEN split_part(file_url, '/patient-records/', 2)
  ELSE file_name
END
WHERE file_path IS NULL;

-- 7. Enable RLS on patient_attachments table for defense-in-depth
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage all patient attachments" ON public.patient_attachments;
CREATE POLICY "Staff manage all patient attachments" ON public.patient_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff')
    )
  );

DROP POLICY IF EXISTS "Patients view own attachments" ON public.patient_attachments;
CREATE POLICY "Patients view own attachments" ON public.patient_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE public.patients.account_id = auth.uid()
      AND public.patients.id = patient_attachments.patient_id
    )
  );

NOTIFY pgrst, 'reload schema';
