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

  // Refresh both the dashboard and the dedicated appointments list
  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
}

/**
 * addVisitLog(formData)
 * Extracts patient_id, bp, weight, and doctor_notes. Inserts into visit_logs.
 */
export async function addVisitLog(formData) {
  const supabaseServer = await createClient();
  
  const patient_id = formData.get('patient_id');
  const bp = formData.get('bp');
  const weight = formData.get('weight');
  const doctor_notes = formData.get('doctor_notes');

  // Hardcode visit_date for the MVP since instructions only listed these 4 extraction fields
  // In a real app we might get the date string from an input.
  const visit_date = new Date().toISOString().split('T')[0];

  if (!patient_id) return;

  const { error } = await supabaseServer
    .from('visit_logs')
    .insert({ patient_id, bp, weight, doctor_notes, visit_date });

  if (error) {
    console.error('[addVisitLog] error:', error.message);
  }

  // Refresh dynamic route
  revalidatePath('/admin/patients/[id]', 'page');
}

/**
 * updateBirthPlan(formData)
 * Extracts patient_id, delivery_location, and birth_attendant. Upserts into birth_plans.
 */
export async function updateBirthPlan(formData) {
  const supabaseServer = await createClient();
  
  const patient_id = formData.get('patient_id');
  const delivery_location = formData.get('delivery_location');
  const birth_attendant = formData.get('birth_attendant');

  if (!patient_id) return;

  // Uses upsert. It targets patient_id.
  const { error } = await supabaseServer
    .from('birth_plans')
    .upsert({ patient_id, delivery_location, birth_attendant }, { onConflict: 'patient_id' });

  if (error) {
    console.error('[updateBirthPlan] error:', error.message);
  }

  revalidatePath('/admin/patients/[id]', 'page');
}

/**
 * updatePrenatal(formData)
 * Extracts patient_id, health_history, and lab_results. Upserts into prenatal_records.
 */
export async function updatePrenatal(formData) {
  const supabaseServer = await createClient();
  
  const patient_id = formData.get('patient_id');
  // Form input values return strings. Parsing them to JSON depending on form setup.
  // For the MVP, we can assume text/string.
  const health_history = formData.get('health_history');
  const lab_results = formData.get('lab_results');

  if (!patient_id) return;

  const { error } = await supabaseServer
    .from('prenatal_records')
    .upsert({ 
      patient_id, 
      health_history: { details: health_history }, 
      lab_results: { details: lab_results } 
    }, { onConflict: 'patient_id' });

  if (error) {
    console.error('[updatePrenatal] error:', error.message);
  }

  revalidatePath('/admin/patients/[id]', 'page');
}

/**
 * updateSettings(formData)
 * Overrides the default capacity bounds for daily bookings
 */
export async function updateSettings(formData) {
  const supabaseServer = await createClient();
  const max_morning_slots = parseInt(formData.get('max_morning_slots') || 10, 10);
  const max_afternoon_slots = parseInt(formData.get('max_afternoon_slots') || 10, 10);

  await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    max_morning_slots,
    max_afternoon_slots
  });

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * addBlockedDate(formData)
 * Locks a specific date from being selected publicly
 */
export async function addBlockedDate(formData) {
  const supabaseServer = await createClient();
  const blocked_date = formData.get('blocked_date');
  const reason = formData.get('reason');

  if (blocked_date) {
    await supabaseServer.from('blocked_dates').insert({ blocked_date, reason });
  }

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * removeBlockedDate(formData)
 * Restores public access to a previously blocked date
 */
export async function removeBlockedDate(formData) {
  const supabaseServer = await createClient();
  const id = formData.get('id');
  if (id) {
    await supabaseServer.from('blocked_dates').delete().eq('id', id);
  }
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * addTimeSlot(formData)
 * Adds a new configurable clinic time slot
 */
export async function addTimeSlot(formData) {
  const supabaseServer = await createClient();
  const start_time = formData.get('start_time'); // e.g. "07:30"
  const end_time   = formData.get('end_time');   // e.g. "08:30"
  const max_capacity = parseInt(formData.get('max_capacity') || 10, 10);

  if (!start_time || !end_time) return;

  // Format 24h time → "7:30 AM" style label automatically
  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  const label = `${formatTime(start_time)} - ${formatTime(end_time)}`;

  const { data: maxOrder } = await supabaseServer
    .from('time_slots').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
  const sort_order = (maxOrder?.sort_order || 0) + 1;

  await supabaseServer.from('time_slots').insert({ label, max_capacity, sort_order });

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * deleteTimeSlot(formData)
 * Permanently removes a time slot 
 */
export async function deleteTimeSlot(formData) {
  const supabaseServer = await createClient();
  const id = formData.get('id');
  if (id) {
    await supabaseServer.from('time_slots').delete().eq('id', id);
  }
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * updateTimeSlotCapacity(formData)
 * Updates the max patient capacity on a specific time slot
 */
export async function updateTimeSlotCapacity(formData) {
  const supabaseServer = await createClient();
  const id = formData.get('id');
  const max_capacity = parseInt(formData.get('max_capacity') || 10, 10);
  if (id) {
    await supabaseServer.from('time_slots').update({ max_capacity }).eq('id', id);
  }
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * toggleSaturdayBlock(formData)
 */
export async function toggleSaturdayBlock(formData) {
  const supabaseServer = await createClient();
  const block_saturday = formData.get('block_saturday') === 'true';
  await supabaseServer.from('clinic_settings').update({ block_saturday }).eq('id', 1);
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * toggleSundayBlock(formData)
 */
export async function toggleSundayBlock(formData) {
  const supabaseServer = await createClient();
  const block_sunday = formData.get('block_sunday') === 'true';
  await supabaseServer.from('clinic_settings').update({ block_sunday }).eq('id', 1);
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}
