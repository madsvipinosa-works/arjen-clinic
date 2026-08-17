// app/actions.js
// This file contains Next.js "Server Actions".
// Server Actions run ONLY on the server (inside Node.js), never in the browser.
// They are the recommended way to write data-mutation logic in the App Router.

'use server'; // This directive tells Next.js: everything in this file is server-only.

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  return userData && (userData.role === 'admin' || userData.role === 'staff');
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
 * addVisitLog(formData)
 */
export async function addVisitLog(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  const patient_id          = formData.get('patient_id');
  const maternal_episode_id = formData.get('maternal_episode_id');
  const attending_staff_id  = user?.id;
  const bp                  = formData.get('bp');
  const weight              = formData.get('weight');
  const doctor_notes        = formData.get('doctor_notes');
  const visit_date          = formData.get('visit_date') || new Date().toISOString().split('T')[0];

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

  if (!patient_id) return { success: false, error: 'Missing patient ID.' };

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
      next_visit
    });

  if (error) {
    console.error('[addVisitLog] error:', error.message);
    return { success: false, error: error.message };
  }

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
 */
export async function sendConsultationMessage(formData) {
  if (!(await verifyAuth())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const sender_id  = formData.get('sender_id');
  const sender_role = formData.get('sender_role'); 
  const content    = formData.get('content');

  if (!patient_id || !sender_id || !content) {
    return { success: false, error: "Missing required fields" };
  }

  const { error } = await supabaseServer
    .from('consultation_messages')
    .insert({
      patient_id,
      sender_id,
      sender_role,
      content
    });

  if (error) {
    console.error('[sendConsultationMessage] error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/patient/consultation`);
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

  if (!patient_id || !delivery_date) {
    return { success: false, error: 'Patient ID and delivery date are required.' };
  }

  const { error } = await supabaseServer
    .from('postpartum_records')
    .insert({ patient_id, delivery_date, delivery_type, baby_vitals, maternal_recovery_notes, feeding_method, follow_up_date });

  if (error) {
    console.error('[createPostpartumRecord] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/patients/${patient_id}/postpartum`);
  revalidatePath(`/admin/patients/${patient_id}`);
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

  if (!id) return { success: false, error: 'Missing postpartum record ID.' };

  const { error } = await supabaseServer
    .from('postpartum_records')
    .update({ delivery_type, baby_vitals, maternal_recovery_notes, feeding_method, follow_up_date })
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
  return { success: true };
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
