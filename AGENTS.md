# 🏥 AR-JEN Maternity Clinic — Project State & Agent Handbook

> **Single Source of Truth for AI Agents & Developers**  
> **Last Updated:** October 2026  
> **Status:** Core Architecture Complete. **SCOPE FROZEN — Continuous Improvement & Polish Only.**

---

## 1. Project Vision, Scope Freeze & Core Mandates

- **System Purpose:** Digital Clinic Management System for **AR-JEN Maternity Clinic** (a high-volume community lying-in clinic in the Philippines).
- **Primary Operational Focus:** Patient triage flow, appointments, clinical maternal records (EMR), consultations, and DOH/PhilHealth compliance.
- **🔒 STRICT SCOPE FREEZE MANDATE:**
  - The current set of modules is **final and complete**. 
  - **NO NEW MODULES** will be added to the system.
  - All future engineering and design effort is **strictly dedicated to improving, hardening, refining UX/UI, optimizing performance, and enhancing the clinical ergonomics** of the existing modules.
- **Strictly Out-of-Scope (Permanently Purged):**
  - ❌ **Billing, Cashiering, and Receipts Ledger:** Financial revenue tracking does not make sense for the clinical focus of this lying-in system. All billing/cashiering pages and ledgers have been removed. Do NOT re-add them.
  - ❌ **Financial PhilHealth Reimbursement Claims Pipeline:** External claims adjudication is out-of-scope (only the clinical prenatal 4-visit compliance card on the patient chart is maintained).
- **Cost Constraint:**
  - ❌ **No Paid Third-Party APIs:** Do NOT integrate paid SMS services (e.g., Semaphore, Twilio, PhilSMS) or paid mail services.
  - ✅ **Free NodeMailer Engine:** All email notifications, appointment reminders, and alerts must run through our free NodeMailer Gmail SMTP setup (`utils/email.js`).
- **UI Design Standard:**
  - Follow the **Magic UI** & **21st.dev** design guidelines defined in `.agents/rules/magic-ui-standards.md` (subtle glassmorphism, Bento grids, pill badges, micro-animations, Stitch MCP).

---

## 2. Technical Stack & Infrastructure

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide React, Framer Motion
- **Backend & Database:** Supabase (PostgreSQL with database functions, automated triggers, and Row Level Security)
- **Email Service:** NodeMailer via Gmail SMTP (`utils/email.js`)
- **Automations:** Vercel Cron jobs (`vercel.json`) with Bearer token authentication via `CRON_SECRET`
- **Environment Variables (.env.local - Git Ignored):**
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `EMAIL_USER`, `EMAIL_APP_PASSWORD`
  - `CRON_SECRET`

---

## 3. What Has Been Completed & Verified ✅

### Part 1: Clinical EMR Usability Overhaul
- **5-Tab EMR Architecture:** Clean modular layout for patient records (Clinical Overview, Medical History, Obstetric/Visits, Postpartum, Documents).
- **Clinical Overview Bento Grid:** High-priority clinical metrics (AOG, Trimester, Blood Pressure, High Risk badge) visible within 3 seconds.
- **DOH Emergency Transfer Slip:** One-click printable standard Department of Health transfer form for emergency obstetric/neonatal referrals.
- **Telehealth Hub:** 3-column layout with bedside clinical snapshot drawer.

### Part 2: Zero-Human-Intervention Automations (Completed Sep 2026)
- **Sprint 1 (Event Triggers):**
  - `PhilHealthMCPCard` component: Real-time visual compliance checker for PhilHealth Maternity Care Package (Trimester 1, 2, and 3 visit counts).
  - PostgreSQL trigger `20260929000000_auto_risk_scorer.sql`: Automatically scores and flags `is_high_risk = true` on `patients` whenever a visit log records BP $\ge 140/90$ or rapid weight spikes.
