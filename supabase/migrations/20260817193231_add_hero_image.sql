-- Add hero_image_url column to clinic_settings for admin-editable hero photo
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT NULL;
