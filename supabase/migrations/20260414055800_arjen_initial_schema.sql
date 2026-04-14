create table public.patients (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text not null,
  age integer,
  contact_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  service_type text not null,
  appointment_date date not null,
  status text default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.prenatal_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  health_history jsonb,
  lab_results jsonb
);

create table public.birth_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  delivery_location text,
  birth_attendant text
);

create table public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  visit_date date not null,
  bp text,
  weight text,
  doctor_notes text
);

-- CRITICAL MVP RULE: Disable RLS on all custom tables to allow unobstructed data flow
alter table public.patients disable row level security;
alter table public.appointments disable row level security;
alter table public.prenatal_records disable row level security;
alter table public.birth_plans disable row level security;
alter table public.visit_logs disable row level security;
