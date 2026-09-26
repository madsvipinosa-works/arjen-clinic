-- Migration: Module 3 - Billing, Cashiering & PhilHealth Claims Tracker
-- STRICT SCOPE: Purely an internal administrative ledger and claims pipeline tracker.
-- NO external payment gateways or webhooks.

-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL, -- e.g. INV-2026-0001
  patient_id UUID REFERENCES public.patients(id) ON DELETE RESTRICT NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  maternal_episode_id UUID REFERENCES public.maternal_episodes(id) ON DELETE SET NULL,
  
  -- Financial Breakdown
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  philhealth_discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  senior_pwd_discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  change_given NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Internal Counter Payment Tracking
  payment_method TEXT CHECK (payment_method IN ('Cash', 'GCash', 'Bank Transfer', 'PhilHealth', 'Mixed')) DEFAULT 'Cash',
  payment_reference TEXT, -- Manual GCash reference number, check #, or bank deposit ref
  payment_status TEXT CHECK (payment_status IN ('Unpaid', 'Paid', 'Partially Paid', 'Cancelled')) DEFAULT 'Unpaid',
  official_receipt_number TEXT, -- Physical OR / booklet serial number
  
  -- Audit & Metadata
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT DEFAULT 'Service', -- 'Package', 'Service', 'Laboratory', 'Medication', 'Consumable'
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create PhilHealth Claims Tracker Table
CREATE TABLE IF NOT EXISTS public.philhealth_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_series_number TEXT UNIQUE, -- e.g. PH-2026-0001
  patient_id UUID REFERENCES public.patients(id) ON DELETE RESTRICT NOT NULL,
  maternal_episode_id UUID REFERENCES public.maternal_episodes(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- PhilHealth Package Particulars
  package_type TEXT CHECK (package_type IN ('MCP', 'NCP', 'MCP+NCP', 'Normal Delivery')) NOT NULL,
  claim_amount NUMERIC(10, 2) NOT NULL DEFAULT 6500.00,
  philhealth_member_id TEXT, -- 12-digit PIN
  member_category TEXT,       -- Formal, Informal, Indigent/4Ps, Senior Citizen, Lifetime
  patient_relationship TEXT DEFAULT 'Member', -- Member, Dependent - Spouse, Dependent - Child
  
  -- Operational Pipeline Status
  status TEXT CHECK (status IN (
    'Draft',                -- Preparing Claim Forms (CF1, CF2, MDR, PMRF)
    'Transmitted',          -- Submitted to PhilHealth Local Health Insurance Office (LHIO)
    'In Process',           -- Under PhilHealth medical & financial adjudication
    'Approved_Reimbursed',  -- Cheque or bank credit received
    'Denied_Returned'       -- Return-to-Hospital (RTH) or Rejected
  )) DEFAULT 'Draft',
  
  -- Statutory 60-Day Deadlines & Milestone Dates
  date_of_delivery DATE NOT NULL,
  filing_deadline DATE NOT NULL, -- Computed as delivery_date + 60 days
  transmitted_date DATE,
  reimbursed_date DATE,
  check_or_reference_number TEXT, -- LBP Cheque # or Bank Credit Advice
  denial_reason TEXT,
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_philhealth_claims_patient ON public.philhealth_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_philhealth_claims_status ON public.philhealth_claims(status);
CREATE INDEX IF NOT EXISTS idx_philhealth_claims_deadline ON public.philhealth_claims(filing_deadline ASC);

-- 5. Row-Level Security (RLS) Policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.philhealth_claims ENABLE ROW LEVEL SECURITY;

-- Invoices Staff Policy
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff', 'cashier'))
  );

-- Invoices Patient Read-Only Policy
DROP POLICY IF EXISTS "Patients view own invoices" ON public.invoices;
CREATE POLICY "Patients view own invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = invoices.patient_id
      AND public.patients.account_id = auth.uid()
    )
  );

-- Invoice Items Staff Policy
DROP POLICY IF EXISTS "Staff manage invoice items" ON public.invoice_items;
CREATE POLICY "Staff manage invoice items" ON public.invoice_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff', 'cashier'))
  );

-- Invoice Items Patient Read-Only Policy
DROP POLICY IF EXISTS "Patients view own invoice items" ON public.invoice_items;
CREATE POLICY "Patients view own invoice items" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.patients ON public.patients.id = invoices.patient_id
      WHERE public.invoices.id = invoice_items.invoice_id
      AND public.patients.account_id = auth.uid()
    )
  );

-- PhilHealth Claims Staff Policy
DROP POLICY IF EXISTS "Staff manage philhealth claims" ON public.philhealth_claims;
CREATE POLICY "Staff manage philhealth claims" ON public.philhealth_claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'staff', 'cashier'))
  );

-- PhilHealth Claims Patient Read-Only Policy
DROP POLICY IF EXISTS "Patients view own philhealth claims" ON public.philhealth_claims;
CREATE POLICY "Patients view own philhealth claims" ON public.philhealth_claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = philhealth_claims.patient_id
      AND public.patients.account_id = auth.uid()
    )
  );

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
