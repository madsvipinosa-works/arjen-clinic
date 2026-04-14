// app/actions.js
// This file contains Next.js "Server Actions".
// Server Actions run ONLY on the server (inside Node.js), never in the browser.
// They are the recommended way to write data-mutation logic in the App Router.

'use server'; // This directive tells Next.js: everything in this file is server-only.

import supabase from '@/utils/supabase';
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * createVisitLog(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE : Save a new prenatal visit log entry to the Supabase database.
 * CALLED  : From a <form action={createVisitLog}> in any React Server Component,
 *           or via startTransition / useFormState on the client.
 *
 * HOW IT WORKS:
 *   1. formData is a native FormData object — the same kind browsers send on form submit.
 *   2. We use formData.get('field_name') to read each input value by its HTML `name`.
 *   3. We build a plain JS object with the extracted values.
 *   4. We send that object to Supabase with .insert().
 *   5. We return a simple result object { success, error } so the UI can respond.
 *
 * @param {FormData} formData - Automatically provided by Next.js from the HTML form.
 * @returns {{ success: boolean, error: string|null }}
 */
export async function createVisitLog(formData) {
  // ── Step 1: Extract values from the form ─────────────────────────────────
  // formData.get() reads the value of an <input name="..."> field.
  const patientId  = formData.get('patient_id');   // hidden input in the form
  const visitDate  = formData.get('visit_date');    // <input type="date">
  const bloodPressure = formData.get('blood_pressure'); // e.g. "120/80"
  const weight     = formData.get('weight');        // e.g. "58 kg"
  const notes      = formData.get('notes');         // textarea

  // ── Step 2: Simple validation ────────────────────────────────────────────
  // Make sure required fields are not empty before writing to the database.
  if (!patientId || !visitDate) {
    return { success: false, error: 'Patient ID and visit date are required.' };
  }

  // ── Step 3: Build the data object to insert ──────────────────────────────
  // This object's keys must match the column names in your Supabase 'visit_logs' table.
  const newLog = {
    patient_id:     patientId,
    visit_date:     visitDate,
    blood_pressure: bloodPressure,
    weight:         weight,
    notes:          notes,
    created_at:     new Date().toISOString(), // record when this was saved
  };

  // ── Step 4: Insert into Supabase ─────────────────────────────────────────
  // supabase.from('visit_logs') → target the 'visit_logs' table
  // .insert(newLog)             → add the new row
  // We destructure the response into { data, error }
  const { data, error } = await supabase
    .from('visit_logs')
    .insert(newLog);

  // ── Step 5: Handle the result ────────────────────────────────────────────
  if (error) {
    // Log server-side for debugging; return a safe message to the UI
    console.error('[createVisitLog] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  // If everything went well, return success so the UI can show a confirmation
  return { success: true, error: null };
}

/**
 * createPatient(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE : Register a new patient in the database.
 * This follows the exact same pattern as createVisitLog — extract, validate, insert.
 *
 * @param {FormData} formData
 * @returns {{ success: boolean, error: string|null }}
 */
export async function createPatient(formData) {
  // ── Step 1: Extract ───────────────────────────────────────────────────────
  const name      = formData.get('name');
  const age       = formData.get('age');
  const address   = formData.get('address');
  const contact   = formData.get('contact');
  const bloodType = formData.get('blood_type');
  const lmp       = formData.get('lmp'); // Last Menstrual Period

  // ── Step 2: Validate ──────────────────────────────────────────────────────
  if (!name || !lmp) {
    return { success: false, error: 'Patient name and LMP are required.' };
  }

  // ── Step 3: Build the object ──────────────────────────────────────────────
  const newPatient = {
    name,
    age:        age ? parseInt(age, 10) : null, // convert string → number
    address,
    contact,
    blood_type: bloodType,
    lmp,
    created_at: new Date().toISOString(),
  };

  // ── Step 4: Insert into Supabase ──────────────────────────────────────────
  const { data, error } = await supabase
    .from('patients')
    .insert(newPatient);

  // ── Step 5: Return result ──────────────────────────────────────────────────
  if (error) {
    console.error('[createPatient] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * updateAppointmentStatus(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE : Admin function to update the status of an appointment (e.g. Pending -> Approved).
 *
 * @param {FormData} formData
 */
export async function updateAppointmentStatus(formData) {
  const supabaseServer = await createClient();
  
  const appointment_id = formData.get('appointment_id');
  const status = formData.get('status');

  if (!appointment_id || !status) return;

  const { error } = await supabaseServer
    .from('appointments')
    .update({ status })
    .eq('id', appointment_id);

  if (error) {
    console.error('[updateAppointmentStatus] error:', error.message);
  }

  // Refresh the admin dashboard so the new status reflects immediately
  revalidatePath('/admin');
}

