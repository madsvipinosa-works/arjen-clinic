-- Add block_saturday and block_sunday columns to clinic_settings
alter table public.clinic_settings
  add column if not exists block_saturday boolean default false,
  add column if not exists block_sunday   boolean default false;
