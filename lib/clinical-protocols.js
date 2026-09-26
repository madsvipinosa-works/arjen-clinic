// lib/clinical-protocols.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN CLINICAL PROTOCOLS & MATERNAL-NEWBORN SAFETY ENGINE
// Formulated in accordance with Philippine Department of Health (DOH) Guidelines,
// WHO Clinical Standards, and PhilHealth Maternity & Newborn Care Packages (MCP/NCP).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Calculates Age of Gestation (AOG) and Estimated Date of Confinement (EDC)
 * using Naegele's Rule and standard obstetric calculation.
 * 
 * @param {string|Date} lmpInput - Last Menstrual Period date (YYYY-MM-DD)
 * @param {string|Date} [visitDateInput] - Visit Date (defaults to today in Manila timezone)
 * @returns {object} Calculated obstetric metrics
 */
export function calculateObstetricDates(lmpInput, visitDateInput) {
  if (!lmpInput) {
    return {
      isValid: false,
      aogWeeks: null,
      aogDays: null,
      aogFormatted: null,
      trimester: null,
      edc: null,
      edcFormatted: null,
      isTerm: false,
      isPreterm: false,
      isPostTerm: false,
    };
  }

  const lmp = new Date(lmpInput);
  if (isNaN(lmp.getTime())) {
    return { isValid: false, aogWeeks: null, aogDays: null, aogFormatted: null, trimester: null, edc: null };
  }

  // Determine visit date (defaults to current date in UTC+8)
  let visitDate = visitDateInput ? new Date(visitDateInput) : new Date();
  if (isNaN(visitDate.getTime())) visitDate = new Date();

  // Normalize to UTC midnight to avoid DST/time boundary drifts
  const utc1 = Date.UTC(lmp.getFullYear(), lmp.getMonth(), lmp.getDate());
  const utc2 = Date.UTC(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());

  const diffMs = utc2 - utc1;
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysElapsed < 0) {
    return {
      isValid: false,
      error: `Visit date cannot precede LMP date (${lmp.toISOString().split('T')[0]})`,
      aogWeeks: 0,
      aogDays: 0,
      aogFormatted: '0 0/7',
      trimester: 'Pre-gestational',
      edc: null,
      isTerm: false,
      isPreterm: false,
      isPostTerm: false,
      isExtremeAOG: false,
      boundaryAlert: 'Error: Visit date precedes LMP',
    };
  }

  const aogWeeks = Math.floor(daysElapsed / 7);
  const aogDays = daysElapsed % 7;
  const aogFormatted = `${aogWeeks} ${aogDays}/7`; // Clinical shorthand e.g. "32 4/7"
  const aogDetailed = `${aogWeeks} ${aogWeeks === 1 ? 'week' : 'weeks'}${aogDays > 0 ? `, ${aogDays} ${aogDays === 1 ? 'day' : 'days'}` : ''}`;

  // Trimester & Term Classification
  let trimester = '1st Trimester';
  if (aogWeeks >= 28) {
    trimester = '3rd Trimester';
  } else if (aogWeeks >= 14) {
    trimester = '2nd Trimester';
  }

  const isTerm = aogWeeks >= 37 && aogWeeks <= 41;
  const isPreterm = aogWeeks < 37 && aogWeeks >= 20;
  const isPostTerm = aogWeeks >= 42;
  const isExtremeAOG = aogWeeks > 44;

  let boundaryAlert = null;
  if (isExtremeAOG) {
    boundaryAlert = 'Extreme Prolonged Gestation (> 44 wks) — Clinically Implausible / Re-verify LMP';
  } else if (isPostTerm) {
    boundaryAlert = 'Post-term Pregnancy (≥ 42 wks) — High Risk for Oligohydramnios / Meconium Aspiration';
  } else if (isTerm) {
    boundaryAlert = 'Full Term Gestation (37–41 wks) — Labor Monitoring Preparedness';
  } else if (isPreterm) {
    boundaryAlert = 'Preterm Gestation (< 37 wks) — Monitor for Preterm Labor Signs';
  }

  // EDC Calculation via Naegele's Rule: LMP + 280 days (or +1 year, -3 months, +7 days)
  const edcDate = new Date(utc1 + 280 * 24 * 60 * 60 * 1000);
  const edc = edcDate.toISOString().split('T')[0];
  const edcFormatted = edcDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    isValid: true,
    daysElapsed,
    aogWeeks,
    aogDays,
    aogFormatted,
    aogDetailed,
    trimester,
    isTerm,
    isPreterm,
    isPostTerm,
    isExtremeAOG,
    boundaryAlert,
    edc,
    edcFormatted,
  };
}

