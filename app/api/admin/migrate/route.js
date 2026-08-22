// app/api/admin/migrate/route.js
// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME MIGRATION RUNNER
// Executes all pending SQL migrations against the live Supabase database.
// Uses the Supabase Management API with the service_role key.
//
// HOW TO USE:
//   1. Go to https://supabase.com/dashboard/account/tokens
//   2. Click "Generate new token" — name it "Migration Runner"
//   3. Copy the token and add to .env.local:
//      SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
//   4. Restart your dev server (Ctrl+C → npm run dev)
//   5. Visit http://localhost:3000/api/admin/migrate
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN; // Personal Access Token (PAT)

// Extract project ref from URL: https://vigqhnvaoszcffqvqmsg.supabase.co → vigqhnvaoszcffqvqmsg
const PROJECT_REF   = SUPABASE_URL?.replace('https://', '').split('.')[0];

// All pending migrations in chronological order
const MIGRATIONS = [
  {
    name: '20260420100000_core_users_trigger',
    sql: `
      -- Create public.users table for RBAC
      create table if not exists public.users (
        id uuid references auth.users on delete cascade not null primary key,
        email text,
        role text check (role in ('patient', 'staff', 'admin')) default 'patient',
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );

      alter table public.users disable row level security;

      -- Trigger function: auto-create a users row when auth.users gets a new entry
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer set search_path = public
      as $$
      begin
        insert into public.users (id, email, role)
        values (new.id, new.email, 'patient')
        on conflict (id) do nothing;
        return new;
      end;
      $$;

      -- Drop and recreate trigger to avoid duplicate
      drop trigger if exists on_auth_user_created on auth.users;
      create trigger on_auth_user_created
        after insert on auth.users
        for each row execute procedure public.handle_new_user();
    `,
  },
  {
    name: '20260424100000_expand_patient_schema',
    sql: `
      -- Add missing demographic and clinical columns to patients table
      alter table public.patients
        add column if not exists address              text,
        add column if not exists blood_type           text,
        add column if not exists civil_status         text,
        add column if not exists husband_partner_name text,
        add column if not exists date_of_birth        date,
        add column if not exists lmp                  date,
        add column if not exists edc                  date;
    `,
  },
  {
    name: '20260418140000_expand_settings_and_records',
    sql: `
      -- Add modular_data to prenatal_records if not present
      alter table public.prenatal_records
        add column if not exists modular_data jsonb default '{}'::jsonb;

      -- Add clinic settings columns if not present
      alter table public.clinic_settings
        add column if not exists clinic_name    text default 'AR-JEN Maternity and Lying-In Clinic',
        add column if not exists clinic_address text default 'Dasmariñas City, Cavite',
        add column if not exists clinic_contact text default '0912-345-6789',
        add column if not exists services       jsonb default '[
          {"id": "prenatal",  "label": "Prenatal Check-up",  "desc": "Routine monitoring for you and your baby"},
          {"id": "delivery",  "label": "Safe Delivery",      "desc": "Request lying-in delivery space"},
          {"id": "family",    "label": "Family Planning",    "desc": "Contraception and family counseling"},
          {"id": "general",   "label": "General Consult",    "desc": "Standard checkups and prescriptions"}
        ]'::jsonb;
    `,
  },
  {
    name: '20260418150000_update_birth_plan_fields',
    sql: `
      alter table public.birth_plans
        add column if not exists transportation       text,
        add column if not exists companion_name       text,
        add column if not exists is_philhealth_member text,
        add column if not exists payment_method       text,
        add column if not exists emergency_name       text,
        add column if not exists emergency_contact    text,
        add column if not exists backup_hospital_type text,
        add column if not exists blood_donor_contact  text;
    `,
  },
  {
    name: '20260415230000_messaging_system',
    sql: `
      create table if not exists public.consultation_messages (
        id          uuid primary key default gen_random_uuid(),
        patient_id  uuid references public.patients(id) on delete cascade not null,
        sender_id   uuid references auth.users(id) on delete cascade not null,
        sender_role text check (sender_role in ('patient', 'staff')) not null,
        content     text not null,
        created_at  timestamp with time zone default timezone('utc'::text, now()) not null
      );
      alter table public.consultation_messages disable row level security;
    `,
  },
  {
    name: '20260418130000_file_uploads',
    sql: `
      create table if not exists public.patient_attachments (
        id         uuid primary key default gen_random_uuid(),
        patient_id uuid references public.patients(id) on delete cascade not null,
        file_name  text not null,
        file_url   text not null,
        file_type  text,
        category   text default 'Lab Result',
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );
      alter table public.patient_attachments disable row level security;
    `,
  },
  {
    name: '20260425000000_backfill_prenatal_records',
    sql: `
      -- Ensure prenatal_records has a unique constraint on patient_id for upsert to work
      alter table public.prenatal_records
        drop constraint if exists prenatal_records_patient_id_key;
      alter table public.prenatal_records
        add constraint prenatal_records_patient_id_key unique (patient_id);

      -- Backfill: create a prenatal_records row for every patient that doesn't have one yet
      insert into public.prenatal_records (patient_id, modular_data)
      select p.id, '{}'::jsonb
      from public.patients p
      where not exists (
        select 1 from public.prenatal_records pr where pr.patient_id = p.id
      );
    `,
  },
  {
    name: '20260425100000_improve_clinical_forms',
    sql: `
      -- Birth plan: add companion_type, is_philhealth_facility, philhealth_number
      alter table public.birth_plans
        add column if not exists companion_type         text,
        add column if not exists is_philhealth_facility text,
        add column if not exists philhealth_number      text,
        add column if not exists companion_family_name  text;

      -- Visit logs: add all clinical columns from the prenatal record paper form
      alter table public.visit_logs
        add column if not exists aog_by_lmp text,
        add column if not exists aog_by_utz text,
        add column if not exists temp        text,
        add column if not exists pr          text,
        add column if not exists rr          text,
        add column if not exists fh          text,
        add column if not exists fht         text,
        add column if not exists ie          text,
        add column if not exists next_visit  date;
    `,
  },
  {
    name: '20260822020000_add_favicon_url',
    sql: `
      alter table public.clinic_settings
        add column if not exists favicon_url text;
    `,
  },
  {
    name: '20260822030000_clinical_record_exports',
    sql: `
      create table if not exists public.clinical_record_exports (
        id uuid primary key default gen_random_uuid(),
        patient_id uuid not null references public.patients(id) on delete cascade,
        exported_by uuid not null references auth.users(id),
        export_type text not null default 'PRINT_SUMMARY',
        metadata jsonb default '{}'::jsonb,
        created_at timestamptz not null default timezone('utc'::text, now())
      );

      alter table public.clinical_record_exports enable row level security;

      drop policy if exists "Staff can view all clinical exports" on public.clinical_record_exports;
      create policy "Staff can view all clinical exports" on public.clinical_record_exports
        for select using (
          exists (
            select 1 from public.users where public.users.id = auth.uid() and public.users.role in ('admin', 'staff')
          )
        );

      drop policy if exists "Staff can insert clinical exports" on public.clinical_record_exports;
      create policy "Staff can insert clinical exports" on public.clinical_record_exports
        for insert with check (
          exists (
            select 1 from public.users where public.users.id = auth.uid() and public.users.role in ('admin', 'staff')
          )
        );

      drop policy if exists "Patients view own clinical exports" on public.clinical_record_exports;
      create policy "Patients view own clinical exports" on public.clinical_record_exports
        for select using (
          exists (
            select 1 from public.patients where public.patients.id = patient_id and public.patients.account_id = auth.uid()
          )
        );

      drop policy if exists "Patients insert own clinical exports" on public.clinical_record_exports;
      create policy "Patients insert own clinical exports" on public.clinical_record_exports
        for insert with check (
          exists (
            select 1 from public.patients where public.patients.id = patient_id and public.patients.account_id = auth.uid()
          )
        );
    `,
  },
];

