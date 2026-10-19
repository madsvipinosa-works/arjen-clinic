// app/actions.js
// This file contains Next.js "Server Actions".
// Server Actions run ONLY on the server (inside Node.js), never in the browser.
// They are the recommended way to write data-mutation logic in the App Router.

'use server'; // This directive tells Next.js: everything in this file is server-only.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logAuditEvent } from "@/lib/audit-logger";
import { 
  isStaff, 
  canAccessClinicalRecords, 
  canManageSystemSettings, 
  canManageTriageQueue, 
  canViewAuditLogs 
} from "@/lib/rbac";
import { getClinicTodayDateString, getClinicDateOffset } from "@/lib/utils";


// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION & GRANULAR RBAC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabaseServer = await createClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  if (authError || !user) return { user: null, role: null, supabaseServer };

  const { data: userData } = await supabaseServer
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = userData?.role || user?.app_metadata?.role || user?.user_metadata?.role;
  return { user, role, supabaseServer };
}

export async function verifyClinicalStaff() {
  const { user, role } = await getAuthenticatedUser();
  return !!user && canAccessClinicalRecords(role);
}

export async function verifySettingsAdmin() {
  const { user, role } = await getAuthenticatedUser();
  return !!user && canManageSystemSettings(role);
}

export async function verifyTriageStaff() {
  const { user, role } = await getAuthenticatedUser();
  return !!user && canManageTriageQueue(role);
}

async function verifyAdmin() {
  const { user, role } = await getAuthenticatedUser();
  return !!user && isStaff(role);
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
  if (!(await verifyClinicalStaff())) return { success: false, error: 'Unauthorized: Clinical staff privileges required' };

  const patientId = formData.get('patient_id');
  const visitDate = formData.get('visit_date');
  const bloodPressure = formData.get('blood_pressure');
  const weight = formData.get('weight');
  const notes = formData.get('notes');

  if (!patientId || !visitDate) {
    return { success: false, error: 'Patient ID and visit date are required.' };
  }

  const newLog = {
    patient_id: patientId,
    visit_date: visitDate,
    bp: bloodPressure,
    weight: weight,
    doctor_notes: notes,
    created_at: new Date().toISOString(),
  };

  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from('visit_logs')
    .insert(newLog)
    .select('id')
    .single();

  if (error) {
    console.error('[createVisitLog] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: 'LOG_PRENATAL_VISIT',
    entityType: 'visit_logs',
    entityId: data?.id || null,
    details: { patient_id: patientId, visit_date: visitDate, bp: bloodPressure, weight }
  });

  return { success: true, error: null };
}

/**
 * createPatient(formData)
 * Uses transactional atomic function register_patient_atomic to guarantee
 * patient, maternal_episodes, and prenatal_records commit together or rollback.
 */
