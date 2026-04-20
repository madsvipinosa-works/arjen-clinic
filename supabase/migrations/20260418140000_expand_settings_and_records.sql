-- Expand Clinic Settings for Profile and Services
alter table public.clinic_settings 
add column if not exists clinic_name text default 'AR-JEN Maternity and Lying-In Clinic',
add column if not exists clinic_address text default 'Dasmariñas City, Cavite',
add column if not exists clinic_contact text default '0912-345-6789',
add column if not exists services jsonb default '[
  {"id": "prenatal", "label": "Prenatal Check-up", "desc": "Routine monitoring for you and your baby"},
  {"id": "delivery", "label": "Safe Delivery", "desc": "Request lying-in delivery space"},
  {"id": "family", "label": "Family Planning", "desc": "Contraception and family counseling"},
  {"id": "general", "label": "General Consult", "desc": "Standard checkups and prescriptions"}
]'::jsonb;

-- Ensure prenatal_records can handle truly dynamic modular data
alter table public.prenatal_records 
add column if not exists modular_data jsonb default '{}'::jsonb;
