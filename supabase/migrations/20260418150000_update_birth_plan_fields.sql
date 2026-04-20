-- Update Birth Plan table with fields from manual forms
alter table public.birth_plans 
add column if not exists transportation text,
add column if not exists companion_name text,
add column if not exists is_philhealth_member text,
add column if not exists payment_method text,
add column if not exists emergency_name text,
add column if not exists emergency_contact text,
add column if not exists backup_hospital_type text,
add column if not exists blood_donor_contact text;
