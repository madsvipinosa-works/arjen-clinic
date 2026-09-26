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

  // 2. Fetch all patients who have participated in consultations (plus requested patient if deep-linked)
  const messagePatientIds = Array.from(new Set(messages?.map(m => m.patient_id) || []));
  const targetPatientIds = requestedPatientId && !messagePatientIds.includes(requestedPatientId)
    ? [...messagePatientIds, requestedPatientId]
    : messagePatientIds;

  let patients = [];
  if (targetPatientIds.length > 0) {
    const { data: patientsData } = await supabase
      .from('patients')
      .select(`
        id, full_name, age, phone_number, is_high_risk, high_risk_reasons,
        maternal_episodes (id, lmp, edc, gravidity, parity, status)
      `)
      .in('id', targetPatientIds);

    patients = patientsData || [];
  }

  // 3. Assemble thread structures
  const threadsMap = new Map();

  // Populate map for each patient
  patients.forEach(patient => {
    threadsMap.set(patient.id, {
      patient,
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
      // In case patient profile was deleted or not found
      thread = {
        patient: { id: msg.patient_id, full_name: msg.sender_name || 'Patient' },
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

  // Convert map to array and sort by requested patient first, then by most recent message DESC
  const threadsList = Array.from(threadsMap.values()).sort((a, b) => {
    if (requestedPatientId) {
      if (a.patient?.id === requestedPatientId) return -1;
      if (b.patient?.id === requestedPatientId) return 1;
    }
    const timeA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
    const timeB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <ConsultationsInbox
        initialThreads={threadsList}
        currentStaffRole={userRole}
        currentStaffId={user.id}
        currentStaffEmail={userData?.email || user.email || ''}
        requestedPatientId={requestedPatientId}
      />
    </div>
  );
}