/**
 * Evaluates patient vital signs against DOH / WHO Maternal Safety Thresholds.
 * 
 * @param {object} vitals - Clinical inputs: { bp, weight, temp, pr, rr, fht, age, previousWeight, previousWeightDays }
 * @returns {object} Safety evaluation containing alert flags, severity, and actionable messages
 */
export function evaluateMaternalVitalsSafety({
  bp = '',
  weight = null,
  temp = null,
  pr = null,
  rr = null,
  fht = null,
  age = null,
  previousWeight = null,
  previousWeightDays = null,
  latestUrinalysisProtein = null,
}) {
  const alerts = [];
  let highestSeverity = 'NORMAL'; // NORMAL | WARNING | CRITICAL

  // 1. Blood Pressure Evaluation & Pre-eclampsia Triad Cross-Reference
  if (bp && typeof bp === 'string') {
    const bpMatch = bp.match(/(\d{2,3})\s*[\/\-]\s*(\d{2,3})/);
    if (bpMatch) {
      const systolic = parseInt(bpMatch[1], 10);
      const diastolic = parseInt(bpMatch[2], 10);
      const isHypertensive = systolic >= 140 || diastolic >= 90;

      // Clinical Cross-Reference: Hypertension + Proteinuria = Pre-eclampsia Risk Triad!
      const proteinNorm = (latestUrinalysisProtein || '').trim().toLowerCase();
      const hasProteinuria = ['1+', '2+', '3+', '4+', 'positive'].includes(proteinNorm);

      if (isHypertensive && hasProteinuria) {
        highestSeverity = 'CRITICAL';
        alerts.push({
          type: 'PREECLAMPSIA_TRIAD',
          severity: 'CRITICAL',
          title: `Pre-eclampsia Risk Triad (BP ${systolic}/${diastolic} mmHg + ${latestUrinalysisProtein} Proteinuria)`,
          message: `Patient presents with concurrent gestational hypertension and confirmed proteinuria (${latestUrinalysisProtein}). Meets diagnostic criteria for Pre-eclampsia. Urgent spot protein/creatinine ratio (PCR), 24-hr urine protein, platelet/liver/renal profile, and immediate OB-GYN co-management indicated.`,
          action: 'Urgent OB-GYN Consultation & Pre-eclampsia Workup',
        });
      }

      // Severe Preeclampsia / Hypertensive Crisis Threshold
      if (systolic >= 160 || diastolic >= 110) {
        highestSeverity = 'CRITICAL';
        alerts.push({
          type: 'BP_CRITICAL',
          severity: 'CRITICAL',
          title: 'Severe Hypertension Warning (≥160/110 mmHg)',
          message: `Recorded BP ${systolic}/${diastolic} mmHg indicates severe gestational hypertension / imminent eclampsia. Immediate physician evaluation and emergency transfer protocol recommended.`,
          action: 'Immediate OB-GYN Evaluation',
        });
      } else if (isHypertensive && !hasProteinuria) {
        if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';
        alerts.push({
          type: 'BP_WARNING',
          severity: 'WARNING',
          title: 'Elevated Blood Pressure (≥140/90 mmHg)',
          message: `Recorded BP ${systolic}/${diastolic} mmHg meets criteria for Gestational Hypertension. Check urine protein, repeat BP after 15 min rest, and evaluate for preeclampsia symptoms.`,
          action: 'Order Urinalysis (Proteinuria Check)',
        });
      } else if (systolic < 90 || diastolic < 60) {
        if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';
        alerts.push({
          type: 'BP_LOW',
          severity: 'WARNING',
          title: 'Maternal Hypotension (<90/60 mmHg)',
          message: `Low blood pressure ${systolic}/${diastolic} mmHg. Assess for dehydration, bleeding, or orthostatic dizziness.`,
          action: 'Hydration & Postural Assessment',
        });
      }
    }
  }

  // 2. Temperature Evaluation
  const tempNum = parseFloat(temp);
  if (!isNaN(tempNum)) {
    if (tempNum >= 38.0) {
      highestSeverity = 'CRITICAL';
      alerts.push({
        type: 'TEMP_FEVER',
        severity: 'CRITICAL',
        title: `Maternal Pyrexia (${tempNum}°C)`,
        message: 'Fever in pregnancy can signify chorioamnionitis, pyelonephritis, or systemic infection. Prompt diagnostic workup and antipyretics required.',
        action: 'Infection Workup (CBC, Urinalysis)',
      });
    } else if (tempNum < 35.8) {
      if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';
      alerts.push({
        type: 'TEMP_HYPO',
        severity: 'WARNING',
        title: `Hypothermia (${tempNum}°C)`,
        message: 'Patient temperature below normal range. Recheck measurement and ensure thermal comfort.',
      });
    }
  }

  // 3. Fetal Heart Tone (FHT)
  const fhtNum = parseInt(fht, 10);
  if (!isNaN(fhtNum)) {
    if (fhtNum < 110) {
      highestSeverity = 'CRITICAL';
      alerts.push({
        type: 'FHT_BRADYCARDIA',
        severity: 'CRITICAL',
        title: `Fetal Bradycardia (${fhtNum} bpm)`,
        message: 'Fetal heart tone is below the normal baseline of 110 bpm. Immediate left lateral positioning, maternal oxygenation, and continuous monitoring required.',
        action: 'Emergency Left Lateral Decubitus & Fetal Monitoring',
      });
    } else if (fhtNum > 160) {
      highestSeverity = 'CRITICAL';
      alerts.push({
        type: 'FHT_TACHYCARDIA',
        severity: 'CRITICAL',
        title: `Fetal Tachycardia (${fhtNum} bpm)`,
        message: 'Fetal heart tone exceeds 160 bpm. Evaluate for maternal fever, dehydration, medication effect, or fetal distress.',
        action: 'Evaluate Maternal Hydration & Temperature',
      });
    }
  }

  // 4. Maternal Heart Rate / Pulse (PR)
  const prNum = parseInt(pr, 10);
  if (!isNaN(prNum)) {
    if (prNum > 100) {
      if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';
      alerts.push({
        type: 'PR_TACHYCARDIA',
        severity: 'WARNING',
        title: `Maternal Tachycardia (${prNum} bpm)`,
        message: 'Elevated maternal pulse rate. Investigate anemia, pain, anxiety, thyroid disorder, or occult blood loss.',
      });
    } else if (prNum < 60) {
      if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';
      alerts.push({
        type: 'PR_BRADYCARDIA',
        severity: 'WARNING',
        title: `Maternal Bradycardia (${prNum} bpm)`,
        message: 'Pulse rate below 60 bpm. Assess cardiovascular history and symptoms.',
      });
    }
  }

  // 5. Weight Gain Acceleration
  const wtNum = parseFloat(weight);
  const prevWtNum = parseFloat(previousWeight);
  const daysDiff = parseInt(previousWeightDays, 10);
  if (!isNaN(wtNum) && !isNaN(prevWtNum) && !isNaN(daysDiff) && daysDiff > 0 && daysDiff <= 14) {
    const gain = wtNum - prevWtNum;
    if (gain > 2.0) {
      if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';
      alerts.push({
        type: 'WEIGHT_RAPID_GAIN',
        severity: 'WARNING',
        title: `Rapid Weight Gain (+${gain.toFixed(1)} kg in ${daysDiff} days)`,
        message: 'Sudden weight gain of over 2.0 kg within 2 weeks is a classic warning sign of fluid retention and occult edema associated with preeclampsia.',
        action: 'Check Face / Extremities for Pitting Edema',
      });
    }
  }

  // 6. Maternal Age Risk Categorization
  const ageNum = parseInt(age, 10);
  if (!isNaN(ageNum)) {
    if (ageNum < 18) {
      alerts.push({
        type: 'AGE_ADOLESCENT',
        severity: 'WARNING',
        title: `Adolescent Pregnancy (Age: ${ageNum})`,
        message: 'Philippine DOH categorized high-risk pregnancy. Higher incidence of preeclampsia, cephalopelvic disproportion (CPD), and preterm labor.',
      });
    } else if (ageNum >= 35) {
      alerts.push({
        type: 'AGE_AMA',
        severity: 'WARNING',
        title: `Advanced Maternal Age (Age: ${ageNum})`,
        message: 'Increased clinical vigilance required for gestational diabetes, chronic hypertension, and placental abnormalities.',
      });
    }
  }

  return {
    isSafe: alerts.length === 0,
    hasCriticalAlert: highestSeverity === 'CRITICAL',
    hasWarningAlert: highestSeverity === 'WARNING',
    highestSeverity,
    alerts,
    alertCount: alerts.length,
    shouldFlagHighRisk: highestSeverity === 'CRITICAL' || highestSeverity === 'WARNING',
  };
}

