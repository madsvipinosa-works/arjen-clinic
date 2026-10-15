// scripts/test-runner/layer2-database-integrity.mjs
// Layer 2: Database Triggers, Atomicity & Scope Integrity Tests

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.mjs';

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function runLayer2Tests() {
  console.log('\n🗄️ [LAYER 2] Running Database Triggers & Transactional Integrity Tests...');
  const results = [];
  const createdPatientIds = [];

  async function assertTest(id, name, testFn) {
    const start = Date.now();
    try {
      await testFn();
      const duration = Date.now() - start;
      console.log(`   ✓ [${id}] ${name} (${duration}ms)`);
      results.push({ id, name, status: 'PASSED', duration });
    } catch (err) {
      const duration = Date.now() - start;
      console.error(`   ✕ [${id}] ${name} FAILED: ${err.message} (${duration}ms)`);
      results.push({ id, name, status: 'FAILED', duration, error: err.message });
    }
  }

  // Helper to create synthetic test patient using actual patients table schema
  async function createTestPatient(suffix = '') {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        full_name: `${CONFIG.testNamePrefix} Maria Test_${suffix}`,
        contact_number: '0917-123-4567',
        age: 26,
        is_high_risk: false,
      })
      .select('id, full_name')
      .single();

    if (error) throw new Error(`Failed to create test patient: ${error.message}`);
    createdPatientIds.push(data.id);
    return data;
  }

  // DB-01: Auto-Risk Scorer on BP (≥140/90)
  await assertTest('DB-01', 'Database Trigger: Maternal Auto-Risk Scorer on Hypertension (BP 155/98 mmHg)', async () => {
    const patient = await createTestPatient('bp');
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Insert visit log with severe BP
    const { error: vError } = await supabase.from('visit_logs').insert({
      patient_id: patient.id,
      visit_date: todayStr,
      bp: '155/98',
      systolic_bp: 155,
      diastolic_bp: 98,
      weight: '60.0',
      weight_kg: 60.0,
      doctor_notes: `${CONFIG.testNamePrefix} Acute BP trigger test`,
    });
    if (vError) throw new Error(`Failed inserting visit log: ${vError.message}`);

    // Wait for trigger execution
    await new Promise((r) => setTimeout(r, 600));

    // Verify patient was scored as high risk
    const { data: updatedPatient, error: pError } = await supabase
      .from('patients')
      .select('is_high_risk, risk_reasons')
      .eq('id', patient.id)
      .single();

    if (pError) throw new Error(`Querying patient failed: ${pError.message}`);
    if (updatedPatient.is_high_risk !== true) {
      throw new Error(`Expected is_high_risk=true, but found ${updatedPatient.is_high_risk}`);
    }
    const reasonsStr = Array.isArray(updatedPatient.risk_reasons) ? updatedPatient.risk_reasons.join(' ') : '';
    if (!reasonsStr.includes('Hypertension')) {
      throw new Error(`Expected risk_reasons to contain 'Hypertension', found: "${reasonsStr}"`);
    }
  });

  // DB-02: Auto-Risk Scorer on Weight Spike (+2.8 kg within 14 days)
  await assertTest('DB-02', 'Database Trigger: Maternal Auto-Risk Scorer on Acute Weight Spike (+2.8 kg in 7 days)', async () => {
    const patient = await createTestPatient('weight');
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Baseline visit log 7 days ago
    const { error: v1Error } = await supabase.from('visit_logs').insert({
      patient_id: patient.id,
      visit_date: pastDate,
      bp: '115/75',
      systolic_bp: 115,
      diastolic_bp: 75,
      weight: '55.0',
      weight_kg: 55.0,
      doctor_notes: `${CONFIG.testNamePrefix} Baseline visit`,
    });
    if (v1Error) throw new Error(`Failed inserting baseline visit: ${v1Error.message}`);

    // Spike visit log today (+2.8 kg)
    const { error: v2Error } = await supabase.from('visit_logs').insert({
      patient_id: patient.id,
      visit_date: todayStr,
      bp: '118/76',
      systolic_bp: 118,
      diastolic_bp: 76,
      weight: '57.8',
      weight_kg: 57.8,
      doctor_notes: `${CONFIG.testNamePrefix} Weight spike visit`,
    });
    if (v2Error) throw new Error(`Failed inserting spike visit: ${v2Error.message}`);

    await new Promise((r) => setTimeout(r, 600));

    const { data: updatedPatient, error: pError } = await supabase
      .from('patients')
      .select('is_high_risk, risk_reasons')
      .eq('id', patient.id)
      .single();

    if (pError) throw new Error(`Querying patient failed: ${pError.message}`);
    if (updatedPatient.is_high_risk !== true) {
      throw new Error(`Expected is_high_risk=true on weight spike, got ${updatedPatient.is_high_risk}`);
    }
    const reasonsStr = Array.isArray(updatedPatient.risk_reasons) ? updatedPatient.risk_reasons.join(' ') : '';
    if (!reasonsStr.toLowerCase().includes('weight')) {
      throw new Error(`Expected risk_reasons to mention weight spike, found: "${reasonsStr}"`);
    }
  });

  // DB-03: Immutable Audit Logs on UPDATE
  let testAuditLogId = null;
  await assertTest('DB-03', 'Database Trigger: Strictly immutable audit logs reject UPDATE (Exception P0001)', async () => {
    // Insert an audit log record with actual audit_logs schema columns
    const { data: logEntry, error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'TEST_IMMUTABILITY_PROBE',
        user_email: `tester@${CONFIG.testDomain}`,
        user_role: 'admin',
        entity_type: 'system_test',
        details: { probe: true, timestamp: Date.now() },
      })
      .select('id')
      .single();

    if (insertError) throw new Error(`Failed creating audit log: ${insertError.message}`);
    testAuditLogId = logEntry.id;

    // Attempt to UPDATE the audit log record
    const { error: updateError } = await supabase
      .from('audit_logs')
      .update({ action: 'MUTATED_ACTION_SHOULD_FAIL' })
      .eq('id', testAuditLogId);

    if (!updateError) {
      throw new Error('PostgreSQL allowed UPDATE on audit_logs! Immutable trigger failed.');
    }
    const errText = (updateError.message || '').toLowerCase();
    if (!errText.includes('immutable') && updateError.code !== 'P0001') {
      throw new Error(`Expected immutable error (P0001), got: ${updateError.message} (${updateError.code})`);
    }
  });

  // DB-04: Immutable Audit Logs on DELETE
  await assertTest('DB-04', 'Database Trigger: Strictly immutable audit logs reject DELETE (Exception P0001)', async () => {
    if (!testAuditLogId) throw new Error('No test audit log ID from DB-03');

    // Attempt to DELETE the audit log record
    const { error: deleteError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('id', testAuditLogId);

    if (!deleteError) {
      throw new Error('PostgreSQL allowed DELETE on audit_logs! Immutable trigger failed.');
    }
    const errText = (deleteError.message || '').toLowerCase();
    if (!errText.includes('immutable') && deleteError.code !== 'P0001') {
      throw new Error(`Expected immutable error (P0001), got: ${deleteError.message} (${deleteError.code})`);
    }
  });

  // DB-05: RPC reserve_appointment_slot
  await assertTest('DB-05', 'Database Stored Procedure: Atomic slot reservation (reserve_appointment_slot)', async () => {
    const patient = await createTestPatient('slot');
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: slotResult, error: rpcError } = await supabase.rpc('reserve_appointment_slot', {
      p_patient_id: patient.id,
      p_service_type: 'Prenatal Checkup',
      p_appointment_date: futureDate,
      p_time_preference: 'AM',
      p_notes: `${CONFIG.testNamePrefix} Atomic reservation test`,
      p_is_walkin: false,
      p_status: 'Approved',
    });

    if (rpcError) throw new Error(`RPC reserve_appointment_slot failed: ${rpcError.message}`);
    if (!slotResult?.success || !slotResult?.appointment_id) {
      throw new Error(`Unexpected RPC result: ${JSON.stringify(slotResult)}`);
    }
  });

  // DB-06: RPC register_patient_atomic
  await assertTest('DB-06', 'Database Stored Procedure: Atomic patient & maternal episode registration', async () => {
    const lmpDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // ~17 weeks ago

    const { data: regResult, error: rpcError } = await supabase.rpc('register_patient_atomic', {
      p_full_name: `${CONFIG.testNamePrefix} Elena Test_Atomic`,
      p_date_of_birth: '1999-03-15',
      p_age: 27,
      p_civil_status: 'Married',
      p_husband_partner_name: 'Juan Test',
      p_address: 'Dasmariñas, Cavite',
      p_contact_number: '0918-999-8888',
      p_blood_type: 'O+',
      p_allergies: 'Penicillin',
      p_philhealth_number: '12-345678901-2',
      p_is_high_risk: false,
      p_lmp: lmpDate,
      p_gravida: 2,
      p_para: 1,
    });

    if (rpcError) throw new Error(`RPC register_patient_atomic failed: ${rpcError.message}`);
    if (!regResult?.success || !regResult?.patient_id) {
      throw new Error(`Expected success and patient_id: ${JSON.stringify(regResult)}`);
    }
    createdPatientIds.push(regResult.patient_id);
  });

  // DB-07: Scope Purity - Purged Billing & Claims Tables
  await assertTest('DB-07', 'Scope Freeze: Purged billing & external claims tables permanently absent', async () => {
    // Attempt querying billing_invoices
    const { error: bError } = await supabase.from('billing_invoices').select('id').limit(1);
    const bMsg = (bError?.message || '').toLowerCase();
    if (!bError || (!bMsg.includes('does not exist') && !bMsg.includes('could not find') && !bMsg.includes('schema cache'))) {
      throw new Error(`billing_invoices table is still present in schema: ${bError?.message || 'found'}`);
    }

    // Attempt querying receipts
    const { error: rError } = await supabase.from('receipts').select('id').limit(1);
    const rMsg = (rError?.message || '').toLowerCase();
    if (!rError || (!rMsg.includes('does not exist') && !rMsg.includes('could not find') && !rMsg.includes('schema cache'))) {
      throw new Error(`receipts table is still present in schema: ${rError?.message || 'found'}`);
    }

    // Attempt querying claims
    const { error: cError } = await supabase.from('claims').select('id').limit(1);
    const cMsg = (cError?.message || '').toLowerCase();
    if (!cError || (!cMsg.includes('does not exist') && !cMsg.includes('could not find') && !cMsg.includes('schema cache'))) {
      throw new Error(`claims table is still present in schema: ${cError?.message || 'found'}`);
    }
  });

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  console.log(`   🏁 Layer 2 Summary: ${passedCount}/${results.length} tests passed.`);
  return { results, createdPatientIds };
}

if (process.argv[1]?.endsWith('layer2-database-integrity.mjs')) {
  runLayer2Tests().then(() => process.exit(0));
}
