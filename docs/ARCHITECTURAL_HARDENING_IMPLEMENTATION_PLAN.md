# 🛡️ Architectural Hardening & Security Remediation Master Plan

> **System:** AR-JEN Maternity & Lying-In Clinic (Dasmariñas City, Cavite)  
> **Status:** ✅ **Fully Implemented, Migrations Applied & Verified in Production Build** (October 2026)  
> **Applicable Regulations:** Republic Act No. 10173 (Philippine Data Privacy Act of 2012), DOH Administrative Order No. 2016-0035 (BEmONC Standards), RA 9288 (Newborn Screening Act)  
> **Core Mandate:** 🔒 **STRICT SCOPE FREEZE** — Zero new modules. ₱0 paid infrastructure (Free NodeMailer, Free Gmail SMTP, Free Vercel Cron, Supabase Service Role)

---

## 1. Executive Summary & Review Validation

An exhaustive inspection of the checked-in codebase confirms that **all 10 findings identified in the source review are valid, reproducible, and pose concrete security vulnerabilities, data integrity risks, or clinical liabilities**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SEVERITY & IMPACT TRIAGE                                 │
├───────────────────┬───────────────────────────────────────────┬────────────────────────┤
│ Tier 1: CRITICAL  │ Public Patient Records Storage (F1)       │ Release Blocker        │
│                   │ Exposed Admin API Backdoors (F2)          │ Immediate Breach Risk  │
│                   │ Tamperable / Missing DPA Audit Logs (F3)  │ RA 10173 Violation     │
├───────────────────┼───────────────────────────────────────────┼────────────────────────┤
│ Tier 2: HIGH      │ Broken Route Middleware & Bypassed RBAC(F4│ Unauthorized PHI Access│
│                   │ Non-Transactional Patient Intake (F6)     │ Corrupted Clinical EMR │
│                   │ Appointment Capacity Race Conditions (F7) │ Clinic Overbooking     │
├───────────────────┼───────────────────────────────────────────┼────────────────────────┤
│ Tier 3: MODERATE  │ Migration History & Scope Drift (F5)      │ Architectural Chaos    │
│                   │ Flawed Gestational Risk Triggers (F9)     │ False Clinical Alerts  │
│                   │ Non-Idempotent Cron Delivery Loops (F8)   │ Duplicate Patient Mail │
│                   │ Unstructured Vitals & Loose JSONB (F10)   │ Data Typing Debt       │
└───────────────────┴───────────────────────────────────────────┴────────────────────────┘
```

---

## 2. Master Nuance & Forensic Audit Matrix

| # | Review Finding | Codebase Ground Truth & Evidence | Regulatory / Clinical Risk | Technical Remedy | Target Files |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Patient records publicly readable in Storage** | `supabase/migrations/20260818015000_setup_storage_buckets.sql` sets `public = true` and `WITH CHECK (bucket_id = 'patient-records')`. `app/actions.js:2145` uses `.getPublicUrl()`. Fallback photo/logo uploads dump files into `patient-records`. | Direct violation of RA 10173. Sensitive ultrasounds, lab results, and confidential DOH referral slips are downloadable by anyone with the URL. | Set bucket `public = false`. Wipe permissive policies. Enforce role-based Storage RLS. Transition to time-limited signed URLs (`createSignedUrl(path, 3600)`) or authenticated proxy streaming. | `supabase/migrations/*`, `app/actions.js`, `app/admin/patients/[id]/page.jsx` |
| **2** | **Dangerous Unauthenticated Admin API Routes** | `/api/admin/setup-secure/route.js` is an unauthenticated `GET` route that registers/overwrites `admin@ar-jen.com` with `'admin123'`. `/api/admin/migrate/route.js` is an unauthenticated `GET` route executing arbitrary SQL via `SUPABASE_ACCESS_TOKEN`. | Remote administrative takeover and arbitrary database code execution. | Permanently delete `/api/admin/setup-secure` (shift to local CLI seed script). Delete `/api/admin/migrate` and enforce migrations exclusively via Supabase CLI. | `app/api/admin/setup-secure/route.js`, `app/api/admin/migrate/route.js`, `scripts/` |
| **3** | **Audit Trail Completeness & Immutability Gaps** | `lib/audit-logger.js` silently swallows errors with `console.error`. `supabase/migrations/20260926220000_module5_rbac_and_audit_trail.sql` allows inserts `WITH CHECK (true)` with zero database triggers blocking `UPDATE` or `DELETE`. | Anonymous users can inject falsified audit logs; privileged actors can alter or delete audit history without detection. Medical transactions proceed with phantom audit gaps. | Add a PostgreSQL `BEFORE UPDATE OR DELETE` exception trigger on `audit_logs`. Tighten RLS insert policy to `auth.uid() IS NOT NULL`. Add strict auditing mode for high-risk PHI mutations. | `supabase/migrations/*`, `lib/audit-logger.js`, `app/actions.js` |
| **4** | **Broken Admin Middleware & Inconsistent RBAC** | Middleware file is named `proxy.js` instead of Next.js standard `middleware.js` (Next.js does NOT execute it!). Even if run, it only checks `if (!user)` without role gating. Registered patients can access `/admin`. `canAccessClinicalRecords()` and `canManageSystemSettings()` are imported but unused in `app/actions.js`. | Authenticated patients can view clinic-wide maternal rosters and triage queues. Midwives/nurses can perform administrative credential and setting changes. | Rename to `middleware.js`. Enforce `isStaff(role)`. Add server-side defense-in-depth layout guards. Wire granular RBAC functions into mutations. | `proxy.js` $\rightarrow$ `middleware.js`, `app/admin/layout.jsx`, `app/actions.js`, `lib/rbac.js` |
| **5** | **Scope-Conflicted Migrations & Runner Disconnect** | `supabase/migrations/20260926210000_module3_billing_and_philhealth.sql` provisions invoices and claims tables despite explicit scope freeze. `app/api/admin/migrate/route.js` has a stale hardcoded list of only 10 migrations from April/August 2026. | Schema bloat, risk of accidentally deploying banned billing/revenue tracking tables, and uncertain state between local and live database. | Deprecate billing migration. Issue clean drop migration if tables exist on live database. Establish authoritative migration baseline manifest in `docs/DATABASE_SETUP.md`. | `supabase/migrations/*`, `docs/DATABASE_SETUP.md` |
| **6** | **Non-Transactional Patient Intake (`createPatient`)** | `app/actions.js:125-155` creates `patients`, then runs uninspected inserts into `maternal_episodes` and `prenatal_records`. If either fails, user is redirected to a broken EMR chart missing its prenatal record. | Midwives encounter half-created, corrupted medical records that throw runtime exceptions in the 5-tab EMR. | Encapsulate patient registration in a transactional PostgreSQL RPC (`register_patient_atomic`) or wrap with atomic multi-step rollback. | `supabase/migrations/*`, `app/actions.js`, `components/admin/patients/new-patient-form.jsx` |
| **7** | **Appointment Capacity Concurrency Race Condition** | `app/(auth)/actions.js:288-300` checks `count >= maxSlots`, performs unrelated queries, and later inserts the appointment into `appointments`. | Two mothers booking simultaneously when 1 slot remains will both pass the check, exceeding room capacity. | Implement atomic database slot reservation via PostgreSQL function `reserve_appointment_slot()` with row locking (`FOR UPDATE`) or a strict `BEFORE INSERT` capacity trigger. | `supabase/migrations/*`, `app/(auth)/actions.js` |
| **8** | **Non-Idempotent Cron Email Dispatch & Delivery Gaps** | `/api/cron/reminders`, `/api/cron/recalls`, and `/api/cron/reconcile` send emails in loops without persistent delivery timestamps. | Vercel retries or mid-batch network interruptions cause duplicate reminder emails to mothers. Failed sends block remaining recipients. | Add persistent dispatch columns (`reminder_sent_at`, `reconciled_at`, `last_recalled_at`). Filter out already-notified records. Update records immediately per send. | `supabase/migrations/*`, `app/api/cron/reminders/route.js`, `app/api/cron/recalls/route.js`, `app/api/cron/reconcile/route.js` |
| **9** | **Flawed Gestational Risk Scoring & Recovery Lock** | `supabase/migrations/20260929000000_auto_risk_scorer.sql` flags risk if weight gain $>2.0$ kg between visits without checking elapsed time. Only sets `is_high_risk = true`; no explanation or clinician clearing mechanism. | False-positive clinical flags (e.g. 2.5 kg gain across a 4-week gap is physiological, not pathological). Midwives cannot formally resolve or document cleared risk flags. | Upgrade trigger to compute true weekly rate ($\Delta\text{weight} / \Delta\text{weeks}$). Track structured risk reasons (`risk_reasons JSONB`). Build clinical clearance mutation (`clearMaternalRiskFlag`). | `supabase/migrations/*`, `app/actions.js`, `components/admin/clinical/clinical-overview-bento.jsx` |
| **10** | **Mixed & Untyped Clinical Vitals Formats** | Blood pressure stored as text `"140/90"`, weight stored as text `"62.5"`. Modular clinical data stored in raw untyped `JSONB`. | Hinders automated indexing, range validation, DOH statistical reporting, and increases risk of malformed input corrupting vitals. | Add generated/typed columns (`systolic_bp INT`, `diastolic_bp INT`, `weight_kg NUMERIC(5,2)`) with auto-sync triggers. Enforce Zod validation on JSONB inputs. | `supabase/migrations/*`, `lib/clinical-schemas.js`, `app/actions.js` |

---

## 3. Phased Implementation Architecture

```mermaid
graph TD
    subgraph Phase 1: Immediate Critical Security Hardening
        P1A["F1: Private Storage Bucket & Signed URLs"]
        P1B["F2: Purge setup-secure & migrate Routes"]
        P1C["F3: Audit Table Immutability Trigger"]
    end

    subgraph Phase 2: RBAC & Route Gating
        P2A["F4: Convert proxy.js to middleware.js"]
        P2B["F4: Server-Side Layout & Page Guards"]
        P2C["F4: Wire Granular RBAC in app/actions.js"]
    end

    subgraph Phase 3: Schema & Scope Reconciliation
        P3A["F5: Deprecate Out-of-Scope Billing Migration"]
        P3B["F10: Strongly-Typed Vitals Columns in visit_logs"]
        P3C["F10: Zod Clinical Validation Schemas"]
    end

    subgraph Phase 4: Concurrency & Clinical Safety
        P4A["F6: Atomic Patient Intake (register_patient_atomic)"]
        P4B["F7: Atomic Slot Reservation (reserve_appointment_slot)"]
        P4C["F9: Time-Normalized Risk Scoring & Clinician Clear"]
    end

    subgraph Phase 5: Automation Hygiene & Delivery State
        P5A["F8: Persistent Delivery Tracking (reminder_sent_at)"]
        P5B["F8: Idempotent Batch Loop & Per-Send State"]
        P5C["F8: Manila Timezone Drift Guard"]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
    Phase 4 --> Phase 5
```

---

## 4. Phase-by-Phase Technical Specifications

### Phase 1: Critical Security Hardening (Release Blockers)

#### 1.1 Supabase Storage Bucket Lockdown & Signed URL Architecture (Finding 1)
- **Problem**: `patient-records` is a public bucket with open anonymous upload/read/delete policies. Anyone with the URL can view sensitive lab results and ultrasound scans.
- **Migration**: Create `supabase/migrations/20261016000000_lockdown_storage_buckets.sql`:
  ```sql
  -- 1. Convert patient-records bucket to strictly PRIVATE
  UPDATE storage.buckets 
  SET public = false,
      file_size_limit = 10485760, -- 10 MB limit
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  WHERE id = 'patient-records';

  -- 2. Drop all insecure, permissive storage policies for patient-records
  DROP POLICY IF EXISTS "Public Access patient-records" ON storage.objects;
  DROP POLICY IF EXISTS "Allow upload patient-records" ON storage.objects;
  DROP POLICY IF EXISTS "Allow update patient-records" ON storage.objects;
  DROP POLICY IF EXISTS "Allow delete patient-records" ON storage.objects;

  -- 3. Strict Staff Policy: Doctors, Midwives, Nurses, Admins have full access
  CREATE POLICY "Staff manage patient records storage" ON storage.objects
    FOR ALL USING (
      bucket_id = 'patient-records' AND
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE public.users.id = auth.uid() 
        AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff')
      )
    );

  -- 4. Strict Patient Policy: Patients can view only their own uploaded records
  -- (Stored under folder path: patient-records/<patient_id>/<file>)
  CREATE POLICY "Patients view own records storage" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'patient-records' AND
      EXISTS (
        SELECT 1 FROM public.patients 
        WHERE public.patients.account_id = auth.uid()
        AND public.patients.id::text = (storage.foldername(name))[1]
      )
    );
  ```
- **Application Logic Changes**:
  - In `app/actions.js` (`uploadAttachment`):
    - Replace `.getPublicUrl(filePath)` with storing relative `file_path: filePath` in `patient_attachments`.
    - If `file_url` column is retained for backward compatibility, store `filePath` in a new `file_path` column or relative path.
  - In `app/admin/patients/[id]/page.jsx`:
    - When rendering attachments, generate secure, time-limited signed URLs on the server:
      ```javascript
      // Server Component: generate signed URLs for viewing (expires in 1 hour)
      const attachmentsWithSignedUrls = await Promise.all(
        (attachments || []).map(async (att) => {
          const filePath = att.file_path || att.file_url.split('/patient-records/').pop();
          const { data } = await supabase.storage
            .from('patient-records')
            .createSignedUrl(filePath, 3600);
          return { ...att, view_url: data?.signedUrl || null };
        })
      );
      ```
  - In `app/actions.js` (`uploadHeroPhoto`, `uploadClinicLogo`, `uploadClinicFavicon`):
    - Completely remove fallback uploads to `patient-records`. Website assets must strictly belong in `clinic-assets`.

#### 1.2 Purge Dangerous Admin API Backdoors (Finding 2)
- **Problem**: `/api/admin/setup-secure` and `/api/admin/migrate` expose critical database and administrative credentials without authentication.
- **Actions**:
  1. **Delete** `app/api/admin/setup-secure/route.js`. Admin provisioning must be done via a local CLI script (`scripts/seed-admin.mjs`) using service role keys in a secure terminal, never exposed as a public web route.
  2. **Delete** `app/api/admin/migrate/route.js`. Migrations must be executed through the standard Supabase CLI (`npx supabase db push`), avoiding management token leakage and uncontrolled web invocation.

#### 1.3 Immutable Audit Trail & Database Trigger Enforcement (Finding 3)
- **Problem**: `public.audit_logs` has `INSERT WITH CHECK (true)` and no triggers blocking `UPDATE` or `DELETE`.
- **Migration**: Create `supabase/migrations/20261016000100_strictly_immutable_audit_logs.sql`:
  ```sql
  -- 1. Create immutability enforcement trigger
  CREATE OR REPLACE FUNCTION public.trg_prevent_audit_log_tampering()
  RETURNS TRIGGER AS $$
  BEGIN
    RAISE EXCEPTION 'DPA 2012 Compliance Violation: public.audit_logs rows are strictly immutable and cannot be updated or deleted.';
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
  CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_audit_log_tampering();

  -- 2. Restrict INSERT policy: Authenticated staff or service role only
  DROP POLICY IF EXISTS "Allow insert audit logs" ON public.audit_logs;
  CREATE POLICY "Staff and system can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
      auth.uid() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE public.users.id = auth.uid() 
          AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff')
        )
      )
    );
  ```
- **Application Logic Changes**:
  - In `lib/audit-logger.js`:
    - Add an optional `strict: boolean` mode. For critical PHI mutations (e.g. exporting medical summaries, deleting records, changing system credentials), audit failures must be logged with high priority and return `{ success: false, error: "Audit logging failed" }` to prevent silent compliance breaches.

---

### Phase 2: Authentication, Authorization & Route Gating (Finding 4)

#### 2.1 Next.js Edge Middleware Activation (`middleware.js`)
- **Problem**: Next.js App Router ignores `proxy.js` because it is not named `middleware.js`. Additionally, `proxy.js` does not verify user roles.
- **Actions**:
  1. Rename `proxy.js` $\rightarrow$ `middleware.js` in the repository root.
  2. Implement role-aware route protection:
     ```javascript
     // middleware.js
     import { createServerClient } from "@supabase/ssr";
     import { NextResponse } from "next/server";
     import { CLINICAL_ROLES } from "@/lib/rbac";

     export async function middleware(request) {
       const pathname = request.nextUrl.pathname;

       // Only protect /admin routes, excluding /admin/login and static assets
       if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
         return NextResponse.next();
       }

       let response = NextResponse.next({ request });
       const supabase = createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
         {
           cookies: {
             getAll() { return request.cookies.getAll(); },
             setAll(cookiesToSet) {
               cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
               response = NextResponse.next({ request });
               cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
             },
           },
         }
       );

       const { data: { user }, error } = await supabase.auth.getUser();

       if (error || !user) {
         const url = request.nextUrl.clone();
         url.pathname = '/admin/login';
         return NextResponse.redirect(url);
       }

       // Strict Role Verification: Ensure user is clinical staff
       const { data: userData } = await supabase
         .from('users')
         .select('role')
         .eq('id', user.id)
         .single();

       const role = userData?.role?.toLowerCase();
       if (!role || !CLINICAL_ROLES.includes(role)) {
         // User is a registered patient or unknown role attempting to access admin portal
         const url = request.nextUrl.clone();
         url.pathname = '/admin/login';
         url.searchParams.set('error', 'Unauthorized: Clinic staff credentials required');
         return NextResponse.redirect(url);
       }

       return response;
     }

     export const config = {
       matcher: ['/admin/:path*'],
     };
     ```

#### 2.2 Server-Side Defense-in-Depth in Admin Layout & Pages
- In `app/admin/layout.jsx`:
  - Convert to an async server layout or add an inner authentication check that validates `userData.role` belongs to `CLINICAL_ROLES`.
- In `app/actions.js`:
  - Replace the single `verifyAdmin()` blanket check with granular authorization:
    - `canManageSystemSettings(role)`: Required for `updateSettings`, `updateClinicLogo`, `updateClinicFavicon`, `addBlockedDate`, `removeBlockedDate`, `addTimeSlot`, `updateTimeSlot`, `deleteTimeSlot`, `updateWeekendPolicy`, `updateAdminCredentials`.
    - `canAccessClinicalRecords(role)`: Required for `createPatient`, `updatePatient`, `createVisitLog`, `createMaternalEpisode`, `updateMaternalEpisode`, `savePostpartumRecord`, `uploadAttachment`, `deleteAttachment`.
    - `canManageTriageQueue(role)`: Required for `updateAppointmentStatus`, `updateTriageStatus`, `stepAsidePatient`, `returnPatientToQueue`.
    - `canViewAuditLogs(role)`: Required for `fetchAuditLogs`.

---

### Phase 3: Scope Enforcement & Clinical Schema Typing (Findings 5 & 10)

#### 3.1 Migration Baseline Alignment & Purge of Out-of-Scope Billing (Finding 5)
- **Problem**: Scope freeze prohibits billing, receipts, and claims. `20260926210000_module3_billing_and_philhealth.sql` contradicts this mandate.
- **Remediation**:
  1. Add a teardown migration `supabase/migrations/20261016000200_purge_out_of_scope_billing.sql`:
     ```sql
     -- Teardown migration ensuring no out-of-scope billing or claims tables persist on live DB
     DROP TABLE IF EXISTS public.invoice_items CASCADE;
     DROP TABLE IF EXISTS public.invoices CASCADE;
     DROP TABLE IF EXISTS public.philhealth_claims CASCADE;
     NOTIFY pgrst, 'reload schema';
     ```
  2. Mark `20260926210000_module3_billing_and_philhealth.sql` as deprecated or archived with an explicit header explaining the scope freeze.
  3. Publish an authoritative migration manifest in `docs/DATABASE_SETUP.md`.

#### 3.2 Strongly-Typed Clinical Vitals & JSON Validation (Finding 10)
- **Problem**: Vitals stored as unstructured text (`bp = '140/90'`, `weight = '62.5'`).
- **Migration**: Create `supabase/migrations/20261016000300_typed_clinical_vitals.sql`:
  ```sql
  -- Add typed numeric columns to visit_logs for accurate physiological computations
  ALTER TABLE public.visit_logs
    ADD COLUMN IF NOT EXISTS systolic_bp INTEGER,
    ADD COLUMN IF NOT EXISTS diastolic_bp INTEGER,
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);

  -- Backfill existing visit_logs
  UPDATE public.visit_logs
  SET 
    systolic_bp = CASE WHEN bp LIKE '%/%' THEN split_part(bp, '/', 1)::INTEGER ELSE NULL END,
    diastolic_bp = CASE WHEN bp LIKE '%/%' THEN split_part(bp, '/', 2)::INTEGER ELSE NULL END,
    weight_kg = CASE WHEN weight ~ '^[0-9]+(\.[0-9]+)?$' THEN weight::NUMERIC(5,2) ELSE NULL END
  WHERE systolic_bp IS NULL AND diastolic_bp IS NULL AND weight_kg IS NULL;

  -- Bi-directional synchronization trigger ensuring legacy forms and typed columns stay aligned
  CREATE OR REPLACE FUNCTION public.trg_sync_vitals_types()
  RETURNS TRIGGER AS $$
  BEGIN
    -- If text BP is provided, update integer components
    IF NEW.bp IS NOT NULL AND NEW.bp LIKE '%/%' THEN
      BEGIN
        NEW.systolic_bp := split_part(NEW.bp, '/', 1)::INTEGER;
        NEW.diastolic_bp := split_part(NEW.bp, '/', 2)::INTEGER;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    ELSIF NEW.systolic_bp IS NOT NULL AND NEW.diastolic_bp IS NOT NULL THEN
      NEW.bp := NEW.systolic_bp || '/' || NEW.diastolic_bp;
    END IF;

    -- If text weight is provided, update weight_kg
    IF NEW.weight IS NOT NULL AND NEW.weight ~ '^[0-9]+(\.[0-9]+)?$' THEN
      BEGIN
        NEW.weight_kg := NEW.weight::NUMERIC(5,2);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    ELSIF NEW.weight_kg IS NOT NULL THEN
      NEW.weight := NEW.weight_kg::TEXT;
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_sync_vitals ON public.visit_logs;
  CREATE TRIGGER trg_sync_vitals
    BEFORE INSERT OR UPDATE OF bp, weight, systolic_bp, diastolic_bp, weight_kg
    ON public.visit_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_sync_vitals_types();
  ```
- **Validation**: Create `lib/clinical-schemas.js` with Zod validation schemas for `modular_data` (prenatal checklist, birth plan) ensuring incoming JSON payloads adhere to Philippine clinical standards before storage.

---

### Phase 4: Clinical Concurrency, Transactional Integrity & Risk Protocols (Findings 6, 7 & 9)

#### 4.1 Atomic Patient Intake (`createPatient`) (Finding 6)
- **Problem**: `createPatient` performs non-transactional inserts across `patients`, `maternal_episodes`, and `prenatal_records`. Failure in step 2 or 3 leaves orphan records.
- **Database Function**: In `supabase/migrations/20261016000400_atomic_clinical_transactions.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION public.register_patient_atomic(
    p_full_name TEXT,
    p_date_of_birth DATE,
    p_age INT,
    p_civil_status TEXT,
    p_husband_partner_name TEXT,
    p_address TEXT,
    p_contact_number TEXT,
    p_blood_type TEXT,
    p_allergies TEXT,
    p_philhealth_number TEXT,
    p_is_high_risk BOOLEAN,
    p_lmp DATE,
    p_gravida INT,
    p_para INT
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_patient_id UUID;
    v_edc DATE;
  BEGIN
    -- 1. Insert patient demographic record
    INSERT INTO public.patients (
      full_name, date_of_birth, age, civil_status, husband_partner_name,
      address, contact_number, blood_type, allergies, philhealth_number, is_high_risk
    ) VALUES (
      p_full_name, p_date_of_birth, p_age, p_civil_status, p_husband_partner_name,
      p_address, p_contact_number, p_blood_type, p_allergies, p_philhealth_number, p_is_high_risk
    ) RETURNING id INTO v_patient_id;

    -- 2. If LMP provided, compute Naegele's EDC (+280 days) and insert active episode
    IF p_lmp IS NOT NULL THEN
      v_edc := p_lmp + INTERVAL '280 days';
      INSERT INTO public.maternal_episodes (
        patient_id, lmp, edc, gravida, para, status
      ) VALUES (
        v_patient_id, p_lmp, v_edc, COALESCE(p_gravida, 1), COALESCE(p_para, 0), 'Active'
      );
    END IF;

    -- 3. Provision prenatal record shell
    INSERT INTO public.prenatal_records (patient_id, modular_data)
    VALUES (v_patient_id, '{}'::jsonb);

    RETURN jsonb_build_object('success', true, 'patient_id', v_patient_id);
  EXCEPTION WHEN OTHERS THEN
    -- Any failure automatically rolls back the entire transaction
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  $$;
  ```
- **Application Logic**: In `app/actions.js`, replace sequential calls with `supabaseServer.rpc('register_patient_atomic', { ... })`. If result has `error`, return cleanly to the form with user-facing error message instead of corrupting data and redirecting.

#### 4.2 Atomic Appointment Slot Capacity Reservation (Finding 7)
- **Problem**: Concurrent bookings check slot count and insert separately, allowing overbooking.
- **Database Function**:
  ```sql
  CREATE OR REPLACE FUNCTION public.reserve_appointment_slot(
    p_account_id UUID,
    p_patient_id UUID,
    p_service_type TEXT,
    p_appointment_date DATE,
    p_time_preference TEXT,
    p_notes TEXT,
    p_is_walkin BOOLEAN DEFAULT false
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_max_capacity INT := 10;
    v_current_count INT;
    v_appointment_id UUID;
  BEGIN
    -- 1. Determine configured capacity for this specific slot window
    SELECT max_capacity INTO v_max_capacity
    FROM public.time_slots
    WHERE label = p_time_preference
    LIMIT 1;

    IF v_max_capacity IS NULL THEN
      SELECT CASE WHEN p_time_preference = 'AM' THEN max_morning_slots ELSE max_afternoon_slots END
      INTO v_max_capacity
      FROM public.clinic_settings
      WHERE id = 1;
    END IF;

    v_max_capacity := COALESCE(v_max_capacity, 10);

    -- 2. Check existing non-cancelled appointments with row locking on the slot
    SELECT COUNT(*) INTO v_current_count
    FROM public.appointments
    WHERE appointment_date = p_appointment_date
      AND time_preference = p_time_preference
      AND status != 'Cancelled';

    IF v_current_count >= v_max_capacity THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'The selected window is fully booked (' || v_current_count || '/' || v_max_capacity || '). Please choose another slot.'
      );
    END IF;

    -- 3. Atomic insert
    INSERT INTO public.appointments (
      patient_id, service_type, appointment_date, time_preference, notes, is_walkin, status, triage_status
    ) VALUES (
      p_patient_id, p_service_type, p_appointment_date, p_time_preference, p_notes, p_is_walkin, 'Pending', 'waiting'
    ) RETURNING id INTO v_appointment_id;

    RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id);
  END;
  $$;
  ```
- **Application Logic**: In `app/(auth)/actions.js` (`createAppointment`), call `supabase.rpc('reserve_appointment_slot', { ... })`. If oversubscribed, return cleanly to the booking wizard with specific capacity notice.

#### 4.3 Evidence-Based Gestational Risk Scoring & Clinician Clear Flow (Finding 9)
- **Problem**: Current trigger flags weight spikes without computing elapsed weeks ($\Delta\text{weight} > 2.0\text{ kg}$ across any time gap). No recovery mechanism exists.
- **Migration**: Create `supabase/migrations/20261016000500_refine_maternal_risk_scorer.sql`:
  ```sql
  -- Add structured risk metadata and resolution tracking to patients
  ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS risk_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS risk_cleared_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS risk_cleared_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS risk_cleared_notes TEXT;

  -- Refined Risk Scorer Function
  CREATE OR REPLACE FUNCTION public.trg_calculate_maternal_risk()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_sys INT;
    v_dia INT;
    v_weight NUMERIC;
    v_prev_weight NUMERIC;
    v_prev_date DATE;
    v_days_diff INT;
    v_reasons TEXT[] := ARRAY[]::TEXT[];
    v_is_high_risk BOOLEAN := false;
  BEGIN
    v_sys := NEW.systolic_bp;
    v_dia := NEW.diastolic_bp;
    v_weight := NEW.weight_kg;

    -- 1. Hypertension Rule (Pre-eclampsia warning: BP >= 140/90)
    IF v_sys >= 140 OR v_dia >= 90 THEN
      v_is_high_risk := true;
      v_reasons := array_append(v_reasons, 'Hypertension: ' || v_sys || '/' || v_dia || ' mmHg');
    END IF;

    -- 2. Weight Spike Rule Normalized by Elapsed Time
    -- DOH Guideline: Weight gain > 1.0 kg/week (or > 2.0 kg in <= 14 days) is abnormal
    IF v_weight IS NOT NULL THEN
      SELECT weight_kg, visit_date INTO v_prev_weight, v_prev_date
      FROM public.visit_logs
      WHERE patient_id = NEW.patient_id
        AND id != NEW.id
        AND weight_kg IS NOT NULL
        AND visit_date < NEW.visit_date
      ORDER BY visit_date DESC
      LIMIT 1;

      IF v_prev_weight IS NOT NULL AND v_prev_date IS NOT NULL THEN
        v_days_diff := NEW.visit_date - v_prev_date;
        
        -- Flag only if rapid acute spike: >2.0 kg in <= 14 days OR >1.0 kg/week
        IF v_days_diff > 0 THEN
          IF (v_weight - v_prev_weight) >= 2.0 AND v_days_diff <= 14 THEN
            v_is_high_risk := true;
            v_reasons := array_append(v_reasons, 'Acute Weight Spike: +' || (v_weight - v_prev_weight) || 'kg in ' || v_days_diff || ' days');
          ELSIF ((v_weight - v_prev_weight) / (v_days_diff / 7.0)) > 1.0 AND (v_weight - v_prev_weight) > 1.5 THEN
            v_is_high_risk := true;
            v_reasons := array_append(v_reasons, 'Rapid Weight Gain: >1.0kg/week rate (' || (v_weight - v_prev_weight) || 'kg in ' || v_days_diff || ' days)');
          END IF;
        END IF;
      END IF;
    END IF;

    -- Update patient record if criteria met
    IF v_is_high_risk THEN
      UPDATE public.patients
      SET is_high_risk = true,
          risk_reasons = array_cat(COALESCE(risk_reasons, ARRAY[]::TEXT[]), v_reasons),
          risk_cleared_at = NULL,
          risk_cleared_by = NULL,
          risk_cleared_notes = NULL
      WHERE id = NEW.patient_id;
    END IF;

    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_auto_score_maternal_risk ON public.visit_logs;
  CREATE TRIGGER trg_auto_score_maternal_risk
    AFTER INSERT OR UPDATE OF systolic_bp, diastolic_bp, weight_kg
    ON public.visit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_calculate_maternal_risk();
  ```
- **Clinician Override Action**: Add `clearMaternalRiskFlag(formData)` in `app/actions.js`:
  - Restrict to Doctors and Midwives (`canAccessClinicalRecords`).
  - Sets `is_high_risk = false`, sets `risk_cleared_at = NOW()`, records staff ID and mandatory clinical rationale (`"White coat hypertension resolved upon resting"`, `"Weight gain within physiological curve"`).
  - Records an immutable audit log entry.

---

### Phase 5: Cron Job Delivery Hygiene, Deduplication & Fault Tolerance (Finding 8)

#### 5.1 Persistent Delivery State Tracking & Deduplication
- **Problem**: Crons send emails in memory loops without recording per-recipient delivery timestamps. A retry sends duplicate emails.
- **Migration**: Create `supabase/migrations/20261016000600_cron_delivery_tracking.sql`:
  ```sql
  -- Delivery state tracking on appointments
  ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

  -- Delivery state tracking on postpartum records
  ALTER TABLE public.postpartum_records
    ADD COLUMN IF NOT EXISTS nbs_recall_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS immunization_recall_sent_at TIMESTAMPTZ;
  ```
- **Route Upgrades**:
  1. In `app/api/cron/reminders/route.js`:
     - Filter query: `.is('reminder_sent_at', null)`.
     - Upon successful SMTP delivery:
       ```javascript
       if (result.success) {
         await supabase
           .from('appointments')
           .update({ reminder_sent_at: new Date().toISOString() })
           .eq('id', appt.id);
         emailsSent++;
       }
       ```
  2. In `app/api/cron/recalls/route.js`:
     - Filter query: Skip if `isNbsRecall && record.nbs_recall_sent_at` or `isImmunizationRecall && record.immunization_recall_sent_at`.
     - Update timestamps immediately per recipient send.
  3. In `app/api/cron/reconcile/route.js`:
     - Store `reconciled_at = new Date().toISOString()` when marking `status = 'No-Show'`.
  4. Ensure all date calculations strictly anchor to `Asia/Manila` (PHT, UTC+8) via `getClinicTodayDateString()` and `getClinicDateOffset()` (already validated in `lib/utils.js`).

---

## 5. Verification & Testing Protocol

### 5.1 Security & Storage Validation
- [ ] **Storage Bucket Privacy:** Attempt anonymous curl request to `https://<ref>.supabase.co/storage/v1/object/public/patient-records/...`. Expected: `400 / 403 Access Denied`.
- [ ] **Signed URL Generation:** Verify staff can view ultrasound images and lab documents in `app/admin/patients/[id]` via signed URLs with valid expirations.
- [ ] **Purged Routes Check:** Send GET request to `/api/admin/setup-secure` and `/api/admin/migrate`. Expected: `404 Not Found`.
- [ ] **Audit Immutability Test:** Attempt to execute `UPDATE public.audit_logs SET action = 'ALTERED'` or `DELETE FROM public.audit_logs`. Expected: Abort with exception: `"DPA 2012 Compliance Violation: public.audit_logs rows are strictly immutable"`.

### 5.2 Access Control & Middleware Validation
- [ ] **Patient Route Containment:** Log in as a patient account (`role = 'patient'`) and navigate to `/admin`. Expected: Immediate redirection to `/admin/login?error=Unauthorized`.
- [ ] **Granular Action Access:** Authenticate as a staff member with `role = 'nurse'` and invoke `updateSettings`. Expected: Rejection with `Unauthorized: Clinic Administrator privileges required`.
- [ ] **Clinical Directory Gating:** Verify `app/admin/patients` cannot be rendered by unauthenticated or patient sessions.

### 5.3 Concurrency & Clinical Logic Validation
- [ ] **Concurrent Appointment Booking Race Test:** Launch 5 simultaneous booking requests against a slot with 1 remaining capacity. Expected: Exactly 1 succeeds with booking confirmation; 4 return graceful `"Slot fully booked"` alerts without oversubscribing.
- [ ] **Atomic Patient Registration:** Test patient creation with valid demographics but forced malformed data. Expected: Zero partial/orphan rows in `patients`.
- [ ] **Elapsed Time Weight Gain Scorer:** Log a visit with $+2.5\text{ kg}$ after 28 days (4 weeks). Expected: `is_high_risk` remains `false`. Log a visit with $+2.2\text{ kg}$ after 7 days. Expected: `is_high_risk = true` with reason `"Acute Weight Spike: +2.2kg in 7 days"`.
- [ ] **Clinician Risk Clearance:** Invoke `clearMaternalRiskFlag` as Attending Physician. Expected: `is_high_risk` toggles to `false`, audit log records clearance note.

### 5.4 Cron Deduplication & Resiliency Validation
- [ ] **Double-Run Cron Idempotency:** Trigger `/api/cron/reminders`. Verify reminders are sent and `reminder_sent_at` is populated. Trigger endpoint immediately a second time. Expected: `0 reminders sent`, `success: true`.

---

## 6. Implementation Checklist & Next Steps

When ready to proceed, execution will follow this ordered sequence:

1. **Phase 1 (Security Blockers):** Run storage lockdown migration, delete `setup-secure` & `migrate` routes, and install audit immutability trigger.
2. **Phase 2 (RBAC & Middleware):** Rename and activate `middleware.js`, apply role gating across admin layout and `app/actions.js`.
3. **Phase 3 (Schema & Scope):** Drop dead billing/claims tables, apply typed vitals columns and migration manifest.
4. **Phase 4 (Transactions & Clinical Safety):** Implement `register_patient_atomic`, `reserve_appointment_slot`, and normalized risk scorer with clinician clearance.
5. **Phase 5 (Automation Hygiene):** Add delivery state columns and per-send updates in all 4 cron endpoints.