- **Sprint 2 (Smart Triage Booking Engine):**
  - Auto-approval logic in `app/(auth)/actions.js` (`createAppointment`): Automatically approves routine, low-risk prenatal and consult bookings if capacity is under 80% and patient has zero no-shows.
  - Stitch-designed auto-approval confirmation banner in `app/(public)/book/page.jsx`.
- **Sprint 3 (Zero-Cost Scheduled Background Jobs):**
  - `utils/email.js`: Production-ready Gmail SMTP mailer.
  - `/api/cron/reminders`: Dispatches email reminders 24 hours prior to scheduled appointment.
  - `/api/cron/reconcile`: Runs nightly at 7:00 PM to transition unserved `Approved`/`Waiting` appointments to `No-Show` and send a gentle recovery message.
  - `/api/cron/recalls`: Runs daily at 9:00 AM for Postpartum Day 3–5 Newborn Screening (NBS) reminders and 6-Week vaccination recalls.
- **Sprint 4 (EOD Clinical Digest):**
  - `/api/cron/eod-report`: Runs nightly at 8:00 PM to compile an executive operational summary (patient counts, service breakdowns, no-shows, and high-risk flags) sent to the clinic administrator. Revenue has been strictly omitted.

### Part 3: Reception & Clinical Protocol Enhancements (Completed Sep 2026)
- **Priority 1: Reception & Queue Flow:**
  - `QuickWalkInModal` component (`components/admin/quick-walkin-modal.jsx`): 30-second dialog, instant patient deduplication, direct injection into live Kanban `Waiting` triage lane, dynamic thermal print ticket slip with instant QR code generation.
  - Past Appointments Date Range Filters & CSV Export (`app/admin/appointments/page.jsx`, `components/admin/appointments-manager.jsx`).
  - Public Lobby TV Queue Display (`/queue`, `app/queue/page.jsx`): Real-time Supabase subscription, audio chime, text-to-speech ticket calling, and high-visibility "Missed Numbers / Approach Front Desk" section for stepped-out patients.
  - Midwife Step-Aside Grace Shelf (`components/admin/kanban-board.jsx`, `components/admin/kanban-card.jsx`, `app/actions.js`): 1-click `[ Step Aside ]` action to place missing patients on temporary hold (`Stepped Out`) without stalling the clinic line, plus 1-click `[ Return to Queue ]` recovery and live cyan `Returning` pulse indicators.
  - Mobile Pocket Queue Tracker (`/queue/track`, `app/queue/track/page.jsx`): ₱0 zero-cost mobile tracker with turn countdown (*"2 ahead • ~15 mins"*), phone vibration (`navigator.vibrate`), Web Audio synth chime, and *"I'm on My Way Back"* response button that alerts midwives in real-time.
- **Priority 2: Maternal Clinical Protocols:**
  - Dynamic Age of Gestation (AOG) Auto-Calculation (`components/admin/clinical/clinical-overview-bento.jsx`, `lib/clinical-protocols.js`): Real-time Naegele's rule calculation, gestational progress bar, trimester badges, and milestone clinical alerts (OGTT, CBC, Ultrasound, Birth Plan, Term).
  - Structured Lab Test Tracker (`components/admin/clinical/prenatal-labs-section.jsx`): Normal reference ranges and real-time anomaly detection for Hb, Urinalysis, HBsAg, VDRL, HIV, and OGTT.
  - Philippine DOH Newborn Care Protocol (`components/admin/clinical/postpartum-tab-content.jsx`): Full DOH EINC protocol checklist, NBS Filter Card #, Hearing Screening, Vitamin K, Hep B birth dose, BCG, eye prophylaxis.
- **Priority 3: Staff RBAC & Audit Trail:**
  - Role hierarchy & permissions (`lib/rbac.js`), immutable audit log recording (`lib/audit-logger.js`), and audit trail viewer (`app/admin/audit-logs/page.jsx`).
