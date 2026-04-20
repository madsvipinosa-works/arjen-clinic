-- Phase 5: File Uploads & Lab Results
create table if not exists public.patient_attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text,
  category text default 'Lab Result',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS
alter table public.patient_attachments disable row level security;
