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
- **Priority 6: Module 3 Patient Directory & 5-Tab EMR Usability Overhaul (Completed Oct 2026):**
  - **LMP & Maternal Episode Continuity:** Fixed critical bug in `app/actions.js` (`createPatient`) where LMP was discarded. Now automatically calculates Naegele's EDC (+280 days), provisions initial active `maternal_episodes` record, and redirects directly to `/admin/patients/${id}`.
  - **New Patient Intake Form Ergonomics (`components/admin/patients/new-patient-form.jsx`):** Real-time age derivation from DOB, live AOG & EDC Naegele preview banner, G/P steppers, 11-digit mobile masking, PhilHealth PIN, and `useTransition` double-submission lock.
  - **Patient Tabs Context & Bento Card Quick Actions:** Created `PatientTabsContext` in `patient-tabs-wrapper.jsx` and connected all Bento buttons in `clinical-overview-bento.jsx` to switch tabs programmatically without full-page reloads.
  - **Pre-eclampsia Risk Triad CDS:** Upgraded BP evaluation in Bento overview to detect triad of BP $\ge 140/90$ + urine protein with live pulse indicator and Hypertensive Emergency ($\ge 160/110$) guidance.
  - **DOH Maternal Census CSV Export & Hotkey (`patient-directory-client.jsx`):** Added 1-click UTF-8 BOM CSV export of maternal directory cohort with Gravida, Para, LMP, EDC, AOG, Trimester, and Risk status. Attached `/` hotkey for instant search bar focus.
  - **Accelerated Lab Entry (`prenatal-labs-section.jsx`):** 1-click *"⚡ Auto-fill Normal Defaults"* macro, replaced blocking `window.confirm` and `alert` with inline confirmation and error banner, added Escape/backdrop modal dismissal.
  - **DOH Postpartum & Newborn Protocols (`postpartum-tab-content.jsx`):** 1-click *"⚡ Apply DOH Protocols"* macro for all 4 Unang Yakap steps, Vit K, eye prophylaxis, and birth dose vaccines. Integrated dynamic Grams-to-Kg converter on birth weight.
  - **Strict Print Isolation (`emergency-transfer-modal.jsx` & `printable-clinical-record.jsx`):** Isolated DOH Obstetric Transfer Slip with `@media print` CSS and physical handover signature blocks. Injected `@page { size: A4 portrait; margin: 8mm 10mm; }` on printable clinical record.
  - **Non-blocking Document Deletion (`delete-attachment-button.jsx`):** Extracted client component with inline confirmation state, eliminating `window.confirm` and server component hydration warnings.
