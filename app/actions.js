// app/actions.js
// This file contains Next.js "Server Actions".
// Server Actions run ONLY on the server (inside Node.js), never in the browser.
// They are the recommended way to write data-mutation logic in the App Router.

'use server'; // This directive tells Next.js: everything in this file is server-only.

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  calculateObstetricDates, 
  evaluateMaternalVitalsSafety,
  visitLogValidationSchema,
  prenatalLabValidationSchema
} from "@/lib/clinical-protocols";
import {
  invoiceValidationSchema,
  philhealthClaimValidationSchema,
  calculatePhilHealthDeadline
} from "@/lib/billing-protocols";
import { logAuditEvent } from "@/lib/audit-logger";
import { isStaff, canAccessClinicalRecords, canManageSystemSettings } from "@/lib/rbac";


// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function verifyAdmin() {
  const supabaseServer = await createClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  if (authError || !user) return false;
  
  const { data: userData } = await supabaseServer
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return userData && isStaff(userData.role);
}

async function verifyAuth() {
  const supabaseServer = await createClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  return !authError && !!user;
}


/**
 * createVisitLog(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE : Save a new prenatal visit log entry to the Supabase database.
 * CALLED  : From a <form action={createVisitLog}> in any React Server Component,
 *           or via startTransition / useFormState on the client.
 */
