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

  const name      = formData.get('name');
  const age       = formData.get('age');
  const address   = formData.get('address');
  const contact   = formData.get('contact');
  const bloodType = formData.get('blood_type');
  const lmp       = formData.get('lmp'); 

  if (!name || !lmp) {
    return { success: false, error: 'Patient name and LMP are required.' };
  }

  const newPatient = {
    full_name: name,
    age:        age ? parseInt(age, 10) : null,
    address,
    contact_number: contact, // mapped correctly based on schema
    blood_type: bloodType,
    lmp,
    created_at: new Date().toISOString(),
  };

  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from('patients')
    .insert(newPatient);

  if (error) {
    console.error('[createPatient] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * updateAppointmentStatus(formData)
 */
export async function updateAppointmentStatus(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

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

  revalidatePath('/admin');
  revalidatePath('/admin/appointments');
}

/**
 * addVisitLog(formData)
 */
export async function addVisitLog(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const bp = formData.get('bp');
  const weight = formData.get('weight');
  const doctor_notes = formData.get('doctor_notes');
  const visit_date = new Date().toISOString().split('T')[0];

  if (!patient_id) return;

  const { error } = await supabaseServer
    .from('visit_logs')
    .insert({ patient_id, bp, weight, doctor_notes, visit_date });

  if (error) {
    console.error('[addVisitLog] error:', error.message);
  }

  revalidatePath('/admin/patients/[id]', 'page');
}

/**
 * updateBirthPlan(formData)
 */
export async function updateBirthPlan(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const updateData = {
    patient_id,
    delivery_location: formData.get('delivery_location'),
    birth_attendant: formData.get('birth_attendant'),
    transportation: formData.get('transportation'),
    companion_name: formData.get('companion_name'),
    is_philhealth_member: formData.get('is_philhealth_member'),
    payment_method: formData.get('payment_method'),
    emergency_name: formData.get('emergency_name'),
    emergency_contact: formData.get('emergency_contact'),
    backup_hospital_type: formData.get('backup_hospital_type'),
    blood_donor_contact: formData.get('blood_donor_contact'),
  };

  if (!patient_id) return;

  const { error } = await supabaseServer
    .from('birth_plans')
    .upsert(updateData, { onConflict: 'patient_id' });

  if (error) {
    console.error('[updateBirthPlan] error:', error.message);
  }

  revalidatePath('/admin/patients/[id]', 'page');
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
  revalidatePath('/book', 'page');
}

/**
 * updateModularData(formData)
 */
export async function updateModularData(formData) {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' };

  const supabaseServer = await createClient();
  const patient_id = formData.get('patient_id');
  const module_id = formData.get('module_id');
  const content = formData.get('content');

  if (!patient_id || !module_id) return;

  const { data: currentRecord } = await supabaseServer
    .from('prenatal_records')
    .select('modular_data')
    .eq('patient_id', patient_id)
    .single();

  const modular_data = currentRecord?.modular_data || {};
  modular_data[module_id] = { content, updated_at: new Date().toISOString() };

  await supabaseServer.from('prenatal_records').upsert({
    patient_id,
    modular_data
  }, { onConflict: 'patient_id' });

  revalidatePath(`/admin/patients/${patient_id}`);
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
    return { success: false, error: "Missing file or patient ID" };
  }

  const fileExt = file.name.split('.').pop();
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
