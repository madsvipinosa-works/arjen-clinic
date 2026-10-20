// app/admin/patients/[id]/page.jsx
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { requireStaffSession } from '@/lib/rbac-server';
import { canAccessClinicalRecords } from '@/lib/rbac';
import { PatientDetailClient } from '@/components/admin/patients/patient-detail-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const resolved = await params;
  return {
    title: `Patient Chart | AR-JEN Clinic EMR`,
    description: 'Digital maternal clinical records, obstetric timeline, and DOH/PhilHealth compliance.',
  };
}

export default async function PatientDetailPage({ params, searchParams }) {
  try {
    // Enforce server-side clinical role verification
    const { user, supabase } = await requireStaffSession(canAccessClinicalRecords);

    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const id = resolvedParams?.id;
    const selectedEpisodeId = resolvedSearchParams?.episode;
    const defaultTab = resolvedSearchParams?.tab || 'profile';

    if (!id) {
      return (
        <div className="flex h-64 items-center justify-center text-gray-400">
          Missing or invalid patient ID parameter.
        </div>
      );
    }

    const [
      patientRes,
      birthPlanRes,
      prenatalRecordRes,
      visitLogsRes,
      consultationMessagesRes,
      attachmentsRes,
      maternalEpisodesRes,
      staffUsersListRes,
      prenatalLabResultsRes,
      postpartumRecordsRes
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).maybeSingle(),
      supabase.from('birth_plans').select('*').eq('patient_id', id).maybeSingle(),
      supabase.from('prenatal_records').select('*').eq('patient_id', id).maybeSingle(),
      supabase.from('visit_logs').select('*').eq('patient_id', id).order('visit_date', { ascending: false }),
      supabase.from('consultation_messages').select('*').eq('patient_id', id).order('created_at', { ascending: true }),
      supabase.from('patient_attachments').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('maternal_episodes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('users').select('id, email, role'),
      supabase.from('prenatal_lab_results').select('*').eq('patient_id', id).order('test_date', { ascending: false }),
      supabase.from('postpartum_records').select('*').eq('patient_id', id).order('created_at', { ascending: false })
    ]);

    if (patientRes?.error) console.error('[PatientDetailPage] patient query error:', patientRes.error.message);
    if (birthPlanRes?.error) console.error('[PatientDetailPage] birthPlan query error:', birthPlanRes.error.message);
    if (prenatalRecordRes?.error) console.error('[PatientDetailPage] prenatalRecord query error:', prenatalRecordRes.error.message);
    if (visitLogsRes?.error) console.error('[PatientDetailPage] visitLogs query error:', visitLogsRes.error.message);

    const patient = patientRes?.data || null;
    const birthPlan = birthPlanRes?.data || null;
    const prenatalRecord = prenatalRecordRes?.data || null;
    const visitLogs = Array.isArray(visitLogsRes?.data) ? visitLogsRes.data : [];
    const consultationMessages = Array.isArray(consultationMessagesRes?.data) ? consultationMessagesRes.data : [];
    const attachments = Array.isArray(attachmentsRes?.data) ? attachmentsRes.data : [];
    const maternalEpisodes = Array.isArray(maternalEpisodesRes?.data) ? maternalEpisodesRes.data : [];
    const staffUsersList = Array.isArray(staffUsersListRes?.data) ? staffUsersListRes.data : [];
    const prenatalLabResults = Array.isArray(prenatalLabResultsRes?.data) ? prenatalLabResultsRes.data : [];
    const postpartumRecords = Array.isArray(postpartumRecordsRes?.data) ? postpartumRecordsRes.data : [];

    if (!patient) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <p className="text-gray-500 font-medium text-sm">Record not found or invalid patient ID.</p>
          <Link
            href="/admin/patients"
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            ← Return to Patient Directory
          </Link>
        </div>
      );
    }

    // Generate short-lived signed URLs for private patient records
    const attachmentsWithSignedUrls = await Promise.all(
      (attachments || []).filter(Boolean).map(async (file) => {
        const storagePath = file.file_path || file.file_url;
        try {
          if (typeof storagePath === 'string' && !storagePath.startsWith('http://') && !storagePath.startsWith('https://')) {
            const { data: signedData } = await supabase.storage
              .from('patient-records')
              .createSignedUrl(storagePath, 3600);
            return {
              ...file,
              file_url: signedData?.signedUrl || file.file_url
            };
          } else if (typeof storagePath === 'string' && storagePath.includes('/patient-records/')) {
            const relativePath = storagePath.split('/patient-records/')[1];
            if (relativePath) {
              const { data: signedData } = await supabase.storage
                .from('patient-records')
                .createSignedUrl(decodeURIComponent(relativePath), 3600);
              return {
                ...file,
                file_url: signedData?.signedUrl || file.file_url
              };
            }
          }
        } catch (err) {
          console.warn("[PatientAttachment] Signed URL creation fallback:", err.message);
        }
        return file;
      })
    );

    // Create staff name map with null-safe handling
    const staffMap = {};
    (staffUsersList || []).forEach(u => {
      if (!u || !u.id) return;
      const shortId = typeof u.id === 'string' ? u.id.slice(0, 6) : String(u.id);
      staffMap[u.id] = u.email ? u.email.split('@')[0] : `Staff (${shortId})`;
    });

    const safeEpisodes = Array.isArray(maternalEpisodes) ? maternalEpisodes : [];
    const activeEpisode = (selectedEpisodeId ? safeEpisodes.find(e => e?.id === selectedEpisodeId) : null)
      || safeEpisodes.find(e => e?.status === 'Active')
      || safeEpisodes[0]
      || null;

    return (
      <Suspense fallback={
        <div className="w-full max-w-7xl mx-auto py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500">Loading Clinical Maternal Chart...</p>
        </div>
      }>
        <PatientDetailClient
          patient={patient}
          birthPlan={birthPlan}
          prenatalRecord={prenatalRecord}
          visitLogs={visitLogs}
          consultationMessages={consultationMessages}
          attachmentsWithSignedUrls={attachmentsWithSignedUrls}
          maternalEpisodes={safeEpisodes}
          staffMap={staffMap}
          prenatalLabResults={prenatalLabResults}
          postpartumRecords={postpartumRecords}
          activeEpisode={activeEpisode}
          id={id}
          defaultTab={defaultTab}
        />
      </Suspense>
    );
  } catch (err) {
    if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err;
    }

    console.error('[PatientDetailPage SERVER ERROR]:', err);

    return (
      <div className="w-full max-w-4xl mx-auto my-12 p-8 bg-red-50/90 border border-red-200/90 rounded-3xl space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/20">
            ⚠️
          </div>
          <div>
            <h2 className="text-xl font-black text-red-900 tracking-tight">Clinical Chart Render Diagnostics</h2>
            <p className="text-xs text-red-700">A server-side rendering error was caught while compiling this patient&apos;s chart.</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 space-y-2">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Error Name &amp; Message:</p>
          <p className="text-sm font-mono font-bold text-gray-900 break-all">
            {err?.name || 'Error'}: {err?.message || 'Unknown server exception'}
          </p>
          {err?.stack && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Server Stack Trace:</p>
              <pre className="text-[11px] font-mono text-gray-700 overflow-x-auto max-h-48 p-2 bg-gray-50 rounded-xl leading-relaxed">
                {err.stack}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/admin/patients"
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-sm shadow-red-500/20 transition-all"
          >
            ← Return to Patient Directory
          </Link>
        </div>
      </div>
    );
  }
}
