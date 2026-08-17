-- Add hero_image_right_url to clinic_settings for the dual-image hero layout
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS hero_image_right_url text DEFAULT NULL;
