-- Add favicon_url to clinic_settings for custom website browser icon
alter table public.clinic_settings
add column if not exists favicon_url text;
