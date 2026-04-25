-- Phase 1A: Expand patients table with missing demographic and clinical columns
alter table public.patients
  add column if not exists address          text,
  add column if not exists blood_type       text,
  add column if not exists civil_status     text,
  add column if not exists husband_partner_name text,
  add column if not exists date_of_birth    date,
  add column if not exists lmp              date,   -- Last Menstrual Period
  add column if not exists edc              date;   -- Estimated Date of Confinement