async function runSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { success: false, error: body };
  }

  return { success: true };
}

export async function GET() {
  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'paste_your_access_token_here') {
    return NextResponse.json(
      {
        error: 'SUPABASE_ACCESS_TOKEN is not set in .env.local',
        instructions: [
          '1. Go to → https://supabase.com/dashboard/account/tokens',
          '2. Click "Generate new token" and name it "Migration Runner"',
          '3. Copy the token (starts with sbp_...)',
          '4. Add to .env.local:  SUPABASE_ACCESS_TOKEN=sbp_your_token',
          '5. Restart dev server: Ctrl+C then npm run dev',
          '6. Visit this endpoint again',
        ],
      },
      { status: 500 }
    );
  }

  const results = [];

  for (const migration of MIGRATIONS) {
    console.log(`[migrate] Running: ${migration.name}`);
    const result = await runSQL(migration.sql);
    results.push({ migration: migration.name, ...result });

    if (!result.success) {
      console.error(`[migrate] FAILED: ${migration.name} →`, result.error);
    } else {
      console.log(`[migrate] ✅ OK: ${migration.name}`);
    }
  }

  const passed = results.filter((r) => r.success).length;
  const allPassed = passed === results.length;

  return NextResponse.json(
    {
      status:   allPassed ? '✅ ALL MIGRATIONS COMPLETE' : '⚠️ SOME MIGRATIONS FAILED',
      summary:  `${passed}/${results.length} migrations succeeded`,
      results,
    },
    { status: allPassed ? 200 : 207 }
  );
}