/**
 * Evaluates Prenatal Laboratory Results for Clinical Abnormalities.
 * 
 * @param {object} labs - Prenatal lab parameters
 * @returns {object} Evaluation results and critical anomaly flags
 */
export function evaluatePrenatalLabResults(labs = {}) {
  const anomalies = [];

  // Hemoglobin
  const hb = parseFloat(labs.hemoglobin);
  if (!isNaN(hb)) {
    if (hb < 7.0) {
      anomalies.push({
        field: 'hemoglobin',
        severity: 'CRITICAL',
        title: `Severe Anemia (${hb} g/dL)`,
        message: 'Critically low hemoglobin. Urgent transfusion evaluation and hematology referral indicated.',
      });
    } else if (hb < 10.5) {
      anomalies.push({
        field: 'hemoglobin',
        severity: 'WARNING',
        title: `Maternal Anemia (${hb} g/dL)`,
        message: 'Hemoglobin below 10.5 g/dL. Prescribe therapeutic iron and folic acid; recheck in 4 weeks.',
      });
    }
  }

  // Urinalysis Protein
  const protein = (labs.urinalysis_protein || '').trim().toLowerCase();
  if (['1+', '2+', '3+', '4+', 'positive'].includes(protein)) {
    anomalies.push({
      field: 'urinalysis_protein',
      severity: ['2+', '3+', '4+'].includes(protein) ? 'CRITICAL' : 'WARNING',
      title: `Proteinuria Detected (${labs.urinalysis_protein})`,
      message: 'Urinary protein detected. Correlate immediately with blood pressure to evaluate for preeclampsia.',
    });
  }

  // Urinalysis Glucose
  const glucose = (labs.urinalysis_glucose || '').trim().toLowerCase();
  if (['1+', '2+', '3+', '4+', 'positive'].includes(glucose)) {
    anomalies.push({
      field: 'urinalysis_glucose',
      severity: 'WARNING',
      title: `Glycosuria Detected (${labs.urinalysis_glucose})`,
      message: 'Glucose in urine. Order 75g Oral Glucose Tolerance Test (OGTT) to rule out Gestational Diabetes.',
    });
  }

  // Rh Blood Type
  const bloodType = (labs.blood_type || '').trim().toUpperCase();
  if (bloodType.endsWith('-') || bloodType.includes('RH-') || bloodType.includes('RH NEGATIVE')) {
    anomalies.push({
      field: 'blood_type',
      severity: 'WARNING',
      title: `Rh-Negative Mother (${bloodType})`,
      message: 'Risk of maternal isoimmunization. Screen for anti-D antibodies; administer Rho(D) Immune Globulin (RhoGAM) at 28 weeks and post-delivery.',
    });
  }

  // Hepatitis B Surface Antigen (HBsAg)
  const hbsag = (labs.hbsag_status || '').trim().toLowerCase();
  if (hbsag === 'reactive' || hbsag === 'positive') {
    anomalies.push({
      field: 'hbsag_status',
      severity: 'CRITICAL',
      title: 'Hepatitis B Surface Antigen Reactive',
      message: 'Newborn MUST receive Hepatitis B Vaccine AND Hepatitis B Immune Globulin (HBIG) within 12 hours of delivery to prevent vertical transmission.',
    });
  }

  // Syphilis (VDRL / RPR)
  const syphilis = (labs.vdrl_rpr_status || '').trim().toLowerCase();
  if (syphilis === 'reactive' || syphilis === 'positive') {
    anomalies.push({
      field: 'vdrl_rpr_status',
      severity: 'CRITICAL',
      title: 'Syphilis Screen (VDRL/RPR) Reactive',
      message: 'Positive syphilis screen. Maternal Benzathine Penicillin G treatment regimen required to prevent congenital syphilis.',
    });
  }

  // 75g OGTT (Gestational Diabetes Screening)
  const fbs = parseFloat(labs.ogtt_fasting);
  const ogtt1 = parseFloat(labs.ogtt_1hr);
  const ogtt2 = parseFloat(labs.ogtt_2hr);

  const gdmTriggers = [];
  if (!isNaN(fbs) && fbs >= 92) gdmTriggers.push(`Fasting ${fbs} mg/dL (≥92)`);
  if (!isNaN(ogtt1) && ogtt1 >= 180) gdmTriggers.push(`1-Hour ${ogtt1} mg/dL (≥180)`);
  if (!isNaN(ogtt2) && ogtt2 >= 153) gdmTriggers.push(`2-Hour ${ogtt2} mg/dL (≥153)`);

  if (gdmTriggers.length > 0) {
    anomalies.push({
      field: 'ogtt',
      severity: 'WARNING',
      title: 'Gestational Diabetes Mellitus (GDM) Criteria Met',
      message: `OGTT thresholds exceeded: ${gdmTriggers.join(', ')}. Dietary counseling, glucose monitoring, and endocrinology co-management indicated.`,
    });
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    anomaliesCount: anomalies.length,
    criticalCount: anomalies.filter(a => a.severity === 'CRITICAL').length,
  };
}

