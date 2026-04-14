create table public.clinic_settings (
  id integer primary key default 1,
  max_morning_slots integer default 10,
  max_afternoon_slots integer default 10,
  is_active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert the unified configuration row immediately
insert into public.clinic_settings (id, max_morning_slots, max_afternoon_slots) values (1, 10, 10) on conflict (id) do nothing;

-- Disable RLS to allow direct server bypass logic per project specifications
alter table public.clinic_settings disable row level security;
alter table public.blocked_dates disable row level security;
