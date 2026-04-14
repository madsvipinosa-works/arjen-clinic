-- Add granular time slots table
create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  max_capacity integer not null default 10,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add weekend blocking flag to global settings
alter table public.clinic_settings add column if not exists block_weekends boolean default false;

-- Seed sensible default clinical time slots
insert into public.time_slots (label, max_capacity, sort_order) values 
  ('7:30 AM - 8:30 AM',   10, 1),
  ('8:30 AM - 9:30 AM',   10, 2),
  ('9:30 AM - 10:30 AM',  10, 3),
  ('10:30 AM - 11:30 AM', 10, 4),
  ('1:00 PM - 2:00 PM',   10, 5),
  ('2:00 PM - 3:00 PM',   10, 6),
  ('3:00 PM - 4:00 PM',   10, 7);

-- Disable RLS
alter table public.time_slots disable row level security;
