// lib/clinical-schemas.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN MATERNITY CLINIC: CLINICAL DATA VALIDATION SCHEMAS (ZOD)
// Standardizes data structures, normal clinical ranges, and unit consistency
// in accordance with DOH BEmONC and maternal lying-in clinical standards.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

/**
 * Validates clinical maternal vital signs
 */
export const VitalSignsSchema = z.object({
  systolic_bp: z.number().int().min(60, "Systolic BP below physiological minimum (60)").max(260, "Systolic BP above physiological maximum (260)"),
  diastolic_bp: z.number().int().min(30, "Diastolic BP below physiological minimum (30)").max(160, "Diastolic BP above physiological maximum (160)"),
  weight_kg: z.number().min(25.0, "Weight below minimum (25 kg)").max(250.0, "Weight above maximum (250 kg)"),
  temperature_c: z.number().min(34.0).max(43.0).optional().nullable(),
  pulse_rate_bpm: z.number().int().min(40).max(200).optional().nullable(),
  respiratory_rate_bpm: z.number().int().min(8).max(50).optional().nullable(),
  fundic_height_cm: z.number().min(10).max(50).optional().nullable(),
  fetal_heart_tone_bpm: z.number().int().min(80).max(220).optional().nullable(),
});

/**
 * Validates prenatal modular data stored in prenatal_records.modular_data
 */
export const ModularPrenatalDataSchema = z.object({
  risk_factors: z.array(z.string()).default([]),
  birth_plan_agreed: z.boolean().default(false),
  tt_vaccination_status: z.enum(["TT1", "TT2", "TT3", "TT4", "TT5", "None"]).default("None"),
  deworming_given: z.boolean().default(false),
  iron_folic_tablets_count: z.number().int().min(0).default(0),
  calcium_carbonate_tablets_count: z.number().int().min(0).default(0),
  doh_unang_yakap_briefing: z.boolean().default(false),
  preferred_feeding_method: z.enum(["Exclusive Breastfeeding", "Mixed", "Formula"]).default("Exclusive Breastfeeding"),
  clinical_notes: z.string().optional().default(""),
}).passthrough();

/**
 * Parses and safely formats blood pressure string "120/80" into typed components
 * @param {string} bpStr 
 * @returns {{ systolic: number|null, diastolic: number|null, isValid: boolean }}
 */
export function parseBloodPressure(bpStr) {
  if (!bpStr || typeof bpStr !== "string" || !bpStr.includes("/")) {
    return { systolic: null, diastolic: null, isValid: false };
  }
  const parts = bpStr.split("/");
  const systolic = parseInt(parts[0]?.trim(), 10);
  const diastolic = parseInt(parts[1]?.trim(), 10);

  if (isNaN(systolic) || isNaN(diastolic)) {
    return { systolic: null, diastolic: null, isValid: false };
  }

  const isValid = systolic >= 60 && systolic <= 260 && diastolic >= 30 && diastolic <= 160;
  return { systolic, diastolic, isValid };
}

/**
 * Parses and validates weight string e.g. "55.4"
 * @param {string|number} weightVal 
 * @returns {{ weightKg: number|null, isValid: boolean }}
 */
export function parseWeight(weightVal) {
  if (!weightVal) return { weightKg: null, isValid: false };
  const num = typeof weightVal === "number" ? weightVal : parseFloat(String(weightVal).trim());
  if (isNaN(num)) return { weightKg: null, isValid: false };
  const isValid = num >= 25.0 && num <= 250.0;
  return { weightKg: num, isValid };
}