- **Priority 4: Module 1 Dashboard & Command Center Hardening (Completed Oct 2026):**
  - Eliminated $O(N)$ full-table scan status query anti-pattern in `app/admin/page.jsx` with parallel $O(1)$ exact head counts.
  - Added live PHT shift clock banner (`Asia/Manila`, UTC+8) with active pulse.
  - Wired active ongoing prenatal episode metrics (`activePrenatalCount`) and today's appointments count (`todayApptsCount`).
  - Added high-risk maternal clinical etiology badges (`⚠️ Elevated BP: 140/90 mmHg`, `⚠️ Gestational Diabetes`) and blood group indicators.
  - Implemented reassuring emerald zero-state banner for 0 high-risk patients (*"0 High-Risk Mothers Flagged — Maternal Baseline Stable"*).
  - Fixed tab counter discrepancy in recent appointments slice with clear contextual guidance to the full Appointments Manager.
  - Direct "New Patient Intake" shortcut linking directly to `/admin/patients/new`.
- **Priority 5: Module 2 Appointments, Live Reception Queue & Kanban Triage Hardening (Completed Oct 2026):**
  - Eliminated UTC `.toISOString()` date boundary drift in `page.jsx`, `appointments-manager.jsx`, and `actions.js` using `getClinicDateOffset()` (`Asia/Manila`, UTC+8).
  - Resolved `fetchAppointments` caller property mismatch by returning both `appointments` and `data`.
  - Added dual-state bidirectional sync between `status` and `triage_status` (`Completed` <-> `Discharged`, `Approved` <-> `Waiting`), revalidating `/queue` in real-time.
  - Hydrated Realtime `INSERT` events with joined patient demographics (`age`, `blood_type`, `is_high_risk`, `allergies`), preventing "Unknown Patient" zero-states on new submissions.
  - Expanded CSV export with `Age`, `Blood Type`, `Time Preference`, `Is Walk-In`, `Risk Category`, and `Allergies`.
  - Allowed 1-click Step Aside directly from the Waiting Room lane (`kanban-card.jsx`), unblocking triage midwives from line stalling.
  - Embedded live elapsed timer (*"On hold • ~Xm"*) on stepped-out grace shelf cards with 30-second re-render ticks.
  - Added blood type (`🩸 Type O+`) and age (`24 yo`) clinical identifiers to Kanban patient cards.
  - Unified search state across toolbar and Kanban board with active lane breakdown pills (`Waiting: X • Vitals: Y • Consult: Z • Done: W`).
  - Added keyboard Escape dismissal, backdrop dismissal, and universal 58mm/80mm thermal receipt printer CSS in `QuickWalkInModal`.

---

## 4. Active Mandate: Continuous Improvement & Polish Only 📌

The module roster is **frozen**. No new modules will be created. All efforts are dedicated to refining, hardening, and enhancing the existing 9 Admin modules and 3 User/Public applications:

1. **Clinical Usability & Ergonomics:**
   - Polish input flows, auto-fill triggers, and micro-animations across the 5-Tab EMR and Kanban board.
   - Improve mobile/tablet ergonomics for midwives operating at the bedside.
2. **Reliability & Edge Cases:**
   - Harden real-time subscriptions, Supabase connection resiliency, and form validation error messaging.
   - Continuously optimize audit logging performance and data privacy safeguards.
3. **Clinical Decision Support Refinement:**
   - Refine safety threshold triggers (BP, FHT, proteinuria) for maternal health safety without false positives.

---

## 5. Instructions for AI Agents Working on this Repo

1. **Always read this file first:** Before proposing changes, review the current state and mandates above.
2. **Strict Module Freeze:** DO NOT suggest or create new modules outside the current roster. Focus exclusively on improving existing modules.
3. **Do not re-implement or break existing automations:** Part 2 automations (crons in `/api/cron/`, triggers in `supabase/migrations/`, `utils/email.js`) are tested and active.
4. **Keep revenue out of clinical features:** AR-JEN's priority is patient safety and smooth midwife/doctor workflow.
5. **Update this file:** Whenever a major refinement or optimization is completed, update this `AGENTS.md`.
