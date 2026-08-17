-- Ensure storage buckets exist and are public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('clinic-assets', 'clinic-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']),
  ('patient-records', 'patient-records', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760;

-- Storage policies for clinic-assets
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access clinic-assets'
  ) THEN
    CREATE POLICY "Public Access clinic-assets" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow upload clinic-assets'
  ) THEN
    CREATE POLICY "Allow upload clinic-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clinic-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow update clinic-assets'
  ) THEN
    CREATE POLICY "Allow update clinic-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'clinic-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow delete clinic-assets'
  ) THEN
    CREATE POLICY "Allow delete clinic-assets" ON storage.objects FOR DELETE USING (bucket_id = 'clinic-assets');
  END IF;
END $$;

-- Storage policies for patient-records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access patient-records'
  ) THEN
    CREATE POLICY "Public Access patient-records" ON storage.objects FOR SELECT USING (bucket_id = 'patient-records');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow upload patient-records'
  ) THEN
    CREATE POLICY "Allow upload patient-records" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patient-records');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow update patient-records'
  ) THEN
    CREATE POLICY "Allow update patient-records" ON storage.objects FOR UPDATE USING (bucket_id = 'patient-records');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow delete patient-records'
  ) THEN
    CREATE POLICY "Allow delete patient-records" ON storage.objects FOR DELETE USING (bucket_id = 'patient-records');
  END IF;
END $$;
