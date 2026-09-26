// lib/billing-protocols.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN MATERNITY CLINIC CASHIERING & PHILHEALTH STATUTORY PROTOCOLS
// Formulated in compliance with:
// - Philippine Republic Act No. 7875 / RA 10606 (National Health Insurance Act - PhilHealth 60-day Rule)
// - PhilHealth Circular No. 022-2015 (Maternal Care Package / Newborn Care Package Standards)
// - RA 9994 / RA 10754 (Senior Citizen & PWD Statutory Concessions)
// - Bureau of Internal Revenue (BIR) Lying-In Clinic Cashiering Guidelines
// STRICT SCOPE: Purely an internal administrative ledger and claim tracker.
// NO external payment gateways or third-party webhooks.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Standard AR-JEN Clinic Service Presets & Fees (PHP)
 */
export const CLINIC_SERVICES_PRESETS = [
  // Packages
  { id: 'nsd_pkg', label: 'Normal Spontaneous Delivery (NSD) Package', category: 'Package', price: 12000.00, philhealthEligible: true },
  { id: 'postpartum_care_pkg', label: 'Comprehensive Postpartum Care Package', category: 'Package', price: 3500.00, philhealthEligible: false },
  
  // Consultations & Procedures
  { id: 'prenatal_checkup', label: 'Routine Prenatal Consultation', category: 'Service', price: 350.00, philhealthEligible: false },
  { id: 'postnatal_checkup', label: 'Postnatal Follow-up Checkup', category: 'Service', price: 350.00, philhealthEligible: false },
  { id: 'pap_smear', label: 'Pap Smear Cervical Screening', category: 'Service', price: 650.00, philhealthEligible: false },
  { id: 'iud_insertion', label: 'IUD Insertion Procedure', category: 'Service', price: 1500.00, philhealthEligible: false },
  { id: 'depo_injection', label: 'DMPA (Depo) Contraceptive Injection', category: 'Service', price: 300.00, philhealthEligible: false },
  
  // Ultrasound
  { id: 'utz_pelvic', label: 'Pelvic / Transvaginal Ultrasound (BPS)', category: 'Service', price: 800.00, philhealthEligible: false },
  { id: 'utz_fetal_biometry', label: 'Fetal Biometry & Placental Location', category: 'Service', price: 950.00, philhealthEligible: false },

  // Laboratory & Newborn Screening
  { id: 'enbs_test', label: 'Expanded Newborn Screening (ENBS Filter Card)', category: 'Laboratory', price: 1750.00, philhealthEligible: true },
  { id: 'hearing_screening', label: 'Newborn Hearing Screening Test', category: 'Service', price: 500.00, philhealthEligible: true },
  { id: 'cbc_platelet', label: 'Complete Blood Count (CBC) with Platelet', category: 'Laboratory', price: 350.00, philhealthEligible: false },
  { id: 'urinalysis_routine', label: 'Routine Urinalysis', category: 'Laboratory', price: 150.00, philhealthEligible: false },
  { id: 'ogtt_75g', label: '75g Oral Glucose Tolerance Test (OGTT)', category: 'Laboratory', price: 650.00, philhealthEligible: false },
  { id: 'hbsag_rapid', label: 'HBsAg Hepatitis B Screening', category: 'Laboratory', price: 250.00, philhealthEligible: false },
  { id: 'vdrl_rapid', label: 'Syphilis Screen (VDRL / RPR)', category: 'Laboratory', price: 250.00, philhealthEligible: false },
  { id: 'blood_typing', label: 'ABO & Rh Blood Typing', category: 'Laboratory', price: 200.00, philhealthEligible: false },

  // Emergency & Specialty Medications / Consumables
  { id: 'rhogam_vial', label: 'Rho(D) Immune Globulin (RhoGAM 300 mcg)', category: 'Medication', price: 4500.00, philhealthEligible: false },
  { id: 'tetanus_toxoid', label: 'Tetanus Toxoid (TT) Prophylaxis', category: 'Medication', price: 250.00, philhealthEligible: false },
  { id: 'vit_k_ampoule', label: 'Vitamin K1 Phytomenadione 1mg IM', category: 'Medication', price: 180.00, philhealthEligible: true },
  { id: 'erythromycin_eye', label: 'Erythromycin Eye Ointment 0.5%', category: 'Medication', price: 220.00, philhealthEligible: true },
];

/**
 * Standard PhilHealth Maternal & Newborn Benefit Package Rates
 */
export const PHILHEALTH_BENEFIT_RATES = {
  MCP: {
    code: 'MCP',
    name: 'Maternal Care Package (MCP)',
    amount: 6500.00,
    coverage: 'Normal Spontaneous Delivery, Antenatal & Postpartum Monitoring in Accredited Lying-In Clinics',
  },
  NCP: {
    code: 'NCP',
    name: 'Newborn Care Package (NCP)',
    amount: 1750.00,
    coverage: 'Immediate newborn care, Essential Intrapartum & Newborn Care (EINC), Vitamin K, Eye Prophylaxis, and ENBS',
  },
  MCP_NCP_COMBINED: {
    code: 'MCP+NCP',
    name: 'MCP + NCP Combined Delivery Package',
    amount: 8250.00,
    coverage: 'Full combined mother and newborn lying-in coverage (₱6,500 + ₱1,750)',
  },
};

/**
 * Formats a numeric value into Philippine Peso (PHP ₱) string.
 * @param {number|string} amount 
 * @returns {string} e.g. "₱12,500.00"
 */
