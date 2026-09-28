// app/admin/consultations/page.jsx
// AR-JEN Maternity Clinic: Online Consultation Hub & Teleconsultation Inbox

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ConsultationsInbox } from '@/components/admin/consultations-inbox';
import { isStaff } from '@/lib/rbac';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Online Teleconsultations | AR-JEN Clinic Admin',
  description: 'Manage patient teleconsultation inquiries, clinical triage messaging, and obstetric advice.',
};

export default async function AdminConsultationsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedPatientId = resolvedSearchParams?.patientId;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // Fetch current staff user role
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  const userRole = userData?.role || 'staff';

  if (!isStaff(userRole)) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-red-100 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Clinical Staff Only</h2>
        <p className="text-xs text-gray-500">
          Only authorized medical staff (Physicians, Midwives, Nurses, Administrators) can access patient teleconsultation records.
        </p>
        <Link href="/admin">
          <Button variant="outline" className="rounded-xl text-xs font-bold gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // 1. Fetch all consultation messages ordered chronologically
  const { data: messages } = await supabase
    .from('consultation_messages')
    .select('*')
    .order('created_at', { ascending: true });

  // 2. Fetch registered patients (including any deep-linked patient)
  const messagePatientIds = Array.from(new Set(messages?.map(m => m.patient_id) || []));
  const targetPatientIds = requestedPatientId && !messagePatientIds.includes(requestedPatientId)
    ? [...messagePatientIds, requestedPatientId]
    : messagePatientIds;

  const { data: allPatients } = await supabase
    .from('patients')
    .select(`
      *,
      maternal_episodes (*)
    `)
    .order('created_at', { ascending: false })
    .limit(60);

  const patientsList = allPatients || [];

  // If there are requested or message patients not in the limit(60) query, fetch them specifically
  const loadedIds = new Set(patientsList.map(p => p.id));
  const missingIds = targetPatientIds.filter(id => !loadedIds.has(id));
  if (missingIds.length > 0) {
    const { data: missingPatients } = await supabase
      .from('patients')
      .select(`
        *,
        maternal_episodes (*)
      `)
      .in('id', missingIds);
    if (missingPatients) {
      patientsList.push(...missingPatients);
    }
  }

  // 3. Fetch latest visit logs & lab results for clinical snapshot drawer
  const patientIds = patientsList.map(p => p.id);
  const visitLogsByPatient = {};
  const labsByPatient = {};

  if (patientIds.length > 0) {
    const [{ data: visitLogs }, { data: labResults }] = await Promise.all([
      supabase
        .from('visit_logs')
        .select('*')
        .in('patient_id', patientIds)
        .order('visit_date', { ascending: false }),
      supabase
        .from('prenatal_lab_results')
        .select('*')
        .in('patient_id', patientIds)
        .order('test_date', { ascending: false })
    ]);

    visitLogs?.forEach(log => {
      if (!visitLogsByPatient[log.patient_id]) {
        visitLogsByPatient[log.patient_id] = [];
      }
      visitLogsByPatient[log.patient_id].push(log);
    });

    labResults?.forEach(lab => {
      if (!labsByPatient[lab.patient_id]) {
        labsByPatient[lab.patient_id] = [];
      }
      labsByPatient[lab.patient_id].push(lab);
    });
  }

  // 4. Assemble thread structures
  const threadsMap = new Map();

  patientsList.forEach(patient => {
    const logs = visitLogsByPatient[patient.id] || [];
    const labs = labsByPatient[patient.id] || [];
    threadsMap.set(patient.id, {
      patient,
      latestVisitLog: logs[0] || null,
      recentLabs: labs.slice(0, 5),
      messages: [],
      lastMessage: null,
      hasUrgent: false,
      status: 'read',
    });
  });

  // Group messages into their patient threads
  messages?.forEach(msg => {
    let thread = threadsMap.get(msg.patient_id);
    if (!thread) {
      thread = {
        patient: { id: msg.patient_id, full_name: msg.sender_name || 'Patient' },
        latestVisitLog: null,
        recentLabs: [],
        messages: [],
        lastMessage: null,
        hasUrgent: false,
        status: 'read',
      };
      threadsMap.set(msg.patient_id, thread);
    }

    thread.messages.push(msg);
    thread.lastMessage = msg;
    if (msg.is_flagged_urgent) {
      thread.hasUrgent = true;
    }
    if (msg.status === 'unread') {
      thread.status = 'unread';
    } else if (msg.status === 'resolved' && thread.status !== 'unread') {
      thread.status = 'resolved';
    }
  });

  // Convert map to array and sort:
  // 1. Requested patient (if any) first
  // 2. Active threads with messages sorted by lastMessage DESC
  // 3. Other clinic patients sorted alphabetically
  const threadsList = Array.from(threadsMap.values()).sort((a, b) => {
    if (requestedPatientId) {
      if (a.patient?.id === requestedPatientId) return -1;
      if (b.patient?.id === requestedPatientId) return 1;
    }
    const hasMsgA = a.messages.length > 0;
    const hasMsgB = b.messages.length > 0;
    if (hasMsgA && !hasMsgB) return -1;
    if (!hasMsgA && hasMsgB) return 1;

    const timeA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
    const timeB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;

    return (a.patient?.full_name || '').localeCompare(b.patient?.full_name || '');
  });

  const currentStaff = {
    id: user.id,
    email: userData?.email || user.email || '',
    role: userRole,
    fullName: userData?.full_name || userData?.email?.split('@')[0] || 'Clinician On Duty',
  };

  return (
    <div className="w-full">
      <ConsultationsInbox
        initialThreads={threadsList}
        currentStaffRole={userRole}
        currentStaffId={user.id}
        currentStaffEmail={userData?.email || user.email || ''}
        currentStaff={currentStaff}
        requestedPatientId={requestedPatientId}
      />
    </div>
  );
}
