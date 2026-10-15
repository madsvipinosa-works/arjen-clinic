// scripts/test-runner/teardown.mjs
// Cascading cleanup of synthetic test records created during autonomous test runs

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.mjs';

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function runTeardown() {
  console.log('\n🧹 [TEARDOWN] Starting safe cascading cleanup of synthetic test records...');
  const stats = { patients: 0, appointments: 0, visits: 0, episodes: 0 };

  try {
    // 1. Find all test patients by full_name prefix
    const { data: testPatients, error: pError } = await supabase
      .from('patients')
      .select('id, full_name')
      .ilike('full_name', `%${CONFIG.testNamePrefix}%`);

    if (pError) {
      console.warn('⚠️ Error querying test patients:', pError.message);
      return stats;
    }

    if (!testPatients || testPatients.length === 0) {
      console.log('   ✓ Zero synthetic test patients found. Database is clean.');
      return stats;
    }

    const patientIds = testPatients.map((p) => p.id);
    console.log(`   Found ${patientIds.length} synthetic test patient(s) to remove.`);

    // 2. Delete synthetic visit logs
    const { error: vlError, count: vlCount } = await supabase
      .from('visit_logs')
      .delete({ count: 'exact' })
      .in('patient_id', patientIds);
    if (!vlError) stats.visits = vlCount || 0;

    // 3. Delete synthetic prenatal records
    await supabase
      .from('prenatal_records')
      .delete()
      .in('patient_id', patientIds);

    // 4. Delete synthetic maternal episodes
    const { error: meError, count: meCount } = await supabase
      .from('maternal_episodes')
      .delete({ count: 'exact' })
      .in('patient_id', patientIds);
    if (!meError) stats.episodes = meCount || 0;

    // 5. Delete synthetic appointments
    const { error: aError, count: aCount } = await supabase
      .from('appointments')
      .delete({ count: 'exact' })
      .in('patient_id', patientIds);
    if (!aError) stats.appointments = aCount || 0;

    // 6. Delete test appointments created by notes or patient_name prefix
    await supabase
      .from('appointments')
      .delete()
      .or(`notes.ilike.%${CONFIG.testNamePrefix}%,patient_name.ilike.%${CONFIG.testNamePrefix}%`);

    // 7. Delete synthetic patients
    const { error: pDelError, count: pDelCount } = await supabase
      .from('patients')
      .delete({ count: 'exact' })
      .in('id', patientIds);
    if (!pDelError) stats.patients = pDelCount || 0;

    console.log(`   ✓ Teardown complete: Removed ${stats.patients} patient(s), ${stats.episodes} episode(s), ${stats.visits} visit(s), ${stats.appointments} appointment(s).`);
  } catch (err) {
    console.error('❌ Exception in teardown:', err.message);
  }

  return stats;
}

if (process.argv[1]?.endsWith('teardown.mjs')) {
  runTeardown().then(() => process.exit(0));
}
