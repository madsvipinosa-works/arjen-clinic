# Project Context & Active State (AR-JEN Clinic)

### Core Mandate & Current Progress
- **Project:** AR-JEN Maternity Clinic (Philippines Lying-in clinic).
- **Core Focus:** Clinical operations, patient triage, appointments, maternal EMR, DOH/PhilHealth protocols.
- **Strictly Out-of-Scope:** Billing, cashiering, and revenue reporting (the user has explicitly removed accounting from the scope).
- **Zero-Cost Constraint:** All notifications must use our free NodeMailer setup (`utils/email.js`). Never suggest or install paid SMS APIs (e.g. Twilio, Semaphore).
- **Design:** Follow `.agents/rules/magic-ui-standards.md` (Magic UI / 21st.dev).

### Current Milestone Status
- **Part 1 (EMR Overhaul):** COMPLETE (5-tab EMR, clinical bento grid, DOH transfer slip, telehealth hub).
- **Part 2 (Automations):** COMPLETE & TESTED (Auto-risk scorer DB trigger, Smart triage auto-approval, 4 Vercel cron jobs for reminders, no-show reconciliation, postpartum recalls, and EOD clinical digest).
- **Part 3 (In Queue):**
  1. Quick Walk-In Booking Modal (Appointments/Triage)
  2. Past Appointments Date Range Filter & CSV Export
  3. Public Lobby TV Queue Display (`/queue`)
  4. Dynamic Gestational Age (AOG) Auto-Calculation
  5. Structured Lab Test Tracker
  6. Philippine DOH Newborn Care Protocol
  7. Emergency Medicine Stock Tracking
  8. Staff RBAC & Audit Trail

Refer to `AGENTS.md` in the workspace root for the comprehensive architecture and single source of truth.