/**
 * Calculates Philippine DOH EINC & Newborn Care Protocol Compliance Score.
 * 
 * @param {object} postpartumRecord - Postpartum and newborn data
 * @returns {object} Compliance metrics and missing mandatory interventions
 */
export function checkDOHNewbornProtocols(postpartumRecord = {}) {
  const checklist = [
    {
      id: 'skin_to_skin',
      label: 'Immediate Skin-to-Skin Contact (Unang Yakap)',
      done: !!postpartumRecord.skin_to_skin_initiated,
      category: 'EINC Core Step',
      mandatory: true,
    },
    {
      id: 'cord_care',
      label: 'Properly Timed Cord Clamping & Clean Cord Care',
      done: !!postpartumRecord.cord_care_done,
      category: 'EINC Core Step',
      mandatory: true,
    },
    {
      id: 'early_breastfeeding',
      label: 'Early Breastfeeding Initiation (< 1 Hour)',
      done: !!postpartumRecord.early_breastfeeding_initiated,
      category: 'EINC Core Step',
      mandatory: true,
    },
    {
      id: 'vit_k',
      label: 'Vitamin K Prophylaxis (1 mg IM)',
      done: !!postpartumRecord.vit_k_given,
      category: 'Prophylaxis',
      mandatory: true,
    },
    {
      id: 'eye_prophylaxis',
      label: 'Erythromycin Eye Prophylaxis',
      done: !!postpartumRecord.eye_prophylaxis_given,
      category: 'Prophylaxis',
      mandatory: true,
    },
    {
      id: 'hepb',
      label: 'Hepatitis B Birth Dose (< 24 Hours)',
      done: !!postpartumRecord.hepb_given,
      category: 'Immunization',
      mandatory: true,
      date: postpartumRecord.hepb_date,
    },
    {
      id: 'bcg',
      label: 'BCG Immunization',
      done: !!postpartumRecord.bcg_given,
      category: 'Immunization',
      mandatory: true,
      date: postpartumRecord.bcg_date,
    },
    {
      id: 'nbs',
      label: 'Newborn Screening (NBS Card)',
      done: !!(postpartumRecord.nbs_filter_card_number && postpartumRecord.nbs_status !== 'Pending'),
      category: 'Screening',
      mandatory: true,
      cardNo: postpartumRecord.nbs_filter_card_number,
      status: postpartumRecord.nbs_status,
    },
    {
      id: 'hearing',
      label: 'Newborn Hearing Screening',
      done: postpartumRecord.hearing_screening_status === 'Passed' || postpartumRecord.hearing_screening_status === 'Refer',
      category: 'Screening',
      mandatory: false,
      status: postpartumRecord.hearing_screening_status,
    },
  ];

  const total = checklist.length;
  const completed = checklist.filter(c => c.done).length;
  const percentage = Math.round((completed / total) * 100);
  const pendingMandatory = checklist.filter(c => c.mandatory && !c.done);

  return {
    checklist,
    total,
    completed,
    percentage,
    isFullyCompliant: pendingMandatory.length === 0,
    pendingMandatory,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL INPUT VALIDATION SCHEMAS (ZOD)
// ─────────────────────────────────────────────────────────────────────────────

export const visitLogValidationSchema = z.object({
  patient_id: z.string().uuid('Invalid Patient UUID'),
  maternal_episode_id: z.string().uuid().nullable().optional(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be YYYY-MM-DD'),
  bp: z.string().regex(/^\d{2,3}\s*[\/\-]\s*\d{2,3}$/, 'BP must be in format 120/80'),
  weight: z.coerce.number().min(30, 'Weight must be ≥ 30 kg').max(200, 'Weight must be ≤ 200 kg'),
  temp: z.coerce.number().min(30).max(45).nullable().optional(),
  pr: z.coerce.number().int().min(30).max(220).nullable().optional(),
  rr: z.coerce.number().int().min(8).max(60).nullable().optional(),
  fh: z.coerce.number().min(5).max(50).nullable().optional(),
  fht: z.coerce.number().int().min(50).max(250).nullable().optional(),
  doctor_notes: z.string().min(2, 'Clinical observations note is required'),
});

export const prenatalLabValidationSchema = z.object({
  patient_id: z.string().uuid('Invalid Patient UUID'),
  maternal_episode_id: z.string().uuid().nullable().optional(),
  test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Test date must be YYYY-MM-DD'),
  hemoglobin: z.coerce.number().min(1.0).max(25.0).nullable().optional(),
  hematocrit: z.coerce.number().min(5.0).max(75.0).nullable().optional(),
  blood_type: z.string().max(10).nullable().optional(),
  urinalysis_protein: z.string().max(20).nullable().optional(),
  urinalysis_glucose: z.string().max(20).nullable().optional(),
  hbsag_status: z.enum(['Non-Reactive', 'Reactive', 'Pending']).default('Pending'),
  vdrl_rpr_status: z.enum(['Non-Reactive', 'Reactive', 'Pending']).default('Pending'),
  hiv_screening_status: z.enum(['Non-Reactive', 'Reactive', 'Pending', 'Declined']).default('Pending'),
  ogtt_fasting: z.coerce.number().min(20).max(500).nullable().optional(),
  ogtt_1hr: z.coerce.number().min(20).max(500).nullable().optional(),
  ogtt_2hr: z.coerce.number().min(20).max(500).nullable().optional(),
});
