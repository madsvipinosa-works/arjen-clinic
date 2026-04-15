-- Phase 3: Messaging System for Online Consultation
create table if not exists public.consultation_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  sender_role text check (sender_role in ('patient', 'staff')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CRITICAL MVP RULE: Disable RLS to allow direct server bypass logic
alter table public.consultation_messages disable row level security;