export function formatPHP(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Computes PhilHealth 60-Day Statutory Filing Deadline & Urgency Metrics.
 * Section 40, RA 7875 requires claims to be submitted within 60 calendar days from delivery.
 * 
 * @param {string|Date} deliveryDateInput - Date of birth / delivery (YYYY-MM-DD)
 * @returns {object} Statutory deadline metrics and alert severity
 */
export function calculatePhilHealthDeadline(deliveryDateInput) {
  if (!deliveryDateInput) {
    return {
      isValid: false,
      filingDeadline: null,
      daysRemaining: null,
      isExpired: false,
      isCritical: false,
      isUrgent: false,
      statusLabel: 'No Delivery Date',
      statusColor: 'gray',
    };
  }

  const deliveryDate = new Date(deliveryDateInput);
  if (isNaN(deliveryDate.getTime())) {
    return { isValid: false, filingDeadline: null, statusLabel: 'Invalid Date', statusColor: 'gray' };
  }

  // Exact 60 calendar days from delivery
  const deliveryUTC = Date.UTC(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
  const deadlineMs = deliveryUTC + (60 * 24 * 60 * 60 * 1000);
  const deadlineDate = new Date(deadlineMs);
  const filingDeadline = deadlineDate.toISOString().split('T')[0];

  // Compare against today in clinic local time (UTC+8)
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.ceil((deadlineMs - todayUTC) / (1000 * 60 * 60 * 24));

  const isExpired = diffDays <= 0;
  const isCritical = diffDays > 0 && diffDays <= 15;
  const isUrgent = diffDays > 15 && diffDays <= 30;

  let statusLabel = `${diffDays} days left to file`;
  let statusColor = 'emerald';

  if (isExpired) {
    statusLabel = `Expired (${Math.abs(diffDays)} days overdue)`;
    statusColor = 'red';
  } else if (isCritical) {
    statusLabel = `Critical: ${diffDays} days left!`;
    statusColor = 'red';
  } else if (isUrgent) {
    statusLabel = `Urgent: ${diffDays} days remaining`;
    statusColor = 'amber';
  }

  return {
    isValid: true,
    deliveryDateStr: deliveryDate.toISOString().split('T')[0],
    filingDeadline,
    filingDeadlineFormatted: deadlineDate.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    daysRemaining: diffDays,
    isExpired,
    isCritical,
    isUrgent,
    statusLabel,
    statusColor,
  };
}

/**
 * Computes cash change and balance reconciliation for Counter Cashiering.
 * 
 * @param {object} params
 * @param {number} params.amountDue
 * @param {number} params.amountPaid
 * @returns {object} { changeDue, remainingBalance, isFullyPaid, isOverpaid }
 */
export function calculateCounterChange({ amountDue = 0, amountPaid = 0 }) {
  const due = Math.max(0, parseFloat(amountDue) || 0);
  const paid = Math.max(0, parseFloat(amountPaid) || 0);

  if (paid >= due) {
    return {
      changeDue: Math.round((paid - due) * 100) / 100,
      remainingBalance: 0,
      isFullyPaid: true,
      isOverpaid: paid > due,
    };
  }

  return {
    changeDue: 0,
    remainingBalance: Math.round((due - paid) * 100) / 100,
    isFullyPaid: false,
    isOverpaid: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ZOD SCHEMAS FOR FINANCIAL & STATUTORY LEDGER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const invoiceValidationSchema = z.object({
  patient_id: z.string().uuid('Invalid Patient ID UUID'),
  appointment_id: z.string().uuid().nullable().optional(),
  maternal_episode_id: z.string().uuid().nullable().optional(),
  subtotal: z.coerce.number().min(0, 'Subtotal cannot be negative'),
  philhealth_discount: z.coerce.number().min(0).default(0),
  senior_pwd_discount: z.coerce.number().min(0).default(0),
  amount_due: z.coerce.number().min(0, 'Amount due cannot be negative'),
  amount_paid: z.coerce.number().min(0).default(0),
  change_given: z.coerce.number().min(0).default(0),
  payment_method: z.enum(['Cash', 'GCash', 'Bank Transfer', 'PhilHealth', 'Mixed']).default('Cash'),
  payment_reference: z.string().max(100).nullable().optional(),
  payment_status: z.enum(['Unpaid', 'Paid', 'Partially Paid', 'Cancelled']).default('Unpaid'),
  official_receipt_number: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description required'),
    item_type: z.enum(['Package', 'Service', 'Laboratory', 'Medication', 'Consumable', 'Other']).default('Service'),
    quantity: z.coerce.number().int().min(1).default(1),
    unit_price: z.coerce.number().min(0),
    total_price: z.coerce.number().min(0),
  })).min(1, 'Invoice must contain at least 1 item'),
});

export const philhealthClaimValidationSchema = z.object({
  patient_id: z.string().uuid('Invalid Patient ID UUID'),
  maternal_episode_id: z.string().uuid().nullable().optional(),
  invoice_id: z.string().uuid().nullable().optional(),
  package_type: z.enum(['MCP', 'NCP', 'MCP+NCP', 'Normal Delivery']),
  claim_amount: z.coerce.number().min(500, 'Claim amount must be ≥ ₱500'),
  philhealth_member_id: z.string().max(30).nullable().optional(),
  member_category: z.string().max(50).nullable().optional(),
  patient_relationship: z.enum(['Member', 'Dependent - Spouse', 'Dependent - Child']).default('Member'),
  status: z.enum(['Draft', 'Transmitted', 'In Process', 'Approved_Reimbursed', 'Denied_Returned']).default('Draft'),
  date_of_delivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must be YYYY-MM-DD'),
  transmitted_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reimbursed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  check_or_reference_number: z.string().max(100).nullable().optional(),
  denial_reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
