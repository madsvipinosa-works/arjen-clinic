-- Disable RLS initially for MVP logic
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text check (role in ('patient', 'staff', 'admin')) default 'patient',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users disable row level security;

-- Function to handle new user insertion from auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'patient');
  return new;
end;
$$;

-- Trigger to run when a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