export async function createVisitLog(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };
  
  const patientId  = formData.get('patient_id');  
  const visitDate  = formData.get('visit_date');  
  const bloodPressure = formData.get('blood_pressure'); 
  const weight     = formData.get('weight');       
  const notes      = formData.get('notes');        

  if (!patientId || !visitDate) {
    return { success: false, error: 'Patient ID and visit date are required.' };
  }

  const newLog = {
    patient_id:     patientId,
    visit_date:     visitDate,
    blood_pressure: bloodPressure,
    weight:         weight,
    notes:          notes,
    created_at:     new Date().toISOString(), 
  };

  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from('visit_logs')
    .insert(newLog);

  if (error) {
    console.error('[createVisitLog] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * createPatient(formData)
 */
export async function createPatient(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const full_name           = formData.get('full_name');
  const date_of_birth       = formData.get('date_of_birth') || null;
  const age                 = formData.get('age');
  const civil_status        = formData.get('civil_status') || null;
  const husband_partner_name = formData.get('husband_partner_name') || null;
  const address             = formData.get('address') || null;
  const contact_number      = formData.get('contact_number') || null;
  const blood_type          = formData.get('blood_type') || null;
  const allergies           = formData.get('allergies') || null;
  const is_high_risk        = formData.get('is_high_risk') === 'on' || formData.get('is_high_risk') === 'true';

  if (!full_name) {
    return { success: false, error: 'Patient full name is required.' };
  }

  const newPatient = {
    full_name,
    date_of_birth,
    age: age ? parseInt(age, 10) : null,
    civil_status,
    husband_partner_name,
    address,
    contact_number,
    blood_type,
    allergies,
    is_high_risk,
    created_at: new Date().toISOString(),
  };

  const supabaseServer = await createClient();
  const { data: patientRow, error } = await supabaseServer
    .from('patients')
    .insert(newPatient)
    .select('id')
    .single();

  if (error) {
    console.error('[createPatient] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  // Auto-create a prenatal_records row so modular records work immediately
  await supabaseServer
    .from('prenatal_records')
    .insert({ patient_id: patientRow.id, modular_data: {} });

  revalidatePath('/admin/patients');
  redirect('/admin/patients');
}

/**
 * updatePatient(formData)
 * Updates an existing patient's demographic and clinical profile.
 */
export async function updatePatient(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id = formData.get('id');

  if (!id) return { success: false, error: 'Missing patient ID.' };

  const updateData = {
    full_name:             formData.get('full_name'),
    date_of_birth:         formData.get('date_of_birth') || null,
    age:                   formData.get('age') ? parseInt(formData.get('age'), 10) : null,
    civil_status:          formData.get('civil_status') || null,
    husband_partner_name:  formData.get('husband_partner_name') || null,
    address:               formData.get('address') || null,
    contact_number:        formData.get('contact_number') || null,
    blood_type:            formData.get('blood_type') || null,
    allergies:             formData.get('allergies') || null,
    is_high_risk:          formData.get('is_high_risk') === 'on' || formData.get('is_high_risk') === 'true',
  };

  const { error } = await supabaseServer
    .from('patients')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('[updatePatient] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/patients/${id}`);
  revalidatePath('/admin/patients');
  return { success: true };
}

/**
 * createMaternalEpisode(formData)
 */
export async function createMaternalEpisode(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  
  if (!patient_id) return { success: false, error: 'Missing patient ID' };
  
  const lmp = formData.get('lmp') || null;
  const edc = lmp
    ? new Date(new Date(lmp).getTime() + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;
    
  const newEpisode = {
    patient_id,
    lmp,
    edc,
    gravida: formData.get('gravida') ? parseInt(formData.get('gravida'), 10) : null,
    para: formData.get('para') ? parseInt(formData.get('para'), 10) : null,
    status: formData.get('status') || 'Active'
  };
  
  const { error } = await supabaseServer.from('maternal_episodes').insert(newEpisode);
  
  if (error) {
    console.error('[createMaternalEpisode] error:', error.message);
    return { success: false, error: error.message };
  }
  
  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * updateMaternalEpisode(formData)
 */
export async function updateMaternalEpisode(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  const patient_id = formData.get('patient_id');
  
  if (!id) return { success: false, error: 'Missing episode ID' };
  
  const lmp = formData.get('lmp') || null;
  const edc = lmp
    ? new Date(new Date(lmp).getTime() + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;
    
  const updateData = {
    lmp,
    edc,
    gravida: formData.get('gravida') ? parseInt(formData.get('gravida'), 10) : null,
    para: formData.get('para') ? parseInt(formData.get('para'), 10) : null,
    status: formData.get('status') || 'Active'
  };
  
  const { error } = await supabaseServer.from('maternal_episodes').update(updateData).eq('id', id);
  
  if (error) {
    console.error('[updateMaternalEpisode] error:', error.message);
    return { success: false, error: error.message };
  }
  
  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * updateModularData(formData)
 * Saves a single module's content into the patient's prenatal_records.modular_data JSONB.
 * Uses upsert so it works even if no prenatal_records row exists yet.
 */
export async function updateModularData(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id  = formData.get('patient_id');
  const module_id   = formData.get('module_id');
  const content     = formData.get('content');

  if (!patient_id || !module_id) return { success: false, error: 'Missing patient_id or module_id.' };

  // Fetch existing modular_data first so we can merge, not overwrite
  const { data: existing } = await supabaseServer
    .from('prenatal_records')
    .select('modular_data')
    .eq('patient_id', patient_id)
    .single();

  const currentData = existing?.modular_data || {};
  const updatedData = {
    ...currentData,
    [module_id]: {
      content,
      updated_at: new Date().toISOString(),
    },
  };

  // Upsert — inserts if no row, updates if row exists
  const { error } = await supabaseServer
    .from('prenatal_records')
    .upsert(
      { patient_id, modular_data: updatedData },
      { onConflict: 'patient_id' }
    );

  if (error) {
    console.error('[updateModularData] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * updateAppointmentStatus(formData)
 */
export async function updateAppointmentStatus(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const appointment_id = formData.get('appointment_id');
  const status = formData.get('status');
  const attending_staff_id = formData.get('attending_staff_id');

  if (!appointment_id || !status) return;

  const updatePayload = { status };
  if (attending_staff_id) {
    updatePayload.attending_staff_id = attending_staff_id;
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updatePayload)
    .eq('id', appointment_id);

  if (error) {
    console.error('[updateAppointmentStatus] error:', error.message);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
}

/**
 * updateTriageStatus(appointmentId, newStatus)
 * PURPOSE : Update the intra-day triage status of an appointment (Waiting, Vital Signs, Consultation, Discharged)
 */
export async function updateTriageStatus(appointmentId, newStatus) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  let apptId = appointmentId;
  let status = newStatus;
  if (appointmentId instanceof FormData) {
    apptId = appointmentId.get('appointment_id');
    status = appointmentId.get('triage_status');
  }

  if (!apptId || !status) {
    return { success: false, error: 'Appointment ID and triage status are required.' };
  }

  const validStatuses = ['Waiting', 'Vital Signs', 'Consultation', 'Discharged'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid triage status: ${status}` };
  }

  const supabaseServer = await createClient();
  const updatePayload = { triage_status: status };
  
  // Smart Dual-State Sync: Discharging a patient marks as Completed;
  // Moving back to an active triage lane (Waiting, Vital Signs, Consultation) marks as Approved!
  if (status === 'Discharged') {
    updatePayload.status = 'Completed';
  } else {
    updatePayload.status = 'Approved';
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updatePayload)
    .eq('id', apptId);

  if (error) {
    console.error('[updateTriageStatus] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'UPDATE_TRIAGE_STATUS',
    entityType: 'appointments',
    entityId: apptId,
    details: {
      appointment_id: apptId,
      new_status: status,
      synced_status: updatePayload.status,
    }
  });

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
  revalidatePath('/queue');
  return { success: true };
}

/**
 * fetchAppointments({ startDate, endDate, statusFilter, range })
 * Optimized query to retrieve appointments with historical date ranges and status filtering.
 */
export async function fetchAppointments({ startDate, endDate, statusFilter, range = 'all' } = {}) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const todayStr = getClinicTodayDateString();
  const today = new Date();

  let query = supabaseServer
    .from("appointments")
    .select(`
      id,
      service_type,
      appointment_date,
      time_preference,
      notes,
      status,
      triage_status,
      attending_staff_id,
      is_walk_in,
      queue_ticket_number,
      checked_in_at,
      created_at,
      patients (
        id,
        full_name,
        contact_number,
        is_high_risk,
        allergies
      )
    `);

  if (statusFilter && statusFilter !== 'all' && statusFilter !== 'All') {
    query = query.eq('status', statusFilter);
  }

  if (range === 'today') {
    query = query.eq('appointment_date', todayStr);
  } else if (range === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    query = query.eq('appointment_date', y.toISOString().split('T')[0]);
  } else if (range === 'week') {
    const w = new Date(today);
    w.setDate(w.getDate() - 7);
    query = query.gte('appointment_date', w.toISOString().split('T')[0]);
  } else if (range === 'month') {
    const m = new Date(today);
    m.setDate(m.getDate() - 30);
    query = query.gte('appointment_date', m.toISOString().split('T')[0]);
  } else if (range === 'custom') {
    if (startDate) query = query.gte('appointment_date', startDate);
    if (endDate) query = query.lte('appointment_date', endDate);
  } else if (startDate || endDate) {
    if (startDate) query = query.gte('appointment_date', startDate);
    if (endDate) query = query.lte('appointment_date', endDate);
  }

  query = query.order('appointment_date', { ascending: false }).order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('[fetchAppointments] error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, appointments: data || [] };
}

/**
 * generateNextQueueTicket(supabaseServer, dateStr)
 * Computes the next daily sequential ticket number e.g. 'Q-01', 'Q-02'
 */
async function generateNextQueueTicket(supabaseServer, dateStr) {
  const { data: existingTickets, error } = await supabaseServer
    .from('appointments')
    .select('queue_ticket_number')
    .eq('appointment_date', dateStr)
    .not('queue_ticket_number', 'is', null);

  if (error) {
    console.error('[generateNextQueueTicket] query error:', error.message);
  }

  let nextNum = 1;
  if (existingTickets && existingTickets.length > 0) {
    const numbers = existingTickets
      .map(t => {
        const match = (t.queue_ticket_number || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    if (numbers.length > 0) {
      nextNum = Math.max(...numbers) + 1;
    }
  }

  return `Q-${String(nextNum).padStart(2, '0')}`;
}

/**
 * searchPatientsForReception(query)
 * Allows reception staff to quickly search existing patients by name or contact number
 */
export async function searchPatientsForReception(query) {
  if (!(await verifyAdmin())) return [];
  if (!query || query.trim().length === 0) return [];

  const supabaseServer = await createClient();
  const cleanQ = query.trim();

  const { data, error } = await supabaseServer
    .from('patients')
    .select('id, full_name, contact_number, age, date_of_birth, allergies, is_high_risk')
    .or(`full_name.ilike.%${cleanQ}%,contact_number.ilike.%${cleanQ}%`)
    .limit(10);

  if (error) {
    console.error('[searchPatientsForReception] error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * checkInAppointment(appointmentId)
 * Generates queue ticket and moves appointment to Waiting triage lane
 */
export async function checkInAppointment(appointmentId) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };
  if (!appointmentId) return { success: false, error: 'Missing appointment ID' };

  const supabaseServer = await createClient();
  const todayStr = getClinicTodayDateString();

  const { data: appt, error: fetchErr } = await supabaseServer
    .from('appointments')
    .select('id, appointment_date, queue_ticket_number, status, triage_status')
    .eq('id', appointmentId)
    .single();

  if (fetchErr || !appt) {
    return { success: false, error: fetchErr?.message || 'Appointment not found' };
  }

  let ticketNumber = appt.queue_ticket_number;
  if (!ticketNumber) {
    ticketNumber = await generateNextQueueTicket(supabaseServer, todayStr);
  }

  const { error: updateErr } = await supabaseServer
    .from('appointments')
    .update({
      appointment_date: todayStr,
      queue_ticket_number: ticketNumber,
      status: 'Approved',
      triage_status: appt.triage_status === 'Discharged' ? 'Discharged' : (appt.triage_status || 'Waiting'),
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
  revalidatePath('/queue');
  return { success: true, ticketNumber };
}

/**
 * createWalkInAppointment(formData)
 * Sub-30s walk-in patient intake: auto-creates patient if new, assigns queue ticket #,
 * places directly into 'Waiting' or 'Vital Signs' triage lane.
 */
export async function createWalkInAppointment(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const todayStr = getClinicTodayDateString();
  const now = new Date();

  const patientMode = formData.get('patient_mode') || 'existing';
  let patientId = formData.get('patient_id');
  const serviceType = formData.get('service_type') || 'general';
  const notes = formData.get('notes') || '';
  const attendingStaffId = formData.get('attending_staff_id') || null;

  // Optional quick vitals right at reception
  const bp = formData.get('blood_pressure') || formData.get('bp');
  const weight = formData.get('weight');
  const temp = formData.get('temperature') || formData.get('temp');
  const hasVitals = !!(bp || weight || temp);

  // Auto determine AM/PM if not provided
  let timePref = formData.get('time_preference');
  if (!timePref) {
    timePref = now.getHours() < 12 ? 'Morning (AM)' : 'Afternoon (PM)';
  }

  // 1. Patient Resolution
  if (patientMode === 'new') {
    const fullName = formData.get('full_name');
    if (!fullName || !fullName.trim()) {
      return { success: false, error: 'Patient full name is required for new patient.' };
    }
    const contactNumber = formData.get('contact_number') || null;
    const age = formData.get('age');
    const allergies = formData.get('allergies') || null;
    const isHighRisk = formData.get('is_high_risk') === 'true' || formData.get('is_high_risk') === 'on';

    const { data: newPatient, error: patientErr } = await supabaseServer
      .from('patients')
      .insert({
        full_name: fullName.trim(),
        contact_number: contactNumber,
        age: age ? parseInt(age, 10) : null,
        allergies,
        is_high_risk: isHighRisk,
        created_at: now.toISOString(),
      })
      .select('id')
      .single();

    if (patientErr || !newPatient) {
      console.error('[createWalkInAppointment] Patient creation error:', patientErr?.message);
      return { success: false, error: patientErr?.message || 'Failed to create patient record' };
    }

    patientId = newPatient.id;

    // Auto-create prenatal_records row for clean consistency
    await supabaseServer
      .from('prenatal_records')
      .insert({ patient_id: patientId, modular_data: {} });
  }

  if (!patientId) {
    return { success: false, error: 'Please select an existing patient or fill in new patient details.' };
  }

  // 2. Queue Ticket Assignment
  const ticketNumber = await generateNextQueueTicket(supabaseServer, todayStr);

  // 3. Insert Appointment
  const initialTriage = hasVitals ? 'Vital Signs' : 'Waiting';
  const appointmentPayload = {
    patient_id: patientId,
    service_type: serviceType,
    appointment_date: todayStr,
    time_preference: timePref,
    notes: notes ? `[Walk-in] ${notes}` : '[Walk-in Patient]',
    status: 'Approved',
    triage_status: initialTriage,
    is_walk_in: true,
    queue_ticket_number: ticketNumber,
    checked_in_at: now.toISOString(),
  };

  if (attendingStaffId) {
    appointmentPayload.attending_staff_id = attendingStaffId;
  }

  const { data: createdAppt, error: apptErr } = await supabaseServer
    .from('appointments')
    .insert(appointmentPayload)
    .select('id')
    .single();

  if (apptErr) {
    console.error('[createWalkInAppointment] Appointment creation error:', apptErr.message);
    return { success: false, error: apptErr.message };
  }

  // 4. If reception entered quick vitals, log in visit_logs
  if (hasVitals) {
    const { data: { user } } = await supabaseServer.auth.getUser();
    await supabaseServer
      .from('visit_logs')
      .insert({
        patient_id: patientId,
        attending_staff_id: attendingStaffId || user?.id,
        bp: bp || null,
        weight: weight || null,
        temp: temp || null,
        doctor_notes: notes || 'Walk-in initial intake vitals',
        visit_date: todayStr,
        created_at: now.toISOString(),
      });
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'REGISTER_WALKIN',
    entityType: 'appointments',
    entityId: createdAppt.id,
    details: {
      patient_id: patientId,
      ticket_number: ticketNumber,
      service_type: serviceType,
      has_vitals: hasVitals,
    }
  });

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
  revalidatePath('/queue');

  return { 
    success: true, 
    appointmentId: createdAppt.id, 
    ticketNumber,
    patientId 
  };
}


/**
 * addVisitLog(formData)
 */
export async function addVisitLog(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  const patient_id          = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id') || null;
  const attending_staff_id  = user?.id;
  const bp                  = formData.get('bp');
  const weight              = formData.get('weight');
  const doctor_notes        = formData.get('doctor_notes');
  const visit_date          = formData.get('visit_date') || getClinicTodayDateString();

  // Clinical fields
  let aog_by_lmp   = formData.get('aog_by_lmp');
  const aog_by_utz   = formData.get('aog_by_utz') || null;
  const temp         = formData.get('temp') || null;
  const pr           = formData.get('pr') || null;
  const rr           = formData.get('rr') || null;
  const fh           = formData.get('fh') || null;
  const fht          = formData.get('fht') || null;
  const ie           = formData.get('ie') || null;
  const next_visit   = formData.get('next_visit') || null;

  if (!patient_id) return { success: false, error: 'Missing patient ID.' };

  // Runtime Zod Schema Validation
  const validationResult = visitLogValidationSchema.safeParse({
    patient_id,
    maternal_episode_id,
    visit_date,
    bp,
    weight,
    temp: temp || null,
    pr: pr || null,
    rr: rr || null,
    fh: fh || null,
    fht: fht || null,
    doctor_notes
  });

  if (!validationResult.success) {
    const errorMsg = validationResult.error.issues.map(i => i.message).join(', ');
    return { success: false, error: `Validation Error: ${errorMsg}` };
  }

  // Fetch patient profile, episode, and latest urinalysis protein for pre-eclampsia cross-referencing
  const [{ data: patient }, { data: episode }, { data: latestLabs }] = await Promise.all([
    supabaseServer.from('patients').select('id, age, is_high_risk').eq('id', patient_id).single(),
    maternal_episode_id 
      ? supabaseServer.from('maternal_episodes').select('id, lmp, edc, is_high_risk').eq('id', maternal_episode_id).single()
      : { data: null },
    supabaseServer
      .from('prenatal_lab_results')
      .select('urinalysis_protein')
      .eq('patient_id', patient_id)
      .order('test_date', { ascending: false })
      .limit(1)
  ]);

  // Dynamic AOG auto-calc if LMP is known and aog_by_lmp not provided
  let aogWeeks = null;
  let aogDays = null;
  let trimester = null;

  if (episode?.lmp) {
    const obst = calculateObstetricDates(episode.lmp, visit_date);
    if (obst.isValid) {
      aogWeeks = obst.aogWeeks;
      aogDays = obst.aogDays;
      trimester = obst.trimester;
      if (!aog_by_lmp) {
        aog_by_lmp = obst.aogFormatted;
      }
    }
  }

  const latestProtein = latestLabs?.[0]?.urinalysis_protein || null;

  // Safety trigger evaluation with pre-eclampsia triad cross-reference
  const safety = evaluateMaternalVitalsSafety({
    bp,
    weight,
    temp,
    pr,
    rr,
    fht,
    age: patient?.age,
    latestUrinalysisProtein: latestProtein,
  });

  const is_high_risk_alert = !safety.isSafe;
  const high_risk_reasons = safety.alerts.map(a => `${a.title}: ${a.action || a.message}`);

  const { error } = await supabaseServer
    .from('visit_logs')
    .insert({ 
      patient_id,
      maternal_episode_id,
      attending_staff_id,
      bp, 
      weight, 
      doctor_notes, 
      visit_date,
      aog_by_lmp,
      aog_by_utz,
      temp,
      pr,
      rr,
      fh,
      fht,
      ie,
      next_visit,
      is_high_risk_alert,
      high_risk_reasons,
      aog_weeks: aogWeeks,
      aog_days: aogDays,
      trimester
    });

  if (error) {
    console.error('[addVisitLog] error:', error.message);
    return { success: false, error: error.message };
  }

  // Stamping high risk across both patient profile and active pregnancy episode
  if (safety.shouldFlagHighRisk || formData.get('flag_high_risk') === 'true') {
    await Promise.all([
      supabaseServer
        .from('patients')
        .update({ is_high_risk: true })
        .eq('id', patient_id),
      maternal_episode_id
        ? supabaseServer
            .from('maternal_episodes')
            .update({ is_high_risk: true, high_risk_reasons })
            .eq('id', maternal_episode_id)
        : Promise.resolve()
    ]);
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'LOG_PRENATAL_VISIT',
    entityType: 'visit_logs',
    entityId: patient_id,
    details: {
      patient_id,
      maternal_episode_id,
      visit_date,
      bp,
      weight,
      is_high_risk_alert,
      high_risk_reasons,
      aog: aog_by_lmp || (aogWeeks ? `${aogWeeks} ${aogDays}/7` : null),
    }
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  revalidatePath('/admin/patients');
  revalidatePath('/admin/appointments');
  return { success: true, alerts: safety.alerts };
}

/**
 * addPrenatalLabResult(formData)
 * Saves structured prenatal laboratory panel results with automated clinical anomaly alerts.
 */
export async function addPrenatalLabResult(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  const patient_id           = formData.get('patient_id');
  const maternal_episode_id  = formData.get('maternal_episode_id') || null;
  const test_date            = formData.get('test_date') || getClinicTodayDateString();
  const laboratory_name      = formData.get('laboratory_name') || 'AR-JEN Clinic Laboratory';
  
  const hemoglobin           = formData.get('hemoglobin') ? parseFloat(formData.get('hemoglobin')) : null;
  const hematocrit           = formData.get('hematocrit') ? parseFloat(formData.get('hematocrit')) : null;
  const blood_type           = formData.get('blood_type') || null;
  const urinalysis_protein   = formData.get('urinalysis_protein') || null;
  const urinalysis_glucose   = formData.get('urinalysis_glucose') || null;
  const urinalysis_pus_cells = formData.get('urinalysis_pus_cells') || null;
  const urinalysis_rbc       = formData.get('urinalysis_rbc') || null;
  const hbsag_status         = formData.get('hbsag_status') || 'Pending';
  const vdrl_rpr_status      = formData.get('vdrl_rpr_status') || 'Pending';
  const hiv_screening_status = formData.get('hiv_screening_status') || 'Pending';
  const ogtt_fasting         = formData.get('ogtt_fasting') ? parseFloat(formData.get('ogtt_fasting')) : null;
  const ogtt_1hr             = formData.get('ogtt_1hr') ? parseFloat(formData.get('ogtt_1hr')) : null;
  const ogtt_2hr             = formData.get('ogtt_2hr') ? parseFloat(formData.get('ogtt_2hr')) : null;
  const ultrasound_summary   = formData.get('ultrasound_summary') || null;
  const remarks              = formData.get('remarks') || null;

  if (!patient_id) return { success: false, error: 'Missing patient ID.' };

  // Runtime Zod Schema Validation
  const labValidation = prenatalLabValidationSchema.safeParse({
    patient_id,
    maternal_episode_id,
    test_date,
    hemoglobin,
    hematocrit,
    blood_type,
    urinalysis_protein,
    urinalysis_glucose,
    hbsag_status,
    vdrl_rpr_status,
    hiv_screening_status,
    ogtt_fasting,
    ogtt_1hr,
    ogtt_2hr,
  });

  if (!labValidation.success) {
    const errorMsg = labValidation.error.issues.map(i => i.message).join(', ');
    return { success: false, error: `Validation Error: ${errorMsg}` };
  }

  const { error } = await supabaseServer
    .from('prenatal_lab_results')
    .insert({
      patient_id,
      maternal_episode_id,
      test_date,
      laboratory_name,
      hemoglobin,
      hematocrit,
      blood_type,
      urinalysis_protein,
      urinalysis_glucose,
      urinalysis_pus_cells,
      urinalysis_rbc,
      hbsag_status,
      vdrl_rpr_status,
      hiv_screening_status,
      ogtt_fasting,
      ogtt_1hr,
      ogtt_2hr,
      ultrasound_summary,
      remarks,
      created_by: user?.id,
    });

  if (error) {
    console.error('[addPrenatalLabResult] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'RECORD_LAB_PANEL',
    entityType: 'prenatal_lab_results',
    entityId: patient_id,
    details: {
      patient_id,
      maternal_episode_id,
      test_date,
      blood_type,
      hemoglobin,
      hematocrit,
      urinalysis_protein,
      remarks,
    }
  });

  // Also sync blood_type to patients record if given and not already set
  if (blood_type) {
    await supabaseServer
      .from('patients')
      .update({ blood_type })
      .eq('id', patient_id)
      .is('blood_type', null);
  }

  revalidatePath(`/admin/patients/${patient_id}`);
  revalidatePath('/admin/patients');
  return { success: true };
}

/**
 * deletePrenatalLabResult(formData)
 * Removes a prenatal lab entry.
 */
export async function deletePrenatalLabResult(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id         = formData.get('id');
  const patient_id = formData.get('patient_id');

  if (!id) return { success: false, error: 'Missing lab result ID' };

  const { error } = await supabaseServer
    .from('prenatal_lab_results')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deletePrenatalLabResult] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'DELETE_LAB_PANEL',
    entityType: 'prenatal_lab_results',
    entityId: id,
    details: {
      patient_id,
      deleted_lab_id: id,
    }
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * updateVisitLog(formData)
 * Edits an existing visit log entry.
 */
export async function updateVisitLog(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id                  = formData.get('id');
  const patient_id          = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id');
  const bp                  = formData.get('bp');
  const weight              = formData.get('weight');
  const doctor_notes        = formData.get('doctor_notes');
  const visit_date          = formData.get('visit_date');

  // New clinical fields
  const aog_by_lmp   = formData.get('aog_by_lmp');
  const aog_by_utz   = formData.get('aog_by_utz');
  const temp         = formData.get('temp');
  const pr           = formData.get('pr');
  const rr           = formData.get('rr');
  const fh           = formData.get('fh');
  const fht          = formData.get('fht');
  const ie           = formData.get('ie');
  const next_visit   = formData.get('next_visit') || null;

  if (!id) return { success: false, error: 'Missing log ID.' };

  const { error } = await supabaseServer
    .from('visit_logs')
    .update({ 
      maternal_episode_id,
      bp, 
      weight, 
      doctor_notes, 
      visit_date,
      aog_by_lmp,
      aog_by_utz,
      temp,
      pr,
      rr,
      fh,
      fht,
      ie,
      next_visit
    })
    .eq('id', id);

  if (error) {
    console.error('[updateVisitLog] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'LOG_PRENATAL_VISIT',
    entityType: 'visit_logs',
    entityId: id,
    details: {
      patient_id,
      maternal_episode_id,
      visit_date,
      bp,
      weight,
      mode: 'UPDATE'
    }
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * deleteVisitLog(formData)
 * Permanently removes a visit log entry.
 */
export async function deleteVisitLog(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id         = formData.get('id');
  const patient_id = formData.get('patient_id');

  if (!id) return { success: false, error: 'Missing log ID.' };

  const { error } = await supabaseServer
    .from('visit_logs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteVisitLog] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'DELETE_VISIT_LOG',
    entityType: 'visit_logs',
    entityId: id,
    details: {
      patient_id,
      deleted_record_id: id,
    }
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * updateBirthPlan(formData)
 */
export async function updateBirthPlan(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  
  if (!patient_id) return { success: false, error: 'Missing patient ID.' };

  const updateData = {
    patient_id,
    delivery_location:      formData.get('delivery_location'),
    birth_attendant:        formData.get('birth_attendant'),
    companion_type:         formData.get('companion_type'),
    companion_family_name:  formData.get('companion_family_name'),
    is_philhealth_facility: formData.get('is_philhealth_facility'),
    is_philhealth_member:   formData.get('is_philhealth_member'),
    philhealth_number:      formData.get('philhealth_number'),
    payment_method:         formData.get('payment_method'),
    // Keep these for backward compatibility or future use if they aren't on the main paper form
    transportation:         formData.get('transportation'),
    companion_name:         formData.get('companion_name'),
    emergency_name:         formData.get('emergency_name'),
    emergency_contact:      formData.get('emergency_contact'),
    backup_hospital_type:   formData.get('backup_hospital_type'),
    blood_donor_contact:    formData.get('blood_donor_contact'),
  };

  const { error } = await supabaseServer
    .from('birth_plans')
    .upsert(updateData, { onConflict: 'patient_id' });

  if (error) {
    console.error('[updateBirthPlan] error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * updatePrenatal(formData)
 */
export async function updatePrenatal(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
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
 */
export async function updateSettings(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const clinic_name = formData.get('clinic_name');
  const clinic_address = formData.get('clinic_address');
  const clinic_contact = formData.get('clinic_contact');

  await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    clinic_name,
    clinic_address,
    clinic_contact
  }, { onConflict: 'id' });

  revalidatePath('/admin/settings', 'page');
  revalidatePath('/(public)', 'layout');
}

/**
 * updateServices(servicesJson)
 */
export async function updateServices(servicesJson) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    services: servicesJson
  }, { onConflict: 'id' });

  revalidatePath('/admin/settings', 'page');
  revalidatePath('/admin/cms', 'page');
  revalidatePath('/book', 'page');
  revalidatePath('/', 'page');
}


/**
 * addBlockedDate(formData)
 */
export async function addBlockedDate(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };
  
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
 */
export async function removeBlockedDate(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

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
 */
export async function addTimeSlot(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const start_time = formData.get('start_time'); 
  const end_time   = formData.get('end_time');   
  const max_capacity = parseInt(formData.get('max_capacity') || 10, 10);

  if (!start_time || !end_time) return;

  if (end_time <= start_time) {
    revalidatePath('/admin/schedule', 'page');
    return;
  }

  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  const label = `${formatTime(start_time)} - ${formatTime(end_time)}`;

  const { data: existing } = await supabaseServer
    .from('time_slots')
    .select('id, label, start_time, end_time')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null);

  const hasOverlap = existing?.some(
    (s) => start_time < s.end_time && end_time > s.start_time
  );

  if (hasOverlap) {
    revalidatePath('/admin/schedule', 'page');
    return;
  }

  const { data: maxOrder } = await supabaseServer
    .from('time_slots').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
  const sort_order = (maxOrder?.sort_order || 0) + 1;

  await supabaseServer.from('time_slots').insert({ label, start_time, end_time, max_capacity, sort_order });

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * updateTimeSlot(formData)
 */
export async function updateTimeSlot(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id           = formData.get('id');
  const start_time   = formData.get('start_time');
  const end_time     = formData.get('end_time');
  const max_capacity = parseInt(formData.get('max_capacity') || 10, 10);

  if (!id || !start_time || !end_time) return;

  if (end_time <= start_time) return;

  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  const label = `${formatTime(start_time)} - ${formatTime(end_time)}`;

  const { data: others } = await supabaseServer
    .from('time_slots')
    .select('id, start_time, end_time')
    .neq('id', id)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null);

  const hasOverlap = others?.some(
    (s) => start_time < s.end_time && end_time > s.start_time
  );

  if (hasOverlap) return;

  await supabaseServer
    .from('time_slots')
    .update({ label, start_time, end_time, max_capacity })
    .eq('id', id);

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * deleteTimeSlot(formData)
 */
export async function deleteTimeSlot(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

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
 */
export async function updateTimeSlotCapacity(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

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
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

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
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const block_sunday = formData.get('block_sunday') === 'true';
  await supabaseServer.from('clinic_settings').update({ block_sunday }).eq('id', 1);
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * cancelAppointment(formData)
 */
export async function cancelAppointment(formData) {
  if (!(await verifyAuth())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  
  if (!id) return { success: false, error: "Missing ID" };

  const { error } = await supabaseServer
    .from('appointments')
    .update({ status: 'Cancelled' })
    .eq('id', id);

  if (error) {
    console.error('[cancelAppointment] error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/patient');
  revalidatePath('/patient/appointments');
  return { success: true };
}

/**
 * sendConsultationMessage(formData)
 * Sends an online consultation message with automated clinical urgency detection and DPA audit logging.
 */
export async function sendConsultationMessage(formData) {
  if (!(await verifyAuth())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: 'User session required' };

  const patient_id   = formData.get('patient_id');
  let sender_id      = formData.get('sender_id') || user.id;
  let sender_role    = formData.get('sender_role'); 
  const content      = formData.get('content')?.trim();
  const explicitUrgent = formData.get('is_urgent') === 'true';

  if (!patient_id || !content) {
    return { success: false, error: "Missing required patient ID or message content" };
  }

  // 1. Fetch user role from public.users to ensure accurate clinical attribution
  let resolvedRole = sender_role;
  let senderName = null;

  const { data: userRecord } = await supabaseServer
    .from('users')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (userRecord?.role) {
    resolvedRole = userRecord.role;
    senderName = userRecord.full_name || userRecord.email?.split('@')[0];
  }

  // Fallback check: if sender is patient, look up patient profile name
  if (resolvedRole === 'patient' || !resolvedRole) {
    const { data: patientRecord } = await supabaseServer
      .from('patients')
      .select('full_name')
      .eq('id', patient_id)
      .single();
    if (patientRecord?.full_name) {
      senderName = patientRecord.full_name;
    }
    if (!resolvedRole) resolvedRole = 'patient';
  }

  // 2. Automated Clinical Danger Signs / Obstetric Emergency Keyword Screening (English & Filipino)
  const dangerKeywords = [
    'bleeding', 'dugo', 'pagdurugo', 'hemorrhage',
    'severe pain', 'pananakit', 'matinding sakit', 'sumasakit ang tiyan',
    'fever', 'lagnat', 'panginginig', 'chills',
    'fluid', 'panubigan', 'tumatagas', 'water broke', 'leaking',
    'no movement', 'walang galaw', 'hindi gumagalaw', 'mahinang galaw',
    'blurred vision', 'nanlalabo', 'nahihilo', 'dizziness', 'severe headache', 'masakit ang ulo',
    'convulsion', 'kombulsyon', 'manas', 'swelling', 'nausea', 'pagsusuka'
  ];

  const lowerContent = content.toLowerCase();
  const hasDangerSign = dangerKeywords.some(keyword => lowerContent.includes(keyword));
  const isFlaggedUrgent = explicitUrgent || (resolvedRole === 'patient' && hasDangerSign);
  const urgencyLevel = isFlaggedUrgent ? 'urgent' : 'routine';

  // 3. Insert into consultation_messages
  const { data: insertedMsg, error } = await supabaseServer
    .from('consultation_messages')
    .insert({
      patient_id,
      sender_id: user.id,
      sender_role: resolvedRole,
      sender_name: senderName,
      content,
      is_flagged_urgent: isFlaggedUrgent,
      urgency_level: urgencyLevel,
      status: resolvedRole === 'patient' ? 'unread' : 'read',
    })
    .select()
    .single();

  if (error) {
    console.error('[sendConsultationMessage] error:', error.message);
    return { success: false, error: error.message };
  }

  // 4. DPA 2012 Audit Trail (RA 10173 compliance for teleconsultation communication)
  await logAuditEvent({
    action: 'SEND_CONSULTATION_MESSAGE',
    entityType: 'consultation_messages',
    entityId: patient_id,
    details: {
      patient_id,
      message_id: insertedMsg?.id,
      sender_role: resolvedRole,
      is_flagged_urgent: isFlaggedUrgent,
      urgency_level: urgencyLevel,
      content_length: content.length,
    },
  });

  revalidatePath('/patient/consultation');
  revalidatePath('/admin/consultations');
  revalidatePath(`/admin/patients/${patient_id}`);
  
  return { 
    success: true, 
    message: insertedMsg, 
    is_urgent: isFlaggedUrgent,
    danger_detected: hasDangerSign 
  };
}

/**
 * updateConsultationStatus(formData)
 * Allows staff to mark an entire consultation thread as resolved, read, or unread.
 */
export async function updateConsultationStatus(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const status     = formData.get('status'); // 'unread' | 'read' | 'resolved'

  if (!patient_id || !status) {
    return { success: false, error: 'Missing patient ID or status' };
  }

  const updatePayload = { status };
  if (status === 'read' || status === 'resolved') {
    updatePayload.read_at = new Date().toISOString();
  }

  const { error } = await supabaseServer
    .from('consultation_messages')
    .update(updatePayload)
    .eq('patient_id', patient_id);

  if (error) {
    console.error('[updateConsultationStatus] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'UPDATE_CONSULTATION_STATUS',
    entityType: 'consultation_messages',
    entityId: patient_id,
    details: {
      patient_id,
      new_status: status,
    },
  });

  revalidatePath('/admin/consultations');
  revalidatePath('/patient/consultation');
  revalidatePath(`/admin/patients/${patient_id}`);
  
  return { success: true };
}

/**
 * uploadAttachment(formData)
 */
export async function uploadAttachment(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const file = formData.get('file'); 
  const category = formData.get('category') || 'Lab Result';

  if (!patient_id || !file || file.size === 0) {
    return { success: false, error: 'Missing file or patient ID.' };
  }

  // 2C: Server-side validation — 10 MB limit
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'File is too large. Maximum allowed size is 10 MB.' };
  }

  // Allowed file types
  const fileExt = file.name.split('.').pop().toLowerCase();
  const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'];
  if (!ALLOWED.includes(fileExt)) {
    return { success: false, error: `File type ".${fileExt}" is not allowed. Use: ${ALLOWED.join(', ')}.` };
  }
  const fileName = `${patient_id}/${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data: uploadData, error: uploadError } = await supabaseServer
    .storage
    .from('patient-records')
    .upload(filePath, file);

  if (uploadError) {
    console.error('[uploadAttachment] Storage error:', uploadError.message);
    return { success: false, error: uploadError.message };
  }

  const { data: { publicUrl } } = supabaseServer
    .storage
    .from('patient-records')
    .getPublicUrl(filePath);

  const { error: dbError } = await supabaseServer
    .from('patient_attachments')
    .insert({
      patient_id,
      file_name: file.name,
      file_url: publicUrl,
      file_type: fileExt,
      category
    });

  if (dbError) {
    console.error('[uploadAttachment] DB error:', dbError.message);
    return { success: false, error: dbError.message };
  }

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * deleteAttachment(formData)
 */
export async function deleteAttachment(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  const file_url = formData.get('file_url');
  const patient_id = formData.get('patient_id');

  if (!id || !file_url) return;

  const pathParts = file_url.split('/patient-records/');
  const filePath = pathParts[pathParts.length - 1];

  await supabaseServer.storage.from('patient-records').remove([filePath]);
  await supabaseServer.from('patient_attachments').delete().eq('id', id);

  revalidatePath(`/admin/patients/${patient_id}`);
}

/**
 * updateAdminCredentials(formData)
 */
export async function updateAdminCredentials(formData) {
  return { success: false, error: 'Admin credentials are now managed exclusively via central Auth Provider.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTPARTUM CARE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createPostpartumRecord(formData)
 */
export async function createPostpartumRecord(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id               = formData.get('patient_id');
  const maternal_episode_id      = formData.get('maternal_episode_id') || null;
  const delivery_date            = formData.get('delivery_date');
  const delivery_type            = formData.get('delivery_type');
  const maternal_recovery_notes  = formData.get('maternal_recovery_notes') || null;
  const feeding_method           = formData.get('feeding_method') || null;
  const follow_up_date           = formData.get('follow_up_date') || null;

  const baby_vitals = {
    weight_kg:   formData.get('baby_weight_kg')   || null,
    length_cm:   formData.get('baby_length_cm')   || null,
    apgar_score: formData.get('baby_apgar_score') || null,
    gender:      formData.get('baby_gender')      || null,
  };

  // Philippine DOH EINC & NCP Protocol Tracking
  const nbs_filter_card_number       = formData.get('nbs_filter_card_number') || null;
  const nbs_date_collected           = formData.get('nbs_date_collected') || null;
  const nbs_status                   = formData.get('nbs_status') || 'Pending';
  const bcg_given                    = formData.get('bcg_given') === 'on' || formData.get('bcg_given') === 'true';
  const bcg_date                     = formData.get('bcg_date') || null;
  const hepb_given                   = formData.get('hepb_given') === 'on' || formData.get('hepb_given') === 'true';
  const hepb_date                    = formData.get('hepb_date') || null;
  const vit_k_given                  = formData.get('vit_k_given') === 'on' || formData.get('vit_k_given') === 'true';
  const eye_prophylaxis_given        = formData.get('eye_prophylaxis_given') === 'on' || formData.get('eye_prophylaxis_given') === 'true';
  const cord_care_done               = formData.get('cord_care_done') !== 'false';
  const skin_to_skin_initiated       = formData.get('skin_to_skin_initiated') !== 'false';
  const early_breastfeeding_initiated = formData.get('early_breastfeeding_initiated') !== 'false';
  const hearing_screening_status     = formData.get('hearing_screening_status') || 'Pending';

  if (!patient_id || !delivery_date) {
    return { success: false, error: 'Patient ID and delivery date are required.' };
  }

  const { error } = await supabaseServer
    .from('postpartum_records')
    .insert({ 
      patient_id, 
      maternal_episode_id,
      delivery_date, 
      delivery_type, 
      baby_vitals, 
      maternal_recovery_notes, 
      feeding_method, 
      follow_up_date,
      nbs_filter_card_number,
      nbs_date_collected,
      nbs_status,
      bcg_given,
      bcg_date,
      hepb_given,
      hepb_date,
      vit_k_given,
      eye_prophylaxis_given,
      cord_care_done,
      skin_to_skin_initiated,
      early_breastfeeding_initiated,
      hearing_screening_status,
    });

  if (error) {
    console.error('[createPostpartumRecord] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  // If maternal episode is linked, automatically complete the pregnancy lifecycle to 'Delivered'
  if (maternal_episode_id) {
    await supabaseServer
      .from('maternal_episodes')
      .update({ status: 'Delivered' })
      .eq('id', maternal_episode_id);
  }

  // DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'RECORD_DELIVERY_EINC',
    entityType: 'postpartum_records',
    entityId: patient_id,
    details: {
      patient_id,
      maternal_episode_id,
      delivery_date,
      delivery_type,
      baby_vitals,
      nbs_card: nbs_filter_card_number,
      vit_k_given,
      hepb_given,
      bcg_given,
    }
  });

  revalidatePath(`/admin/patients/${patient_id}/postpartum`);
  revalidatePath(`/admin/patients/${patient_id}`);
  revalidatePath('/admin/patients');
  revalidatePath('/admin/appointments');
  return { success: true };
}

/**
 * updatePostpartumRecord(formData)
 */
export async function updatePostpartumRecord(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id                       = formData.get('id');
  const patient_id               = formData.get('patient_id');
  const maternal_episode_id      = formData.get('maternal_episode_id') || null;
  const delivery_date            = formData.get('delivery_date') || null;
  const delivery_type            = formData.get('delivery_type') || null;
  const maternal_recovery_notes  = formData.get('maternal_recovery_notes') || null;
  const feeding_method           = formData.get('feeding_method') || null;
  const follow_up_date           = formData.get('follow_up_date') || null;

  const baby_vitals = {
    weight_kg:   formData.get('baby_weight_kg')   || null,
    length_cm:   formData.get('baby_length_cm')   || null,
    apgar_score: formData.get('baby_apgar_score') || null,
    gender:      formData.get('baby_gender')      || null,
  };

  // Philippine DOH EINC & NCP Protocol Tracking
  const nbs_filter_card_number       = formData.get('nbs_filter_card_number') || null;
  const nbs_date_collected           = formData.get('nbs_date_collected') || null;
  const nbs_status                   = formData.get('nbs_status') || 'Pending';
  const bcg_given                    = formData.get('bcg_given') === 'on' || formData.get('bcg_given') === 'true';
  const bcg_date                     = formData.get('bcg_date') || null;
  const hepb_given                   = formData.get('hepb_given') === 'on' || formData.get('hepb_given') === 'true';
  const hepb_date                    = formData.get('hepb_date') || null;
  const vit_k_given                  = formData.get('vit_k_given') === 'on' || formData.get('vit_k_given') === 'true';
  const eye_prophylaxis_given        = formData.get('eye_prophylaxis_given') === 'on' || formData.get('eye_prophylaxis_given') === 'true';
  const cord_care_done               = formData.get('cord_care_done') !== 'false';
  const skin_to_skin_initiated       = formData.get('skin_to_skin_initiated') !== 'false';
  const early_breastfeeding_initiated = formData.get('early_breastfeeding_initiated') !== 'false';
  const hearing_screening_status     = formData.get('hearing_screening_status') || 'Pending';

  if (!id) return { success: false, error: 'Missing postpartum record ID.' };

  const updatePayload = {
    delivery_type,
    baby_vitals,
    maternal_recovery_notes,
    feeding_method,
    follow_up_date,
    nbs_filter_card_number,
    nbs_date_collected,
    nbs_status,
    bcg_given,
    bcg_date,
    hepb_given,
    hepb_date,
    vit_k_given,
    eye_prophylaxis_given,
    cord_care_done,
    skin_to_skin_initiated,
    early_breastfeeding_initiated,
    hearing_screening_status,
  };

  if (delivery_date) updatePayload.delivery_date = delivery_date;
  if (maternal_episode_id) updatePayload.maternal_episode_id = maternal_episode_id;

  const { error } = await supabaseServer
    .from('postpartum_records')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('[updatePostpartumRecord] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/patients/${patient_id}/postpartum`);
  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO IMAGE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * updateHeroImage(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE : Upload a clinic hero photo to Supabase Storage and save the
 *           public URL into clinic_settings.hero_image_url (row id=1).
 *           Passing action=remove clears the image (sets null).
 * CALLED  : From the Hero Image card on /admin/settings
 */
export async function updateHeroImage(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const action = formData.get('action'); // 'upload' | 'remove' | 'url'
  const position = formData.get('position') || 'left'; // 'left' | 'right'
  const targetColumn = position === 'right' ? 'hero_image_right_url' : 'hero_image_url';

  // ── REMOVE ──────────────────────────────────────────────────────────────────
  if (action === 'remove') {
    const { error } = await supabaseServer
      .from('clinic_settings')
      .update({ [targetColumn]: null })
      .eq('id', 1);

    if (error) {
      console.error('[updateHeroImage] Remove error:', error.message);
      return { success: false, error: error.message };
    }
    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/cms');
    return { success: true };
  }

  // ── DIRECT URL ──────────────────────────────────────────────────────────────
  const directUrl = formData.get('hero_image_url_direct');
  if (action === 'url' || (directUrl && typeof directUrl === 'string' && directUrl.trim().startsWith('http'))) {
    const cleanUrl = directUrl.trim();
    const { error: dbError } = await supabaseServer
      .from('clinic_settings')
      .update({ [targetColumn]: cleanUrl })
      .eq('id', 1);

    if (dbError) {
      console.error('[updateHeroImage] Direct URL error:', dbError.message);
      return { success: false, error: dbError.message };
    }

    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/cms');
    return { success: true };
  }

  // ── FILE UPLOAD ─────────────────────────────────────────────────────────────
  const file = formData.get('hero_image');

  if (!file || file.size === 0) {
    return { success: false, error: 'No file selected.' };
  }

  // Validate size (max 10 MB for hero photo)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File too large. Maximum size is 10 MB.' };
  }

  const rawExt = file.name ? file.name.split('.').pop() : '';
  const fileExt = (rawExt || 'jpg').toLowerCase();
  const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
  if (!ALLOWED.includes(fileExt)) {
    return { success: false, error: `Only JPG, PNG, and WebP files are supported.` };
  }

  const timestamp = Date.now();
  const filePath = `hero/${position}_${timestamp}.${fileExt}`;

  let publicUrl = null;

  // 1. Try uploading to clinic-assets
  const { error: uploadError } = await supabaseServer
    .storage
    .from('clinic-assets')
    .upload(filePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

  if (!uploadError) {
    const { data } = supabaseServer.storage.from('clinic-assets').getPublicUrl(filePath);
    publicUrl = data?.publicUrl;
  } else {
    console.warn('[updateHeroImage] clinic-assets upload warning:', uploadError.message);
    // 2. Fallback to patient-records bucket
    const { error: fallbackError } = await supabaseServer
      .storage
      .from('patient-records')
      .upload(filePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

    if (fallbackError) {
      console.error('[updateHeroImage] Both storage buckets failed:', fallbackError.message);
      return { success: false, error: fallbackError.message };
    }

    const { data } = supabaseServer.storage.from('patient-records').getPublicUrl(filePath);
    publicUrl = data?.publicUrl;
  }

  if (!publicUrl) {
    return { success: false, error: 'Failed to generate public URL for uploaded photo.' };
  }

  const { error: dbError } = await supabaseServer
    .from('clinic_settings')
    .update({ [targetColumn]: publicUrl })
    .eq('id', 1);

  if (dbError) {
    console.error('[updateHeroImage] Database update error:', dbError.message);
    return { success: false, error: dbError.message };
  }

  revalidatePath('/');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/cms');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS CONTENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * updateHeroContent(formData)
 */
export async function updateHeroContent(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const hero_eyebrow = formData.get('hero_eyebrow');
  const hero_title = formData.get('hero_title');
  const hero_subtitle = formData.get('hero_subtitle');

  const { error } = await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    hero_eyebrow,
    hero_title,
    hero_subtitle
  }, { onConflict: 'id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true };
}

/**
 * updateNavbarLogo(formData)
 */
export async function updateNavbarLogo(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const action = formData.get('action'); // 'upload' | 'remove'

  if (action === 'remove') {
    const { error } = await supabaseServer.from('clinic_settings').update({ navbar_logo: null }).eq('id', 1);
    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/admin/cms');
    return { success: true };
  }

  const file = formData.get('navbar_logo');
  if (!file || file.size === 0) return { success: false, error: 'No file selected.' };

  const fileExt = file.name.split('.').pop().toLowerCase();
  const filePath = `logo/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseServer.storage.from('clinic-assets').upload(filePath, file, { upsert: true });

  let publicUrl = '';
  if (uploadError) {
    const { error: fallbackError } = await supabaseServer.storage.from('patient-records').upload(filePath, file, { upsert: true });
    if (fallbackError) return { success: false, error: fallbackError.message };
    publicUrl = supabaseServer.storage.from('patient-records').getPublicUrl(filePath).data.publicUrl;
  } else {
    publicUrl = supabaseServer.storage.from('clinic-assets').getPublicUrl(filePath).data.publicUrl;
  }

  const { error: dbError } = await supabaseServer.from('clinic_settings').update({ navbar_logo: publicUrl }).eq('id', 1);
  if (dbError) return { success: false, error: dbError.message };

  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true, publicUrl };
}

/**
 * updateFavicon(formData)
 */
export async function updateFavicon(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const action = formData.get('action'); // 'upload' | 'remove' | 'sync_logo'

  if (action === 'remove') {
    const { error } = await supabaseServer.from('clinic_settings').update({ favicon_url: null }).eq('id', 1);
    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/admin/cms');
    return { success: true };
  }

  if (action === 'sync_logo') {
    const { data: settings } = await supabaseServer.from('clinic_settings').select('navbar_logo').eq('id', 1).single();
    if (!settings?.navbar_logo) {
      return { success: false, error: 'No navbar logo found to sync. Please upload or save a logo first.' };
    }
    const { error } = await supabaseServer.from('clinic_settings').update({ favicon_url: settings.navbar_logo }).eq('id', 1);
    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/admin/cms');
    return { success: true, publicUrl: settings.navbar_logo };
  }

  const file = formData.get('favicon_file');
  if (!file || file.size === 0) return { success: false, error: 'No file selected.' };

  const fileExt = file.name?.split('.').pop().toLowerCase() || 'png';
  const filePath = `favicon/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseServer.storage.from('clinic-assets').upload(filePath, file, { upsert: true });

  let publicUrl = '';
  if (uploadError) {
    const { error: fallbackError } = await supabaseServer.storage.from('patient-records').upload(filePath, file, { upsert: true });
    if (fallbackError) return { success: false, error: fallbackError.message };
    publicUrl = supabaseServer.storage.from('patient-records').getPublicUrl(filePath).data.publicUrl;
  } else {
    publicUrl = supabaseServer.storage.from('clinic-assets').getPublicUrl(filePath).data.publicUrl;
  }

  const { error: dbError } = await supabaseServer.from('clinic_settings').update({ favicon_url: publicUrl }).eq('id', 1);
  if (dbError) return { success: false, error: dbError.message };

  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true, publicUrl };
}

/**
 * updateAboutContent(formData)
 */
export async function updateAboutContent(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const about_title = formData.get('about_title');
  const about_description = formData.get('about_description');
  
  let trust_points = [];
  try {
    const raw = formData.get('trust_points');
    if (raw) trust_points = JSON.parse(raw);
  } catch (e) {
    return { success: false, error: 'Invalid JSON for trust points' };
  }

  const { error } = await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    about_title,
    about_description,
    trust_points
  }, { onConflict: 'id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true };
}

/**
 * updateFooterContent(formData)
 */
export async function updateFooterContent(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  
  const clinic_address = formData.get('clinic_address');
  const clinic_contact = formData.get('clinic_contact');
  const footer_email = formData.get('footer_email');
  const social_facebook = formData.get('social_facebook');
  const social_instagram = formData.get('social_instagram');
  const operating_hours_weekdays = formData.get('operating_hours_weekdays');
  const operating_hours_saturday = formData.get('operating_hours_saturday');
  const operating_hours_sunday = formData.get('operating_hours_sunday');
  const emergency_notice = formData.get('emergency_notice');

  const { error } = await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    clinic_address,
    clinic_contact,
    footer_email,
    social_facebook,
    social_instagram,
    operating_hours_weekdays,
    operating_hours_saturday,
    operating_hours_sunday,
    emergency_notice
  }, { onConflict: 'id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true };
}

/**
 * updateSEOMetadata(formData)
 */
export async function updateSEOMetadata(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const seo_meta_title = formData.get('seo_meta_title');
  const seo_meta_description = formData.get('seo_meta_description');

  const { error } = await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    seo_meta_title,
    seo_meta_description
  }, { onConflict: 'id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3: BILLING, CASHIERING & PHILHEALTH CLAIMS LEDGER (INTERNAL ONLY)
// STRICT SCOPE: Purely an internal administrative ledger and claim tracker.
// NO external payment gateways or third-party webhooks.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates sequential clinic invoice numbers (e.g. INV-2026-0001)
 */
async function generateNextInvoiceNumber(supabaseServer) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const { data } = await supabaseServer
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0 && data[0].invoice_number) {
    const match = data[0].invoice_number.match(/INV-\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generates sequential PhilHealth claim series numbers (e.g. PH-2026-0001)
 */
async function generateNextClaimSeriesNumber(supabaseServer) {
  const year = new Date().getFullYear();
  const prefix = `PH-${year}-`;
  
  const { data } = await supabaseServer
    .from('philhealth_claims')
    .select('claim_series_number')
    .ilike('claim_series_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0 && data[0].claim_series_number) {
    const match = data[0].claim_series_number.match(/PH-\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * createInvoice(payload)
 * Records an internal clinic invoice and itemized charges.
 * Supports both FormData and direct JS object.
 */
export async function createInvoice(payload) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  // Normalize payload
  let data = {};
  if (payload instanceof FormData) {
    const rawItems = payload.get('items');
    let items = [];
    try {
      items = typeof rawItems === 'string' ? JSON.parse(rawItems) : [];
    } catch {
      items = [];
    }

    data = {
      patient_id: payload.get('patient_id'),
      appointment_id: payload.get('appointment_id') || null,
      maternal_episode_id: payload.get('maternal_episode_id') || null,
      subtotal: parseFloat(payload.get('subtotal')) || 0,
      philhealth_discount: parseFloat(payload.get('philhealth_discount')) || 0,
      senior_pwd_discount: parseFloat(payload.get('senior_pwd_discount')) || 0,
      amount_due: parseFloat(payload.get('amount_due')) || 0,
      amount_paid: parseFloat(payload.get('amount_paid')) || 0,
      change_given: parseFloat(payload.get('change_given')) || 0,
      payment_method: payload.get('payment_method') || 'Cash',
      payment_reference: payload.get('payment_reference') || null,
      payment_status: payload.get('payment_status') || 'Unpaid',
      official_receipt_number: payload.get('official_receipt_number') || null,
      notes: payload.get('notes') || null,
      items,
    };
  } else {
    data = { ...payload };
  }

  // Runtime Zod Validation
  const validation = invoiceValidationSchema.safeParse(data);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map(i => i.message).join(', ');
    return { success: false, error: `Validation Error: ${errorMsg}` };
  }

  const validData = validation.data;
  const invoiceNumber = await generateNextInvoiceNumber(supabaseServer);

  // Reconcile payment status
  let finalStatus = validData.payment_status;
  if (validData.amount_due <= 0) {
    finalStatus = 'Paid';
  } else if (validData.amount_paid >= validData.amount_due) {
    finalStatus = 'Paid';
  } else if (validData.amount_paid > 0) {
    finalStatus = 'Partially Paid';
  }

  const { data: createdInvoice, error: invError } = await supabaseServer
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      patient_id: validData.patient_id,
      appointment_id: validData.appointment_id,
      maternal_episode_id: validData.maternal_episode_id,
      subtotal: validData.subtotal,
      philhealth_discount: validData.philhealth_discount,
      senior_pwd_discount: validData.senior_pwd_discount,
      amount_due: validData.amount_due,
      amount_paid: validData.amount_paid,
      change_given: validData.change_given,
      payment_method: validData.payment_method,
      payment_reference: validData.payment_reference,
      payment_status: finalStatus,
      official_receipt_number: validData.official_receipt_number,
      cashier_id: user?.id || null,
      notes: validData.notes,
    })
    .select('id, invoice_number')
    .single();

  if (invError) {
    console.error('[createInvoice] Supabase insert error:', invError.message);
    return { success: false, error: invError.message };
  }

  // Insert Line Items
  const lineItems = validData.items.map(item => ({
    invoice_id: createdInvoice.id,
    description: item.description,
    item_type: item.item_type || 'Service',
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabaseServer
    .from('invoice_items')
    .insert(lineItems);

  if (itemsError) {
    console.error('[createInvoice] Items insert error:', itemsError.message);
  }

  // Path Revalidation
  revalidatePath('/admin/billing');
  revalidatePath(`/admin/patients/${validData.patient_id}`);
  if (validData.appointment_id) {
    revalidatePath('/admin/appointments');
  }

  return { 
    success: true, 
    invoiceId: createdInvoice.id, 
    invoiceNumber: createdInvoice.invoice_number 
  };
}

/**
 * recordCounterPayment(formData)
 * Records in-clinic counter payment (Cash, manual GCash ref, or Bank transfer) against an invoice.
 */
export async function recordCounterPayment(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  const invoice_id              = formData.get('invoice_id');
  const amount_tendered         = parseFloat(formData.get('amount_tendered')) || 0;
  const payment_method          = formData.get('payment_method') || 'Cash';
  const payment_reference       = formData.get('payment_reference') || null;
  const official_receipt_number = formData.get('official_receipt_number') || null;
  const notes                   = formData.get('notes') || null;

  if (!invoice_id) return { success: false, error: 'Missing Invoice ID' };
  if (amount_tendered <= 0) return { success: false, error: 'Payment amount must be greater than zero' };

  // Fetch current invoice
  const { data: invoice, error: fetchErr } = await supabaseServer
    .from('invoices')
    .select('*')
    .eq('id', invoice_id)
    .single();

  if (fetchErr || !invoice) {
    return { success: false, error: fetchErr?.message || 'Invoice not found' };
  }

  const currentPaid = parseFloat(invoice.amount_paid) || 0;
  const amountDue   = parseFloat(invoice.amount_due) || 0;
  const newTotalPaid = currentPaid + amount_tendered;

  let newStatus = 'Partially Paid';
  let changeGiven = 0;

  if (newTotalPaid >= amountDue) {
    newStatus = 'Paid';
    changeGiven = newTotalPaid - amountDue;
  }

  const { error: updateErr } = await supabaseServer
    .from('invoices')
    .update({
      amount_paid: newTotalPaid,
      change_given: changeGiven,
      payment_method,
      payment_reference: payment_reference || invoice.payment_reference,
      official_receipt_number: official_receipt_number || invoice.official_receipt_number,
      payment_status: newStatus,
      cashier_id: user?.id || invoice.cashier_id,
      notes: notes ? (invoice.notes ? `${invoice.notes}\n[Payment note]: ${notes}` : notes) : invoice.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice_id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath('/admin/billing');
  revalidatePath(`/admin/patients/${invoice.patient_id}`);
  return { success: true, newStatus, changeGiven };
}

/**
 * cancelInvoice(formData)
 * Voids an internal invoice record.
 */
export async function cancelInvoice(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const invoice_id = formData.get('invoice_id');
  const reason     = formData.get('reason') || 'Cancelled by staff';

  if (!invoice_id) return { success: false, error: 'Missing invoice ID' };

  const { error } = await supabaseServer
    .from('invoices')
    .update({ 
      payment_status: 'Cancelled',
      notes: `[Voided]: ${reason}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoice_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/billing');
  return { success: true };
}

/**
 * createPhilHealthClaim(formData)
 * Logs a new PhilHealth MCP/NCP claim and calculates the statutory 60-day deadline.
 */
export async function createPhilHealthClaim(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  const patient_id           = formData.get('patient_id');
  const maternal_episode_id  = formData.get('maternal_episode_id') || null;
  const invoice_id           = formData.get('invoice_id') || null;
  const package_type         = formData.get('package_type') || 'MCP';
  const claim_amount         = parseFloat(formData.get('claim_amount')) || 6500;
  const philhealth_member_id = formData.get('philhealth_member_id') || null;
  const member_category      = formData.get('member_category') || 'Formal Economy';
  const patient_relationship = formData.get('patient_relationship') || 'Member';
  const date_of_delivery     = formData.get('date_of_delivery');
  const notes                = formData.get('notes') || null;

  if (!patient_id || !date_of_delivery) {
    return { success: false, error: 'Patient ID and Date of Delivery are required' };
  }

  // Statutory 60-Day Deadline Calculation
  const deadlineMetrics = calculatePhilHealthDeadline(date_of_delivery);
  if (!deadlineMetrics.isValid) {
    return { success: false, error: 'Invalid delivery date format' };
  }

  // Runtime Zod Validation
  const validation = philhealthClaimValidationSchema.safeParse({
    patient_id,
    maternal_episode_id,
    invoice_id,
    package_type,
    claim_amount,
    philhealth_member_id,
    member_category,
    patient_relationship,
    date_of_delivery,
    notes,
  });

  if (!validation.success) {
    const errorMsg = validation.error.issues.map(i => i.message).join(', ');
    return { success: false, error: `Validation Error: ${errorMsg}` };
  }

  const claimSeries = await generateNextClaimSeriesNumber(supabaseServer);

  const { data: createdClaim, error } = await supabaseServer
    .from('philhealth_claims')
    .insert({
      claim_series_number: claimSeries,
      patient_id,
      maternal_episode_id,
      invoice_id,
      package_type,
      claim_amount,
      philhealth_member_id,
      member_category,
      patient_relationship,
      status: 'Draft',
      date_of_delivery,
      filing_deadline: deadlineMetrics.filingDeadline,
      notes,
      created_by: user?.id,
    })
    .select('id, claim_series_number')
    .single();

  if (error) {
    console.error('[createPhilHealthClaim] error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/philhealth');
  revalidatePath('/admin/billing');
  revalidatePath(`/admin/patients/${patient_id}`);

  return { success: true, claimId: createdClaim.id, claimSeriesNumber: createdClaim.claim_series_number };
}

/**
 * updatePhilHealthClaimStatus(formData)
 * Advances claim through PhilHealth statutory lifecycle stages.
 */
export async function updatePhilHealthClaimStatus(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const id                       = formData.get('id');
  const status                   = formData.get('status');
  const transmitted_date         = formData.get('transmitted_date') || null;
  const reimbursed_date          = formData.get('reimbursed_date') || null;
  const check_or_reference_number = formData.get('check_or_reference_number') || null;
  const denial_reason            = formData.get('denial_reason') || null;
  const notes                    = formData.get('notes') || null;

  if (!id || !status) {
    return { success: false, error: 'Missing claim ID or status' };
  }

  const updatePayload = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (transmitted_date) updatePayload.transmitted_date = transmitted_date;
  if (reimbursed_date) updatePayload.reimbursed_date = reimbursed_date;
  if (check_or_reference_number) updatePayload.check_or_reference_number = check_or_reference_number;
  if (denial_reason) updatePayload.denial_reason = denial_reason;
  if (notes) updatePayload.notes = notes;

  // Auto-set timestamps if advancing status without explicit date
  const today = new Date().toISOString().split('T')[0];
  if (status === 'Transmitted' && !updatePayload.transmitted_date) {
    updatePayload.transmitted_date = today;
  }
  if (status === 'Approved_Reimbursed' && !updatePayload.reimbursed_date) {
    updatePayload.reimbursed_date = today;
  }

  const { error } = await supabaseServer
    .from('philhealth_claims')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('[updatePhilHealthClaimStatus] error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/philhealth');
  revalidatePath('/admin/billing');
  return { success: true };
}