- **Priority 7: Public Booking Engine & Same-Day Past Slot Protection (Completed Oct 2026):**
  - **PHT Real-Time Slot Expiration Guard:** Integrated `getClinicNowPHT()`, `parseSlotTimeRange()`, `isSlotExpired()`, and `areAllSlotsExpired()` in [lib/utils.js](file:///c:/Users/admin/Desktop/arjen-clinic/lib/utils.js) strictly synchronized with Philippine Standard Time (`Asia/Manila`, UTC+8).
  - **Booking Wizard Step 2 Ergonomics (`booking-wizard.jsx`):** Replaced UTC date drift with `getClinicTodayDateString()` and `getClinicDateOffset()`. Same-day slots that have started or passed are automatically disabled, greyed out, marked with a `"Past Session"` badge, and blocked from selection.
  - **Concluded Hours Awareness:** When all consultation windows on today's date have passed, the quick 7-day chip displays an amber `"Concluded"` indicator and an alert banner guides the patient to choose tomorrow or an upcoming date.
  - **Server-Side Booking Guard (`actions.js`):** Enforced validation in `createAppointment` to reject submissions for past dates or concluded same-day slots, and dynamically matched capacity limits against the `time_slots` table.
- **Priority 8: Module 4 Telehealth & Online Consultations Hardening (Completed Oct 2026):**
  - **Real-Time Hydration Resiliency (`consultations-inbox.jsx`):** Fixed bug where first-time patient messages were silently discarded when no matching thread was loaded (`threadIndex === -1`). Now dynamically fetches demographic and visit log records from Supabase and prepends the thread without page reload.
  - **₱0 Zero-Cost Web Audio Triage Chimes (`lib/utils.js`):** Implemented dual-frequency gentle synthesizer chime (`playConsultationChime(isEnabled, isUrgent)`) with distinct urgent danger-sign harmonic alerts and an instant mute/unmute header toggle (`Volume2`/`VolumeX`).
  - **Dynamic Relative Timestamps & Date Dividers:** Added `formatRelativeConsultationTime` (*"Just now"*, *"5m ago"*, *"Yesterday"*) and calendar date dividers (`── Today ──`, `── Yesterday ──`) across directory threads and chronological chat streams in both staff inbox and patient portal (`consultation-thread.jsx`).
  - **Bedside Clinical Snapshot Drawer Deep-Links:** Wired one-click cross-module navigation from the drawer directly into patient EMR tabs (`?tab=obstetric`, `?tab=labs`, `?tab=history`) and added a 1-click in-clinic appointment booking shortcut (`/admin/appointments?patientId=...`).
  - **Mobile Virtual Keyboard Guard & Clinical Macro Ergonomics:** Guarded `Enter` key on touch devices to prevent accidental premature dispatches during mobile triage; added Append/Replace mode toggle for DOH BEmONC macros (Pre-eclampsia warning, active labor signs, fetal kick count protocol).
  - **EMR Teleconsult Summary Card Fix (`teleconsult-summary-card.jsx`):** Resolved property mismatch where `lastMessage?.message_text` produced empty quotes instead of `lastMessage?.content`, hydrating the patient chart overview with accurate recent inquiry snippets and relative timestamps.
- **Priority 9: Module 6 Schedule & Shift Capacity Management Hardening (Completed Oct 2026):**
  - **PHT 7-Day Rolling Horizon Visualizer (`schedule-capacity-visualizer.jsx`, `app/admin/schedule/page.jsx`):** Eliminated UTC 8-hour boundary drift using `getClinicTodayDateString()` and `getClinicDateOffset()` (`Asia/Manila`, UTC+8). Expanded calendar window to a full 7-day rolling week with cumulative load pills (`<70% Normal`, `70-90% Busy`, `>90% Peak`) and 1-click deep-links to `/admin/appointments?date=...`.
  - **Client-Side Add Slot Overlap Pre-Validation (`add-time-slot-form.jsx`):** Replaced silent server-side revalidations with instant client-side validation that checks for inverted start/end times and detects conflicting slot overlaps against existing configured windows.
  - **Two-Step Safe Deletion Guard (`time-slot-list.jsx`):** Protected clinical appointment windows from accidental single-click deletion by introducing an inline confirmation step (`[Are you sure?] [Confirm] [Cancel]`) with non-blocking `useTransition`.
  - **Inline Auto-Save Capacity Adjuster (`auto-save-capacity.jsx`):** Wired slot capacity adjustment directly into the schedule list row with blur auto-save and a micro-animated `✓ Saved` feedback badge.
  - **Holiday Closure Presets & Past-Date Guard (`blocked-dates-manager.jsx`):** Enforced `min={today}` on blocked date selection and added 1-click preset chips (*"National Holiday"*, *"Midwife Staff Training"*, *"Facility Sanitation"*, *"Doctor Conference"*, *"Typhoon Advisory"*) with two-step unblock confirmation.
  - **Optimistic Weekend Policy Toggles & Schema Migration (`weekend-policy-manager.jsx`, `20261014000000_add_weekend_block_columns.sql`):** Added `block_saturday` and `block_sunday` to `clinic_settings` table to back independent Saturday and Sunday operating policies with non-blocking transitions and high-visibility status badges (`🚫 Blocked / Closed` vs `✓ Open for Consults`).
- **Priority 10: Module 7 Website CMS & Branding Studio Hardening (Completed Oct 2026):**
  - **Client & Server Upload Guards & Sanitization (`app/actions.js`, `logo-studio.jsx`, `favicon-studio.jsx`):** Enforced size ceilings (<3MB for logo, <2MB for favicon, <8MB for hero photo) and MIME validations with friendly client-side error alerts preventing wasted network trips or storage errors.
  - **Real-Time Cross-Component Branding Synchronization (`cms-manager.jsx`, `whatsapp-sidebar.jsx`):** Connected custom window event listeners (`clinic-logo-updated`, `clinic-favicon-updated`) allowing instant 0ms updates to sidebar clinic avatars and the browser's active `<link rel="icon">` in `document.head` without full page reloads.
  - **ServiceManager Ergonomic Overhaul (`service-manager.jsx`):** Replaced harsh blue theme with Magic UI Rose/Slate tokens, added live active service count pill, micro-animated `✓ Saved` feedback, character counter gauges, and two-step safe deletion confirmation (`[Delete service?] [Confirm] [Cancel]`).
  - **Google SERP Snippet & Social Share Simulator (`cms-manager.jsx`):** Built interactive desktop & mobile search result preview cards in the Logo & SEO tab with live character count gauges (warning badges for >60 chars title, >160 chars description) and OpenGraph social card previews.
  - **Philippine Maternity Clinic Operating Hours Presets (`cms-manager.jsx`):** Added 1-click preset chips for Weekdays, Saturday, and Sunday (*"8AM-5PM"*, *"7AM-6PM"*, *"24/7 Delivery Only"*, *"Half Day"*, *"Closed (Midwife On-Call)"*) with instant input binding.
  - **DPA Audit Logging on All CMS Mutations (`app/actions.js`):** Added immutable audit log entries (`UPDATE_HERO_IMAGE`, `REMOVE_HERO_IMAGE`, `UPDATE_HERO_CONTENT`, `UPDATE_NAVBAR_LOGO`, `REMOVE_NAVBAR_LOGO`, `UPDATE_FAVICON`, `REMOVE_FAVICON`, `SYNC_FAVICON_WITH_LOGO`, `UPDATE_ABOUT_CONTENT`, `UPDATE_FOOTER_CONTENT`, `UPDATE_SEO_METADATA`, `UPDATE_CLINIC_SERVICES`).
- **Priority 11: Module 8 DPA Audit Logs & Security Governance Hardening (Completed Oct 2026):**
  - **Full Surveillance Coverage in `app/actions.js`:** Instrumented every mutation pipeline (`CREATE_PATIENT`, `UPDATE_PATIENT`, `CREATE_MATERNAL_EPISODE`, `CANCEL_APPOINTMENT`, `ADD_BLOCKED_DATE`, `REMOVE_BLOCKED_DATE`, `ADD_TIME_SLOT`, `UPDATE_TIME_SLOT`, `DELETE_TIME_SLOT`, `UPDATE_TIME_SLOT_CAPACITY`, `UPDATE_WEEKEND_POLICY`) with non-blocking, fail-safe `logAuditEvent` calls recording actor email, role, target resource ID, and semantic metadata.
  - **60fps Search with React 19 `useDeferredValue` (`audit-logs-viewer.jsx`):** Eliminated UI input typing lag by decoupling the search query input state from heavy JSON stringification and array filtering.
  - **Philippine Standard Time (PHT, UTC+8) Temporal Quick-Filters:** Implemented 1-click rolling horizon date filters (`All Time`, `Today's Shift`, `Past 7 Days`, `Past 30 Days`) strictly anchored to Manila time (`Asia/Manila`, UTC+8) using `getClinicTodayDateString()` and `getClinicDateOffset()`.
  - **Statutory RFC-4180 CSV Export with UTF-8 BOM:** Added 1-click official audit compliance export with `\uFEFF` preamble containing clinic metadata, extracting officer email, statutory DPA 2012 declaration, and properly quoted RFC-4180 values for Excel compatibility.
  - **6-Category Semantic Domain Mapping & Badges:** Categorized actions into `Clinical / PHI`, `Patient Directory`, `Triage & Queue`, `Telehealth`, `System & Schedule`, and `Deletions & Exports` with custom Magic UI badge colors.
  - **Dual-Mode Metadata Inspector Drawer:** Upgraded log inspection with tabbed view switching between a structured Bento metrics breakdown (Actor, Target, Timestamp, Key/Value pairs) and syntax-highlighted Raw JSON with a 1-click `Copy JSON` clipboard button.
  - **Ergonomic Client-Side Pagination:** Added configurable pagination (25 / 50 / 100 entries per page) with page jump controls, record bounds counter, and a collapsible statutory compliance guidance card explaining RA 10173 and DOH 5-year retention mandates.
- **Priority 12: Module 9 System Settings & Profile Hardening (Completed Oct 2026):**
  - **Strict Session Authentication & RBAC Route Guard (`page.jsx`):** Eliminated unauthenticated settings access; enforced `canManageSystemSettings(role)` with standard statutory Access Restricted warning and automatic redirection to `/admin/login`.
  - **Production Supabase Auth Credential Mutation (`app/actions.js`):** Replaced non-functional rejection with live `supabaseServer.auth.updateUser` execution for admin passwords and emails, synced with `public.users` and `admin_credentials`, and recorded immutable `UPDATE_ADMIN_CREDENTIALS` DPA audit logs.
  - **Clinic Profile DPA Audit Logging & Extended Fields (`app/actions.js`):** Instrumented `updateSettings` with `UPDATE_CLINIC_PROFILE` audit logging and persisted `emergency_notice` (clinical referral advisory) and `footer_email`.
  - **Magic UI 3-Tab SettingsManager Component (`settings-manager.jsx`):** Replaced static full-page server forms with a responsive 3-tab Bento layout (`Clinic Profile`, `Security & Credentials`, `System Diagnostics`) powered by non-blocking `useTransition` and micro-animated `✓ Saved` feedback badges.
  - **Real-Time Philippine Contact Masking:** Enforced automatic formatting (`09XX-XXX-XXXX` and `(046) XXX-XXXX`) with instant visual validation badges (`✓ Valid PH Mobile` vs `⚠️ Incomplete Contact Number`).
  - **Real-Time Password Confirmation & Strength Gauge:** Built client-side strength meter (Weak/Moderate/Strong) with colored progress bar, live match comparison (`✓ Matches` vs `✕ Mismatch`), and show/hide toggles.
  - **Live System Diagnostics & PHT Clock:** Built real-time ticking Philippine Standard Time clock (`Asia/Manila`, UTC+8) with live pulse, PostgreSQL connection indicator, NodeMailer Gmail SMTP health, and statutory compliance badges (RA 10173, DOH AO 2016-0035, PhilHealth MCP, DOH BEmONC).
- **Priority 13: Module 10 Public Lobby TV Queue Display Hardening (Completed Oct 2026):**
  - **Decoupled Realtime WebSocket Subscription:** Eliminated channel tear-down thrashing by decoupling the Supabase stream from the audio toggle state and utilizing `audioEnabledRef`.
  - **Live WebSocket Heartbeat Status Indicator:** Integrated channel status tracking (`SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR`) and browser network state listeners to render a live pulsing indicator (🟢 Live WebSocket / 🟡 Reconnecting / 🔴 Offline Polling).
  - **Autonomous First-Gesture Audio Unlocker:** Solved browser autoplay blocking with global first-gesture listeners (`click`, `keydown`, `touchstart`) and a high-visibility Magic UI floating sound prompt (*"Click anywhere or press Spacebar to enable live clinic voice calling"*).
  - **Double-Call Natural Voice Vocalizer (`en-PH` Voice Tuning):** Spaced ticket character pronunciation (`P 0 4`) and implemented double-call cadence with Filipino English voice adaptation for acoustic clarity in busy waiting lounges.
  - **Stepped-Out "Returning" Patient Recall Callout:** Enhanced `nowCalling` with a distinct Cyan glowing beacon (`RECALL: RETURNING PATIENT`) and customized audio announcements for patients returning from outside.
  - **Header Queue Velocity Summary Bar:** Added quick situational awareness counters (Total Patients Today, In Consult, In Triage, Waiting in Lobby).
  - **Kiosk Hotkeys & Anti-Burn-In Protection:** Added full-screen and kiosk controls (`F` for Fullscreen, `M`/`Space` to Mute/Unmute, `R` to Refresh) and slow ambient breathing gradients to prevent LED/OLED pixel burn-in over 24/7 continuous operation.

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
