# 🏥 AR-JEN Maternity Clinic — Project State & Agent Handbook

> **Single Source of Truth for AI Agents & Developers**  
> **Last Updated:** September 2026  
> **Status:** Part 1 (EMR Overhaul), Part 2 (Automations), & Part 3 (Reception & Maternal Protocols) COMPLETE. Emergency Medicine Monitor IN QUEUE.

---

## 1. Project Vision & Core Mandate

- **System Purpose:** Digital Clinic Management System for **AR-JEN Maternity Clinic** (a high-volume community lying-in clinic in the Philippines).
- **Primary Operational Focus:** Patient triage flow, appointments, clinical maternal records (EMR), consultations, and DOH/PhilHealth compliance.
- **Strictly Out-of-Scope (Non-Goals):**
  - ❌ **Billing, Cashiering, and Receipts Ledger:** The user explicitly noted that financial revenue tracking does not make sense for the operational focus of this system. Do NOT add cashiering, official receipts, or revenue reporting unless explicitly instructed.
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
  - `QuickWalkInModal` component (`components/admin/quick-walkin-modal.jsx`): 30-second dialog, instant patient deduplication and direct injection into live Kanban `Waiting` triage lane.
  - Past Appointments Date Range Filters & CSV Export (`app/admin/appointments/page.jsx`, `components/admin/appointments-manager.jsx`).
  - Public Lobby TV Queue Display (`/queue`, `app/queue/page.jsx`): Real-time Supabase subscription, audio chime, and text-to-speech ticket calling.
- **Priority 2: Maternal Clinical Protocols:**
  - Dynamic Age of Gestation (AOG) Auto-Calculation (`components/admin/clinical/clinical-overview-bento.jsx`, `lib/clinical-protocols.js`): Real-time Naegele's rule calculation, gestational progress bar, trimester badges, and milestone clinical alerts (OGTT, CBC, Ultrasound, Birth Plan, Term).
  - Structured Lab Test Tracker (`components/admin/clinical/prenatal-labs-section.jsx`): Normal reference ranges and real-time anomaly detection for Hb, Urinalysis, HBsAg, VDRL, HIV, and OGTT.
  - Philippine DOH Newborn Care Protocol (`components/admin/clinical/postpartum-tab-content.jsx`): Full DOH EINC protocol checklist, NBS Filter Card #, Hearing Screening, Vitamin K, Hep B birth dose, BCG, eye prophylaxis.
- **Priority 3: Staff RBAC & Audit Trail:**
  - Role hierarchy & permissions (`lib/rbac.js`), immutable audit log recording (`lib/audit-logger.js`), and audit trail viewer (`app/admin/audit-logs/page.jsx`).

---

## 4. Active Roadmap: Remaining In-Scope Tasks 📌

### Phase 3 Remaining: Pharmacy & Emergency Inventory
1. **Emergency Supplies & Critical Medicine Monitor:**
   - Low-stock and expiration monitor for critical delivery drugs (Oxytocin, Magnesium Sulfate, Tranexamic Acid, IV Fluids).
   - Real-time stock level indicator, expiry alerts, and restock prompts for delivery room emergency kits.

---

## 5. Instructions for AI Agents Working on this Repo

1. **Always read this file first:** Before starting any sprint or suggesting changes, review the current state and roadmap above.
2. **Do not re-implement or break existing automations:** Part 2 automations (crons in `/api/cron/`, triggers in `supabase/migrations/`, `utils/email.js`) are tested and active.
3. **Keep revenue out of clinical features:** AR-JEN's priority is patient safety and smooth midwife/doctor workflow.
4. **Update this file:** Whenever a major feature or sprint from the roadmap is completed, update this `AGENTS.md` and commit it.