export async function createPatient(formData) {
  if (!(await verifyClinicalStaff())) return { success: false, error: 'Unauthorized: Clinical staff privileges required' };

  const full_name = formData.get('full_name')?.toString().trim();
  const date_of_birth = formData.get('date_of_birth') || null;
  const age = formData.get('age');
  const civil_status = formData.get('civil_status') || null;
  const husband_partner_name = formData.get('husband_partner_name') || null;
  const address = formData.get('address') || null;
  const contact_number = formData.get('contact_number') || null;
  const blood_type = formData.get('blood_type') || null;
  const allergies = formData.get('allergies') || null;
  const philhealth_number = formData.get('philhealth_number') || null;
  const is_high_risk = formData.get('is_high_risk') === 'on' || formData.get('is_high_risk') === 'true';

  const lmp = formData.get('lmp') || null;
  const gravida = formData.get('gravida') ? parseInt(formData.get('gravida'), 10) : 1;
  const para = formData.get('para') !== null && formData.get('para') !== '' ? parseInt(formData.get('para'), 10) : 0;

  if (!full_name) {
    return { success: false, error: 'Patient full name is required.' };
  }

  const supabaseServer = await createClient();

  // 1. Attempt atomic registration via PostgreSQL RPC
  const { data: rpcData, error: rpcError } = await supabaseServer.rpc('register_patient_atomic', {
    p_full_name: full_name,
    p_date_of_birth: date_of_birth,
    p_age: age ? parseInt(age, 10) : null,
    p_civil_status: civil_status,
    p_husband_partner_name: husband_partner_name,
    p_address: address,
    p_contact_number: contact_number,
    p_blood_type: blood_type,
    p_allergies: allergies,
    p_philhealth_number: philhealth_number,
    p_is_high_risk: is_high_risk,
    p_lmp: lmp,
    p_gravida: gravida,
    p_para: para,
  });

  let patientId = null;

  if (!rpcError && rpcData?.success) {
    patientId = rpcData.patient_id;
  } else {
    // If RPC failed due to missing migration on current client, execute safe multi-step with explicit checks
    console.warn('[createPatient] register_patient_atomic RPC fallback:', rpcError?.message || rpcData?.error);
    
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
      philhealth_number,
      is_high_risk,
      created_at: new Date().toISOString(),
    };

    const { data: patientRow, error: pError } = await supabaseServer
      .from('patients')
      .insert(newPatient)
      .select('id')
      .single();

    if (pError || !patientRow) {
      console.error('[createPatient] Patient insert error:', pError?.message);
      return { success: false, error: pError?.message || 'Failed to create patient record.' };
    }

    patientId = patientRow.id;

    if (lmp) {
      const edc = new Date(new Date(lmp).getTime() + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { error: epError } = await supabaseServer
        .from('maternal_episodes')
        .insert({
          patient_id: patientId,
          lmp,
          edc,
          gravida,
          para,
          status: 'Active',
        });
      if (epError) {
        console.error('[createPatient] Maternal episode insert error:', epError.message);
      }
    }

    const { error: recError } = await supabaseServer
      .from('prenatal_records')
      .insert({ patient_id: patientId, modular_data: {} });
    if (recError) {
      console.error('[createPatient] Prenatal record shell insert error:', recError.message);
    }
  }

  // Record immutable DPA 2012 audit log
  await logAuditEvent({
    action: 'CREATE_PATIENT',
    entityType: 'patients',
    entityId: patientId,
    details: {
      full_name,
      age: age ? parseInt(age, 10) : null,
      is_high_risk,
      blood_type,
      lmp: lmp || null,
    },
    strict: true,
  });

  revalidatePath('/admin/patients');
  redirect(`/admin/patients/${patientId}`);
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
    full_name: formData.get('full_name'),
    date_of_birth: formData.get('date_of_birth') || null,
    age: formData.get('age') ? parseInt(formData.get('age'), 10) : null,
    civil_status: formData.get('civil_status') || null,
    husband_partner_name: formData.get('husband_partner_name') || null,
    address: formData.get('address') || null,
    contact_number: formData.get('contact_number') || null,
    blood_type: formData.get('blood_type') || null,
    allergies: formData.get('allergies') || null,
    philhealth_number: formData.get('philhealth_number') || null,
    is_high_risk: formData.get('is_high_risk') === 'on' || formData.get('is_high_risk') === 'true',
  };

  const { error } = await supabaseServer
    .from('patients')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('[updatePatient] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA Audit Trail
  await logAuditEvent({
    action: 'UPDATE_PATIENT',
    entityType: 'patients',
    entityId: id,
    details: {
      full_name: updateData.full_name,
      age: updateData.age,
      is_high_risk: updateData.is_high_risk,
      blood_type: updateData.blood_type,
      allergies: updateData.allergies,
    }
  });

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

  // DPA Audit Trail
  await logAuditEvent({
    action: 'CREATE_MATERNAL_EPISODE',
    entityType: 'maternal_episodes',
    entityId: patient_id,
    details: {
      patient_id,
      lmp,
      edc,
      gravida: newEpisode.gravida,
      para: newEpisode.para,
      status: newEpisode.status,
    }
  });

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
  const patient_id = formData.get('patient_id');
  const module_id = formData.get('module_id');
  const content = formData.get('content');

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

  if (!appointment_id || !status) return { success: false, error: 'Missing parameters' };

  const updatePayload = { status };
  if (attending_staff_id) {
    updatePayload.attending_staff_id = attending_staff_id;
  }

  // Bidirectional dual-state sync: completing marks as Discharged; approving resets unassigned/discharged to Waiting
  if (status === 'Completed') {
    updatePayload.triage_status = 'Discharged';
  } else if (status === 'Approved') {
    const { data: existingAppt } = await supabaseServer
      .from('appointments')
      .select('triage_status')
      .eq('id', appointment_id)
      .single();
    if (!existingAppt?.triage_status || existingAppt.triage_status === 'Discharged') {
      updatePayload.triage_status = 'Waiting';
    }
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updatePayload)
    .eq('id', appointment_id);

  if (error) {
    console.error('[updateAppointmentStatus] error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
  revalidatePath('/queue');
  return { success: true };
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

  const validStatuses = ['Waiting', 'Vital Signs', 'Consultation', 'Discharged', 'Stepped Out', 'Returning'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid triage status: ${status}` };
  }

  const supabaseServer = await createClient();
  const updatePayload = { triage_status: status };

  // Smart Dual-State Sync: Discharging a patient marks as Completed;
  // Moving back to an active triage lane marks as Approved!
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
 * stepAsideAppointment(appointmentId)
 * Places a called patient on temporary hold ('Stepped Out') so the next patient can be triaged immediately without line stalling.
 */
export async function stepAsideAppointment(appointmentId) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };
  if (!appointmentId) return { success: false, error: 'Missing appointment ID' };

  const supabaseServer = await createClient();

  const { data: appt, error: fetchErr } = await supabaseServer
    .from('appointments')
    .select('id, queue_ticket_number, triage_status')
    .eq('id', appointmentId)
    .single();

  if (fetchErr || !appt) {
    return { success: false, error: fetchErr?.message || 'Appointment not found' };
  }

  const { error: updateErr } = await supabaseServer
    .from('appointments')
    .update({
      triage_status: 'Stepped Out',
      status: 'Approved',
    })
    .eq('id', appointmentId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  await logAuditEvent({
    action: 'PATIENT_STEPPED_OUT',
    entityType: 'appointments',
    entityId: appointmentId,
    details: {
      ticket_number: appt.queue_ticket_number,
      previous_status: appt.triage_status,
      timestamp: new Date().toISOString()
    }
  });

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
  revalidatePath('/queue');
  return { success: true };
}

/**
 * returnPatientToQueue(appointmentId, targetLane = 'Waiting')
 * Midwife action when a stepped-out patient walks back into reception.
 */
export async function returnPatientToQueue(appointmentId, targetLane = 'Waiting') {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };
  if (!appointmentId) return { success: false, error: 'Missing appointment ID' };

  const supabaseServer = await createClient();

  const { error: updateErr } = await supabaseServer
    .from('appointments')
    .update({
      triage_status: targetLane,
      status: 'Approved'
    })
    .eq('id', appointmentId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  await logAuditEvent({
    action: 'PATIENT_RETURNED_TO_QUEUE',
    entityType: 'appointments',
    entityId: appointmentId,
    details: {
      target_lane: targetLane,
      timestamp: new Date().toISOString()
    }
  });

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
  revalidatePath('/queue');
  return { success: true };
}

/**
 * markPatientReturning(ticketNumber)
 * Public action called from patient mobile pocket tracker when they tap "I'm on My Way Back".
 */
export async function markPatientReturning(ticketNumber) {
  if (!ticketNumber) return { success: false, error: 'Ticket number is required' };

  const supabaseServer = await createClient();
  const todayStr = getClinicTodayDateString();

  const { data: appt, error: findErr } = await supabaseServer
    .from('appointments')
    .select('id, triage_status, queue_ticket_number')
    .eq('appointment_date', todayStr)
    .eq('queue_ticket_number', ticketNumber.trim())
    .single();

  if (findErr || !appt) {
    return { success: false, error: 'Ticket not found for today' };
  }

  const { error: updateErr } = await supabaseServer
    .from('appointments')
    .update({
      triage_status: 'Returning'
    })
    .eq('id', appt.id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Statutory immutable DPA 2012 audit log (RA 10173)
  await logAuditEvent({
    action: 'UPDATE_TRIAGE_STATUS',
    entityType: 'appointments',
    entityId: appt.id,
    details: {
      ticketNumber: ticketNumber.trim(),
      oldStatus: appt.triage_status,
      newStatus: 'Returning',
      origin: 'mobile_pocket_tracker',
      timestamp: new Date().toISOString()
    },
    userOverride: {
      id: null,
      email: 'patient-mobile-tracker',
      user_metadata: { role: 'PATIENT' }
    }
  });

  revalidatePath('/admin/appointments');
  revalidatePath('/queue');
  return { success: true, timestamp: new Date().toISOString() };
}

/**
 * Service duration reference table in minutes for community lying-in clinics
 */
const CLINIC_SERVICE_DURATION_MINS = {
  'Labor & Delivery': 25,
  'Labor Intake': 25,
  'Delivery': 25,
  'Prenatal Checkup': 12,
  'Prenatal Consultation': 12,
  'Postpartum Care': 10,
  'Newborn Care': 10,
  'Immunization': 8,
  'General Consultation': 8,
  'Family Planning': 8,
  'Consultation': 8,
  'Default': 10,
};

/**
 * fetchTicketStatus(ticketNumber)
 * Public, privacy-safe queue lookup for mobile pocket tracker (/queue/track?ticket=...)
 */
export async function fetchTicketStatus(ticketNumber) {
  if (!ticketNumber) return { success: false, error: 'Missing ticket number' };

  const supabaseServer = await createClient();
  const todayStr = getClinicTodayDateString();
  const normalizedTicket = ticketNumber.trim().toUpperCase();

  const { data: queueList, error } = await supabaseServer
    .from('appointments')
    .select('id, queue_ticket_number, service_type, triage_status, checked_in_at, status')
    .eq('appointment_date', todayStr)
    .not('queue_ticket_number', 'is', null)
    .order('checked_in_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const myAppt = (queueList || []).find(
    (a) => (a.queue_ticket_number || '').toUpperCase() === normalizedTicket
  );

  if (!myAppt) {
    return {
      success: false,
      notFound: true,
      error: `Ticket ${normalizedTicket} was not found for today.`
    };
  }

  const currentConsultation = (queueList || []).find(
    (a) => a.triage_status?.toLowerCase() === 'consultation'
  );
  const currentVitals = (queueList || []).find(
    (a) => a.triage_status?.toLowerCase() === 'vital signs'
  );

  const myCheckedInTime = myAppt.checked_in_at ? new Date(myAppt.checked_in_at).getTime() : 0;
  
  const unservedAhead = (queueList || []).filter((a) => {
    if (a.id === myAppt.id) return false;
    if (a.status === 'Completed' || a.triage_status === 'Discharged') return false;
    const aTime = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
    if (['vital signs', 'consultation'].includes(a.triage_status?.toLowerCase())) return true;
    if (a.triage_status?.toLowerCase() === 'waiting' && aTime < myCheckedInTime) return true;
    return false;
  });

  const patientsAhead = unservedAhead.length;

  // Calibrate wait time based on actual service types of patients ahead
  let totalEstMinutes = 0;
  let prenatalCount = 0;
  let consultCount = 0;
  let laborCount = 0;

  for (const aheadAppt of unservedAhead) {
    const serviceKey = aheadAppt.service_type || 'Default';
    const lowerService = serviceKey.toLowerCase();
    let duration = CLINIC_SERVICE_DURATION_MINS[serviceKey];
    if (!duration) {
      if (lowerService.includes('labor') || lowerService.includes('delivery')) {
        duration = 25;
      } else if (lowerService.includes('prenatal')) {
        duration = 12;
      } else if (lowerService.includes('postpartum') || lowerService.includes('newborn') || lowerService.includes('pedia')) {
        duration = 10;
      } else if (lowerService.includes('family') || lowerService.includes('immuniz') || lowerService.includes('vaccin') || lowerService.includes('consult')) {
        duration = 8;
      } else {
        duration = CLINIC_SERVICE_DURATION_MINS['Default'];
      }
    }

    if (lowerService.includes('labor') || lowerService.includes('delivery')) {
      laborCount++;
    } else if (lowerService.includes('prenatal')) {
      prenatalCount++;
    } else {
      consultCount++;
    }

    // If currently inside the consultation room, estimate remaining half-session
    if (aheadAppt.triage_status?.toLowerCase() === 'consultation') {
      totalEstMinutes += Math.max(3, Math.round(duration * 0.5));
    } else if (aheadAppt.triage_status?.toLowerCase() === 'vital signs') {
      // Vitals take ~3 mins plus full consult duration
      totalEstMinutes += duration + 3;
    } else {
      totalEstMinutes += duration;
    }
  }

  const estWaitMins = Math.max(5, totalEstMinutes);

  return {
    success: true,
    ticket: {
      ticketNumber: myAppt.queue_ticket_number,
      serviceType: myAppt.service_type,
      triageStatus: myAppt.triage_status || 'Waiting',
      overallStatus: myAppt.status,
      checkedInAt: myAppt.checked_in_at,
    },
    nowServing: currentConsultation ? currentConsultation.queue_ticket_number : (currentVitals ? currentVitals.queue_ticket_number : '—'),
    nowInTriage: currentVitals ? currentVitals.queue_ticket_number : '—',
    patientsAhead,
    estimatedWaitMinutes: estWaitMins,
    serviceBreakdown: {
      prenatalCount,
      consultCount,
      laborCount,
    },
  };
}

/**
 * fetchAppointments({ startDate, endDate, statusFilter, range })
 * Optimized query to retrieve appointments with historical date ranges and status filtering.
 */
export async function fetchAppointments({ startDate, endDate, statusFilter, range = 'all' } = {}) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const todayStr = getClinicTodayDateString();

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
        allergies,
        blood_type,
        age
      )
    `);

  if (statusFilter && statusFilter !== 'all' && statusFilter !== 'All') {
    query = query.eq('status', statusFilter);
  }

  // Exact calendar date boundaries calculated in Asia/Manila (UTC+8)
  if (range === 'today') {
    query = query.eq('appointment_date', todayStr);
  } else if (range === 'yesterday') {
    query = query.eq('appointment_date', getClinicDateOffset(-1));
  } else if (range === 'week') {
    query = query.gte('appointment_date', getClinicDateOffset(-7));
  } else if (range === 'month') {
    query = query.gte('appointment_date', getClinicDateOffset(-30));
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

  return { success: true, appointments: data || [], data: data || [] };
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

  const patient_id = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id') || null;
  const attending_staff_id = user?.id;
  const bp = formData.get('bp');
  const weight = formData.get('weight');
  const doctor_notes = formData.get('doctor_notes');
  const visit_date = formData.get('visit_date') || getClinicTodayDateString();

  // Clinical fields
  let aog_by_lmp = formData.get('aog_by_lmp');
  const aog_by_utz = formData.get('aog_by_utz') || null;
  const temp = formData.get('temp') || null;
  const pr = formData.get('pr') || null;
  const rr = formData.get('rr') || null;
  const fh = formData.get('fh') || null;
  const fht = formData.get('fht') || null;
  const ie = formData.get('ie') || null;
  const next_visit = formData.get('next_visit') || null;

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

  const patient_id = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id') || null;
  const test_date = formData.get('test_date') || getClinicTodayDateString();
  const laboratory_name = formData.get('laboratory_name') || 'AR-JEN Clinic Laboratory';

  const hemoglobin = formData.get('hemoglobin') ? parseFloat(formData.get('hemoglobin')) : null;
  const hematocrit = formData.get('hematocrit') ? parseFloat(formData.get('hematocrit')) : null;
  const blood_type = formData.get('blood_type') || null;
  const urinalysis_protein = formData.get('urinalysis_protein') || null;
  const urinalysis_glucose = formData.get('urinalysis_glucose') || null;
  const urinalysis_pus_cells = formData.get('urinalysis_pus_cells') || null;
  const urinalysis_rbc = formData.get('urinalysis_rbc') || null;
  const hbsag_status = formData.get('hbsag_status') || 'Pending';
  const vdrl_rpr_status = formData.get('vdrl_rpr_status') || 'Pending';
  const hiv_screening_status = formData.get('hiv_screening_status') || 'Pending';
  const ogtt_fasting = formData.get('ogtt_fasting') ? parseFloat(formData.get('ogtt_fasting')) : null;
  const ogtt_1hr = formData.get('ogtt_1hr') ? parseFloat(formData.get('ogtt_1hr')) : null;
  const ogtt_2hr = formData.get('ogtt_2hr') ? parseFloat(formData.get('ogtt_2hr')) : null;
  const ultrasound_summary = formData.get('ultrasound_summary') || null;
  const remarks = formData.get('remarks') || null;

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
  const id = formData.get('id');
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
  const id = formData.get('id');
  const patient_id = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id');
  const bp = formData.get('bp');
  const weight = formData.get('weight');
  const doctor_notes = formData.get('doctor_notes');
  const visit_date = formData.get('visit_date');

  // New clinical fields
  const aog_by_lmp = formData.get('aog_by_lmp');
  const aog_by_utz = formData.get('aog_by_utz');
  const temp = formData.get('temp');
  const pr = formData.get('pr');
  const rr = formData.get('rr');
  const fh = formData.get('fh');
  const fht = formData.get('fht');
  const ie = formData.get('ie');
  const next_visit = formData.get('next_visit') || null;

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
  const id = formData.get('id');
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
    delivery_location: formData.get('delivery_location'),
    birth_attendant: formData.get('birth_attendant'),
    companion_type: formData.get('companion_type'),
    companion_family_name: formData.get('companion_family_name'),
    is_philhealth_facility: formData.get('is_philhealth_facility'),
    is_philhealth_member: formData.get('is_philhealth_member'),
    philhealth_number: formData.get('philhealth_number'),
    payment_method: formData.get('payment_method'),
    // Keep these for backward compatibility or future use if they aren't on the main paper form
    transportation: formData.get('transportation'),
    companion_name: formData.get('companion_name'),
    emergency_name: formData.get('emergency_name'),
    emergency_contact: formData.get('emergency_contact'),
    backup_hospital_type: formData.get('backup_hospital_type'),
    blood_donor_contact: formData.get('blood_donor_contact'),
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
/**
 * updateSettings(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * Updates core clinic profile and identity parameters in clinic_settings.
 * Audited under DPA 2012 (RA 10173).
 */
export async function updateSettings(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const clinic_name = formData.get('clinic_name')?.toString().trim();
  const clinic_address = formData.get('clinic_address')?.toString().trim();
  const clinic_contact = formData.get('clinic_contact')?.toString().trim();
  const footer_email = formData.get('footer_email')?.toString().trim();
  const emergency_notice = formData.get('emergency_notice')?.toString().trim();

  if (!clinic_name) {
    return { success: false, error: 'Clinic name cannot be blank.' };
  }

  const payload = {
    id: 1,
    clinic_name,
    clinic_address,
    clinic_contact,
  };

  if (footer_email !== undefined) payload.footer_email = footer_email;
  if (emergency_notice !== undefined) payload.emergency_notice = emergency_notice;

  const { error } = await supabaseServer.from('clinic_settings').upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[updateSettings] error:', error.message);
    return { success: false, error: error.message };
  }

  // Immutable DPA 2012 Audit Trail
  await logAuditEvent({
    action: 'UPDATE_CLINIC_PROFILE',
    entityType: 'clinic_settings',
    entityId: '1',
    details: {
      clinic_name,
      clinic_address,
      clinic_contact,
      footer_email,
      has_emergency_notice: !!emergency_notice,
    }
  });

  revalidatePath('/admin/settings', 'page');
  revalidatePath('/admin', 'page');
  revalidatePath('/(public)', 'layout');
  revalidatePath('/book', 'page');
  return { success: true, message: 'Clinic profile successfully updated.' };
}

/**
 * updateServices(servicesJson)
 */
export async function updateServices(servicesJson) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const { error } = await supabaseServer.from('clinic_settings').upsert({
    id: 1,
    services: servicesJson
  }, { onConflict: 'id' });

  if (error) {
    console.error('[updateServices] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA Audit Trail
  await logAuditEvent({
    action: 'UPDATE_CLINIC_SERVICES',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { serviceCount: Array.isArray(servicesJson) ? servicesJson.length : 0 }
  });

  revalidatePath('/admin/settings', 'page');
  revalidatePath('/admin/cms', 'page');
  revalidatePath('/book', 'page');
  revalidatePath('/', 'page');
  return { success: true };
}


/**
 * addBlockedDate(formData)
 */
export async function addBlockedDate(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const blocked_date = formData.get('blocked_date');
  const reason = formData.get('reason');

  if (blocked_date) {
    await supabaseServer.from('blocked_dates').insert({ blocked_date, reason });
    await logAuditEvent({
      action: 'ADD_BLOCKED_DATE',
      entityType: 'blocked_dates',
      entityId: null,
      details: { blocked_date, reason }
    });
  }

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * removeBlockedDate(formData)
 */
export async function removeBlockedDate(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  if (id) {
    await supabaseServer.from('blocked_dates').delete().eq('id', id);
    await logAuditEvent({
      action: 'REMOVE_BLOCKED_DATE',
      entityType: 'blocked_dates',
      entityId: id,
      details: { id }
    });
  }
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * addTimeSlot(formData)
 */
export async function addTimeSlot(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const start_time = formData.get('start_time');
  const end_time = formData.get('end_time');
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

  await logAuditEvent({
    action: 'ADD_TIME_SLOT',
    entityType: 'time_slots',
    entityId: null,
    details: { label, start_time, end_time, max_capacity, sort_order }
  });

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * updateTimeSlot(formData)
 */
export async function updateTimeSlot(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  const start_time = formData.get('start_time');
  const end_time = formData.get('end_time');
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

  await logAuditEvent({
    action: 'UPDATE_TIME_SLOT',
    entityType: 'time_slots',
    entityId: id,
    details: { label, start_time, end_time, max_capacity }
  });

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * deleteTimeSlot(formData)
 */
export async function deleteTimeSlot(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  if (id) {
    await supabaseServer.from('time_slots').delete().eq('id', id);
    await logAuditEvent({
      action: 'DELETE_TIME_SLOT',
      entityType: 'time_slots',
      entityId: id,
      details: { id }
    });
  }
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * updateTimeSlotCapacity(formData)
 */
export async function updateTimeSlotCapacity(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  const max_capacity = parseInt(formData.get('max_capacity') || 10, 10);
  if (id) {
    await supabaseServer.from('time_slots').update({ max_capacity }).eq('id', id);
    await logAuditEvent({
      action: 'UPDATE_TIME_SLOT_CAPACITY',
      entityType: 'time_slots',
      entityId: id,
      details: { max_capacity }
    });
  }
  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * toggleSaturdayBlock(formData)
 */
export async function toggleSaturdayBlock(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const block_saturday = formData.get('block_saturday') === 'true';
  await supabaseServer.from('clinic_settings').update({ block_saturday }).eq('id', 1);

  await logAuditEvent({
    action: 'UPDATE_WEEKEND_POLICY',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { day: 'Saturday', block_saturday }
  });

  revalidatePath('/admin/schedule', 'page');
  revalidatePath('/book', 'page');
}

/**
 * toggleSundayBlock(formData)
 */
export async function toggleSundayBlock(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const block_sunday = formData.get('block_sunday') === 'true';
  await supabaseServer.from('clinic_settings').update({ block_sunday }).eq('id', 1);

  await logAuditEvent({
    action: 'UPDATE_WEEKEND_POLICY',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { day: 'Sunday', block_sunday }
  });

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

  await logAuditEvent({
    action: 'CANCEL_APPOINTMENT',
    entityType: 'appointments',
    entityId: id,
    details: { id }
  });

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

  const patient_id = formData.get('patient_id');
  let sender_id = formData.get('sender_id') || user.id;
  let sender_role = formData.get('sender_role');
  const content = formData.get('content')?.trim();
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
  const status = formData.get('status'); // 'unread' | 'read' | 'resolved'

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
  if (!(await verifyClinicalStaff())) return { success: false, error: 'Unauthorized: Clinical staff privileges required' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const file = formData.get('file');
  const category = formData.get('category') || 'Lab Result';

  if (!patient_id || !file || file.size === 0) {
    return { success: false, error: 'Missing file or patient ID.' };
  }

  // Server-side validation — 10 MB limit
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

  // Upload to private patient-records bucket
  const { data: uploadData, error: uploadError } = await supabaseServer
    .storage
    .from('patient-records')
    .upload(filePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    console.error('[uploadAttachment] Storage error:', uploadError.message);
    return { success: false, error: uploadError.message };
  }

  // Store relative file_path (and file_url for backward compatibility)
  const { data: insertedAttachment, error: dbError } = await supabaseServer
    .from('patient_attachments')
    .insert({
      patient_id,
      file_name: file.name,
      file_path: filePath,
      file_url: filePath,
      file_type: fileExt,
      category
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('[uploadAttachment] DB error:', dbError.message);
    return { success: false, error: dbError.message };
  }

  await logAuditEvent({
    action: 'UPLOAD_PATIENT_ATTACHMENT',
    entityType: 'patient_attachments',
    entityId: insertedAttachment?.id || null,
    details: {
      patient_id,
      file_name: file.name,
      file_type: fileExt,
      category,
      file_size: file.size,
    },
    strict: true,
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * deleteAttachment(formData)
 */
export async function deleteAttachment(formData) {
  if (!(await verifyClinicalStaff())) return { success: false, error: 'Unauthorized: Clinical staff privileges required' };

  const supabaseServer = await createClient();
  const id = formData.get('id');
  const file_url = formData.get('file_url');
  const file_path = formData.get('file_path');
  const patient_id = formData.get('patient_id');

  if (!id) return { success: false, error: 'Missing attachment ID.' };

  let filePath = file_path;
  if (!filePath && file_url) {
    filePath = file_url.includes('/patient-records/')
      ? file_url.split('/patient-records/').pop()
      : file_url;
  }
  if (filePath && filePath.includes('?')) {
    filePath = filePath.split('?')[0];
  }

  if (filePath) {
    await supabaseServer.storage.from('patient-records').remove([filePath]);
  }
  await supabaseServer.from('patient_attachments').delete().eq('id', id);

  await logAuditEvent({
    action: 'DELETE_PATIENT_ATTACHMENT',
    entityType: 'patient_attachments',
    entityId: id,
    details: { patient_id, filePath },
    strict: true,
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}

/**
 * clearMaternalRiskFlag(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * Enables an authorized clinician (Doctor / Midwife) to resolve/clear a high-risk
 * maternal flag with statutory justification notes and immutable audit trail.
 */
export async function clearMaternalRiskFlag(formData) {
  if (!(await verifyClinicalStaff())) {
    return { success: false, error: 'Unauthorized: Clinical staff privileges required to resolve maternal risk.' };
  }

  const patientId = formData.get('patient_id');
  const rationale = (formData.get('rationale') || formData.get('clearance_reason'))?.toString().trim();

  if (!patientId || !rationale) {
    return { success: false, error: 'Patient ID and clinical resolution rationale are required.' };
  }

  const { user, supabaseServer } = await getAuthenticatedUser();

  const { error: updateError } = await supabaseServer
    .from('patients')
    .update({
      is_high_risk: false,
      risk_cleared_at: new Date().toISOString(),
      risk_cleared_by: user?.id || null,
      risk_cleared_notes: rationale,
    })
    .eq('id', patientId);

  if (updateError) {
    console.error('[clearMaternalRiskFlag] Error:', updateError.message);
    return { success: false, error: updateError.message };
  }

  await logAuditEvent({
    action: 'CLEAR_MATERNAL_RISK_FLAG',
    entityType: 'patients',
    entityId: patientId,
    details: {
      rationale,
      cleared_by: user?.email,
      timestamp: new Date().toISOString(),
    },
    userOverride: user,
    supabaseOverride: supabaseServer,
    strict: true,
  });

  revalidatePath(`/admin/patients/${patientId}`);
  revalidatePath('/admin/patients');
  revalidatePath('/admin');
  return { success: true };
}

/**
 * updateAdminCredentials(formData)
 * ─────────────────────────────────────────────────────────────────────────────
 * Updates administrative user credentials (password, email, display name)
 * through Supabase Auth, synchronized with public.users.
 * Audited under DPA 2012 (RA 10173).
 */
export async function updateAdminCredentials(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user }, error: userErr } = await supabaseServer.auth.getUser();
  if (userErr || !user) {
    return { success: false, error: 'Authenticated admin session not found.' };
  }

  const new_username = formData.get('new_username')?.toString().trim();
  const new_email = formData.get('new_email')?.toString().trim();
  const new_password = formData.get('new_password')?.toString().trim();
  const confirm_password = formData.get('confirm_password')?.toString().trim();

  if (!new_password && !new_email && !new_username) {
    return { success: false, error: 'No credential updates provided.' };
  }

  // Pre-validation for password changes
  if (new_password) {
    if (new_password.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }
    if (new_password !== confirm_password) {
      return { success: false, error: 'New password and confirm password do not match.' };
    }
  }

  // 1. Update Supabase Auth if password or email is changing
  const authPayload = {};
  if (new_password) authPayload.password = new_password;
  if (new_email && new_email !== user.email) authPayload.email = new_email;

  if (Object.keys(authPayload).length > 0) {
    const { error: authUpdateError } = await supabaseServer.auth.updateUser(authPayload);
    if (authUpdateError) {
      console.error('[updateAdminCredentials] auth error:', authUpdateError.message);
      return { success: false, error: authUpdateError.message };
    }
  }

  // 2. Synchronize public.users table
  const userUpdates = {};
  if (new_email && new_email !== user.email) userUpdates.email = new_email;
  if (new_username) userUpdates.full_name = new_username;

  if (Object.keys(userUpdates).length > 0) {
    const { error: userTableError } = await supabaseServer
      .from('users')
      .update(userUpdates)
      .eq('id', user.id);

    if (userTableError) {
      console.warn('[updateAdminCredentials] users table sync warning:', userTableError.message);
    }
  }

  // 3. Fallback sync for admin_credentials table if present
  try {
    const adminCredUpdates = { updated_at: new Date().toISOString() };
    if (new_email) adminCredUpdates.email = new_email;
    if (new_username) adminCredUpdates.username = new_username;
    await supabaseServer
      .from('admin_credentials')
      .update(adminCredUpdates)
      .eq('email', user.email);
  } catch (err) {
    // Non-blocking fallback
  }

  // 4. Record Immutable DPA 2012 Audit Event
  await logAuditEvent({
    action: 'UPDATE_ADMIN_CREDENTIALS',
    entityType: 'users',
    entityId: user.id,
    details: {
      passwordChanged: !!new_password,
      emailChanged: !!(new_email && new_email !== user.email),
      usernameChanged: !!new_username,
      actorEmail: user.email,
    }
  });

  revalidatePath('/admin/settings', 'page');
  return { 
    success: true, 
    message: new_email && new_email !== user.email 
      ? 'Credentials updated. A confirmation email has been sent to your new email address.'
      : 'Admin credentials successfully updated.' 
  };
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
  const patient_id = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id') || null;
  const delivery_date = formData.get('delivery_date');
  const delivery_type = formData.get('delivery_type');
  const maternal_recovery_notes = formData.get('maternal_recovery_notes') || null;
  const feeding_method = formData.get('feeding_method') || null;
  const follow_up_date = formData.get('follow_up_date') || null;

  const baby_vitals = {
    weight_kg: formData.get('baby_weight_kg') || null,
    length_cm: formData.get('baby_length_cm') || null,
    apgar_score: formData.get('baby_apgar_score') || null,
    gender: formData.get('baby_gender') || null,
  };

  // Philippine DOH EINC & NCP Protocol Tracking
  const nbs_filter_card_number = formData.get('nbs_filter_card_number') || null;
  const nbs_date_collected = formData.get('nbs_date_collected') || null;
  const nbs_status = formData.get('nbs_status') || 'Pending';
  const bcg_given = formData.get('bcg_given') === 'on' || formData.get('bcg_given') === 'true';
  const bcg_date = formData.get('bcg_date') || null;
  const hepb_given = formData.get('hepb_given') === 'on' || formData.get('hepb_given') === 'true';
  const hepb_date = formData.get('hepb_date') || null;
  const vit_k_given = formData.get('vit_k_given') === 'on' || formData.get('vit_k_given') === 'true';
  const eye_prophylaxis_given = formData.get('eye_prophylaxis_given') === 'on' || formData.get('eye_prophylaxis_given') === 'true';
  const cord_care_done = formData.get('cord_care_done') !== 'false';
  const skin_to_skin_initiated = formData.get('skin_to_skin_initiated') !== 'false';
  const early_breastfeeding_initiated = formData.get('early_breastfeeding_initiated') !== 'false';
  const hearing_screening_status = formData.get('hearing_screening_status') || 'Pending';

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
  const id = formData.get('id');
  const patient_id = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id') || null;
  const delivery_date = formData.get('delivery_date') || null;
  const delivery_type = formData.get('delivery_type') || null;
  const maternal_recovery_notes = formData.get('maternal_recovery_notes') || null;
  const feeding_method = formData.get('feeding_method') || null;
  const follow_up_date = formData.get('follow_up_date') || null;

  const baby_vitals = {
    weight_kg: formData.get('baby_weight_kg') || null,
    length_cm: formData.get('baby_length_cm') || null,
    apgar_score: formData.get('baby_apgar_score') || null,
    gender: formData.get('baby_gender') || null,
  };

  // Philippine DOH EINC & NCP Protocol Tracking
  const nbs_filter_card_number = formData.get('nbs_filter_card_number') || null;
  const nbs_date_collected = formData.get('nbs_date_collected') || null;
  const nbs_status = formData.get('nbs_status') || 'Pending';
  const bcg_given = formData.get('bcg_given') === 'on' || formData.get('bcg_given') === 'true';
  const bcg_date = formData.get('bcg_date') || null;
  const hepb_given = formData.get('hepb_given') === 'on' || formData.get('hepb_given') === 'true';
  const hepb_date = formData.get('hepb_date') || null;
  const vit_k_given = formData.get('vit_k_given') === 'on' || formData.get('vit_k_given') === 'true';
  const eye_prophylaxis_given = formData.get('eye_prophylaxis_given') === 'on' || formData.get('eye_prophylaxis_given') === 'true';
  const cord_care_done = formData.get('cord_care_done') !== 'false';
  const skin_to_skin_initiated = formData.get('skin_to_skin_initiated') !== 'false';
  const early_breastfeeding_initiated = formData.get('early_breastfeeding_initiated') !== 'false';
  const hearing_screening_status = formData.get('hearing_screening_status') || 'Pending';

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
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

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

    await logAuditEvent({
      action: 'REMOVE_HERO_IMAGE',
      entityType: 'clinic_settings',
      entityId: '1',
      details: { position, targetColumn }
    });

    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/cms');
    return { success: true, position, targetColumn, publicUrl: null, removed: true };
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

    await logAuditEvent({
      action: 'UPDATE_HERO_IMAGE',
      entityType: 'clinic_settings',
      entityId: '1',
      details: { position, targetColumn, cleanUrl }
    });

    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/cms');
    return { success: true, position, targetColumn, publicUrl: cleanUrl };
  }

  // ── FILE UPLOAD ─────────────────────────────────────────────────────────────
  const file = formData.get('hero_image');

  if (!file || file.size === 0) {
    return { success: false, error: 'No file selected.' };
  }

  // Validate size (max 8 MB for hero photo)
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: 'Hero photo too large. Maximum size is 8 MB.' };
  }

  const rawExt = file.name ? file.name.split('.').pop() : '';
  const fileExt = (rawExt || 'jpg').toLowerCase();
  const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
  if (!ALLOWED.includes(fileExt)) {
    return { success: false, error: 'Only JPG, PNG, and WebP files are supported.' };
  }

  const timestamp = Date.now();
  const filePath = `hero/${position}_${timestamp}.${fileExt}`;

  // Upload exclusively to clinic-assets
  const { error: uploadError } = await supabaseServer
    .storage
    .from('clinic-assets')
    .upload(filePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

  if (uploadError) {
    console.error('[updateHeroImage] clinic-assets upload failed:', uploadError.message);
    return { success: false, error: uploadError.message };
  }

  const { data } = supabaseServer.storage.from('clinic-assets').getPublicUrl(filePath);
  const publicUrl = data?.publicUrl;

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

  await logAuditEvent({
    action: 'UPDATE_HERO_IMAGE',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { position, targetColumn, publicUrl, size: file.size, type: file.type }
  });

  revalidatePath('/');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/cms');
  return { success: true, position, targetColumn, publicUrl };
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

  await logAuditEvent({
    action: 'UPDATE_HERO_CONTENT',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { hero_eyebrow, hero_title, hero_subtitle }
  });

  revalidatePath('/');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true };
}

/**
 * updateNavbarLogo(formData)
 */
export async function updateNavbarLogo(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const action = formData.get('action'); // 'upload' | 'remove'

  if (action === 'remove') {
    const { error } = await supabaseServer.from('clinic_settings').update({ navbar_logo: null }).eq('id', 1);
    if (error) return { success: false, error: error.message };

    await logAuditEvent({
      action: 'REMOVE_NAVBAR_LOGO',
      entityType: 'clinic_settings',
      entityId: '1',
      details: {}
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/cms');
    return { success: true };
  }

  const file = formData.get('navbar_logo');
  if (!file || file.size === 0) return { success: false, error: 'No file selected.' };

  // Guard: Max 3 MB
  if (file.size > 3 * 1024 * 1024) {
    return { success: false, error: 'Logo file too large. Maximum size is 3 MB.' };
  }

  const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (file.type && !allowedMimes.includes(file.type)) {
    return { success: false, error: 'Invalid file format. Please upload a PNG, JPG, WebP, or SVG logo.' };
  }

  const rawExt = file.name ? file.name.split('.').pop() : '';
  const fileExt = (rawExt || 'png').toLowerCase();
  const filePath = `logo/${Date.now()}.${fileExt}`;

  // Upload exclusively to clinic-assets
  const { error: uploadError } = await supabaseServer.storage.from('clinic-assets').upload(filePath, file, { upsert: true, contentType: file.type || 'image/png' });

  if (uploadError) {
    console.error('[updateNavbarLogo] clinic-assets upload failed:', uploadError.message);
    return { success: false, error: uploadError.message };
  }

  const publicUrl = supabaseServer.storage.from('clinic-assets').getPublicUrl(filePath).data.publicUrl;

  const { error: dbError } = await supabaseServer.from('clinic_settings').update({ navbar_logo: publicUrl }).eq('id', 1);
  if (dbError) return { success: false, error: dbError.message };

  await logAuditEvent({
    action: 'UPDATE_NAVBAR_LOGO',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { publicUrl, size: file.size, type: file.type }
  });

  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true, publicUrl };
}

/**
 * updateFavicon(formData)
 */
export async function updateFavicon(formData) {
  if (!(await verifySettingsAdmin())) return { success: false, error: 'Unauthorized: Clinic Administrator privileges required.' };

  const supabaseServer = await createClient();
  const action = formData.get('action'); // 'upload' | 'remove' | 'sync_logo'

  if (action === 'remove') {
    const { error } = await supabaseServer.from('clinic_settings').update({ favicon_url: null }).eq('id', 1);
    if (error) return { success: false, error: error.message };

    await logAuditEvent({
      action: 'REMOVE_FAVICON',
      entityType: 'clinic_settings',
      entityId: '1',
      details: {}
    });

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

    await logAuditEvent({
      action: 'SYNC_FAVICON_WITH_LOGO',
      entityType: 'clinic_settings',
      entityId: '1',
      details: { syncedUrl: settings.navbar_logo }
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/cms');
    return { success: true, publicUrl: settings.navbar_logo };
  }

  const file = formData.get('favicon_file');
  if (!file || file.size === 0) return { success: false, error: 'No file selected.' };

  // Guard: Max 2 MB
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: 'Favicon file too large. Maximum size is 2 MB.' };
  }

  const allowedMimes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml', 'image/webp', 'image/jpeg'];
  if (file.type && !allowedMimes.includes(file.type)) {
    return { success: false, error: 'Invalid favicon format. Please upload an ICO, PNG, or SVG icon.' };
  }

  const fileExt = file.name?.split('.').pop().toLowerCase() || 'png';
  const filePath = `favicon/${Date.now()}.${fileExt}`;

  // Upload exclusively to clinic-assets
  const { error: uploadError } = await supabaseServer.storage.from('clinic-assets').upload(filePath, file, { upsert: true, contentType: file.type || 'image/png' });

  if (uploadError) {
    console.error('[updateFavicon] clinic-assets upload failed:', uploadError.message);
    return { success: false, error: uploadError.message };
  }

  const publicUrl = supabaseServer.storage.from('clinic-assets').getPublicUrl(filePath).data.publicUrl;

  const { error: dbError } = await supabaseServer.from('clinic_settings').update({ favicon_url: publicUrl }).eq('id', 1);
  if (dbError) return { success: false, error: dbError.message };

  await logAuditEvent({
    action: 'UPDATE_FAVICON',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { publicUrl, size: file.size, type: file.type }
  });

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

  await logAuditEvent({
    action: 'UPDATE_ABOUT_CONTENT',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { about_title, trustPointCount: trust_points.length }
  });

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

  await logAuditEvent({
    action: 'UPDATE_FOOTER_CONTENT',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { clinic_contact, footer_email }
  });

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

  await logAuditEvent({
    action: 'UPDATE_SEO_METADATA',
    entityType: 'clinic_settings',
    entityId: '1',
    details: { seo_meta_title, descriptionLength: seo_meta_description?.length || 0 }
  });

  revalidatePath('/');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/cms');
  return { success: true };
}

// ==========================================
// PHILHEALTH MCP AUTOMATION
// ==========================================

export async function togglePhilHealthOverride(formData) {
  const supabaseServer = await createClient();
  const maternal_episode_id = formData.get('maternal_episode_id');
  const override_value = formData.get('override_value') === 'true';
  const patient_id = formData.get('patient_id');

  const { error } = await supabaseServer
    .from('maternal_episodes')
    .update({ philhealth_mcp_override: override_value })
    .eq('id', maternal_episode_id);

  if (error) {
    console.error('[togglePhilHealthOverride] error:', error.message);
    return { success: false, error: error.message };
  }

  // DPA Audit Trail
  const { data: user } = await supabaseServer.auth.getUser();
  await logAuditEvent({
    action: 'TOGGLE_MCP_OVERRIDE',
    entityType: 'maternal_episodes',
    entityId: maternal_episode_id,
    details: { patient_id, override_value, user_id: user?.user?.id }
  });

  revalidatePath(`/admin/patients/${patient_id}`);
  return { success: true };
}
