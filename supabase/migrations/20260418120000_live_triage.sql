-- Phase 4: Live Triage & Queue System
alter table public.appointments add column if not exists triage_status text default 'Waiting' 
check (triage_status in ('Waiting', 'Vital Signs', 'Consultation', 'Discharged'));

-- Create an index for faster queue lookups
create index if not exists idx_appointments_triage_status on public.appointments(triage_status);
create index if not exists idx_appointments_date_status on public.appointments(appointment_date, status);
