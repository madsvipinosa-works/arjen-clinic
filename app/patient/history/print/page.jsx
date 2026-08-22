import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { PrintableClinicalRecord } from '@/components/admin/patients/printable-clinical-record';
import { AutoPrintTrigger } from '@/components/admin/patients/auto-print-trigger';

export const metadata = {
  title: 'My Medical Record Summary | AR-JEN Clinic',
  description: 'Confidential Patient Maternal Health Record & Clinical Summary',
};

export default async function PatientPortalPrintPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedPatientId = resolvedSearchParams?.patientId;
  const autoPrint = resolvedSearchParams?.autoprint !== 'false';

  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get patients managed by this user
  const { data: managedPatients } = await supabase
    .from('patients')
    .select('*')
    .eq('account_id', user.id);

  // If no patients found with account_id, check patient with id = user.id
  let targetPatient = requestedPatientId 
    ? managedPatients?.find(p => p.id === requestedPatientId)
    : managedPatients?.[0];

  if (!targetPatient) {
    const { data: directPatient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', user.id)
      .single();

    targetPatient = directPatient;
  }

  if (!targetPatient) {
    notFound();
  }

  const patientId = targetPatient.id;

  // Fetch full clinical history server-side in parallel
  const [
    { data: maternalEpisodes },
    { data: visitLogs },
    { data: prenatalRecord },
    { data: birthPlan },
  ] = await Promise.all([
    supabase.from('maternal_episodes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    supabase.from('visit_logs').select('*').eq('patient_id', patientId).order('visit_date', { ascending: true }),
    supabase.from('prenatal_records').select('*').eq('patient_id', patientId).single(),
    supabase.from('birth_plans').select('*').eq('patient_id', patientId).single(),
  ]);

  // Audit Logging (DPA 2012 Compliance)
  try {
    await supabase.from('clinical_record_exports').insert({
      patient_id: patientId,
      exported_by: user.id,
      export_type: 'PATIENT_PORTAL_PRINT',
      metadata: {
        timestamp: new Date().toISOString(),
        patient_name: targetPatient.full_name,
      },
    });
  } catch (err) {
    console.error('[audit_log] Could not record export event:', err);
  }

  const activeEpisode = maternalEpisodes?.find(e => e.status === 'Active') || maternalEpisodes?.[0] || null;

  return (
    <main className="min-h-screen bg-neutral-100/60 print:bg-white py-6 px-4 sm:px-6 print:p-0 print:m-0 text-black">
      <div className="max-w-[210mm] mx-auto">
        <AutoPrintTrigger
          patientId={patientId}
          backUrl={`/patient/history?patientId=${patientId}`}
          autoPrint={autoPrint}
        />
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 print:shadow-none print:border-none print:rounded-none overflow-hidden">
          <PrintableClinicalRecord
            patient={targetPatient}
            maternalEpisodes={maternalEpisodes || []}
            activeEpisode={activeEpisode}
            visitLogs={visitLogs || []}
            prenatalRecord={prenatalRecord}
            birthPlan={birthPlan}
            generatedBy={`Patient (${targetPatient.full_name})`}
          />
        </div>
      </div>
    </main>
  );
}
