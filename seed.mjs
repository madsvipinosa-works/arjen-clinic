import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seed() {
  console.log("Seeding mock data...");
  
  // Create mock patient
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .insert({
      full_name: 'Jane Doe (Mock)',
      date_of_birth: '1990-01-01',
      age: 36,
      contact_number: '09123456789',
      address: '123 Fake St, Mock City',
      is_high_risk: false
    })
    .select('id')
    .single();

  if (patientError) {
    console.error("Patient seed error:", patientError.message);
    return;
  }

  console.log("Created mock patient:", patient.id);

  // Create mock prenatal record
  await supabase.from('prenatal_records').insert({
    patient_id: patient.id,
    modular_data: {}
  });

  // Create mock appointment
  const { error: apptError } = await supabase.from('appointments').insert({
    patient_id: patient.id,
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '09:00 AM',
    reason: 'Routine Checkup',
    status: 'Scheduled',
    triage_status: 'Waiting'
  });

  if (apptError) {
    console.error("Appointment seed error:", apptError.message);
  } else {
    console.log("Created mock appointment.");
  }
  
  console.log("Mock data seeding complete!");
}

seed();
