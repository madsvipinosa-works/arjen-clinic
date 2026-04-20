-- Admin authentication table
create table public.admin_credentials (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create default admin account (password: admin123)
insert into public.admin_credentials (username, password_hash, email)
values (
  'admin',
  '$2b$10$rQZ8ZKZKZKZKZKZKZKZKZOZKZKZKZKZKZKZKZKZKZKZKZKZKZKZKZKZKZKZK',
  'admin@arjen-clinic.com'
);

-- Disable RLS for admin credentials
alter table public.admin_credentials disable row level security;
