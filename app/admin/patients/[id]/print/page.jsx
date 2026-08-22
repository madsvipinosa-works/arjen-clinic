import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { PrintableClinicalRecord } from '@/components/admin/patients/printable-clinical-record';
import { AutoPrintTrigger } from '@/components/admin/patients/auto-print-trigger';

export const metadata = {
  title: 'Print Clinical Summary | AR-JEN Clinic',
  description: 'Confidential Patient Maternal Health Record & Clinical Summary',
};

export default async function PatientPrintPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = resolvedParams.id;
  const autoPrint = resolvedSearchParams?.autoprint !== 'false';

  const supabase = await createClient();

  // Auth & RBAC Verification
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // Fetch full clinical history server-side in parallel
  const [
    { data: patient, error: patientError },
    { data: maternalEpisodes },
    { data: visitLogs },
    { data: prenatalRecord },
    { data: birthPlan },
    { data: userProfile },
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('maternal_episodes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.from('visit_logs').select('*').eq('patient_id', id).order('visit_date', { ascending: true }),
    supabase.from('prenatal_records').select('*').eq('patient_id', id).single(),
    supabase.from('birth_plans').select('*').eq('patient_id', id).single(),
    supabase.from('users').select('id, email, role').eq('id', user.id).single(),
  ]);

  if (patientError || !patient) {
    notFound();
  }

  // Audit Logging (DPA 2012 Compliance)
  try {
    await supabase.from('clinical_record_exports').insert({
      patient_id: id,
      exported_by: user.id,
      export_type: 'PRINT_SUMMARY',
      metadata: {
        timestamp: new Date().toISOString(),
        role: userProfile?.role || 'staff',
        patient_name: patient.full_name,
      },
    });
  } catch (err) {
    console.error('[audit_log] Could not record export event:', err);
  }

  const activeEpisode = maternalEpisodes?.find(e => e.status === 'Active') || maternalEpisodes?.[0] || null;
  const staffName = userProfile?.email?.split('@')[0] || user.email || 'Clinician';

  return (
    <main className="min-h-screen bg-neutral-100/60 print:bg-white py-6 px-4 sm:px-6 print:p-0 print:m-0 text-black">
      <div className="max-w-[210mm] mx-auto">
        <AutoPrintTrigger patientId={id} autoPrint={autoPrint} />
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 print:shadow-none print:border-none print:rounded-none overflow-hidden">
          <PrintableClinicalRecord
            patient={patient}
            maternalEpisodes={maternalEpisodes || []}
            activeEpisode={activeEpisode}
            visitLogs={visitLogs || []}
            prenatalRecord={prenatalRecord}
            birthPlan={birthPlan}
            generatedBy={`${staffName} (${userProfile?.role || 'Staff'})`}
          />
        </div>
      </div>
    </main>
  );
}
