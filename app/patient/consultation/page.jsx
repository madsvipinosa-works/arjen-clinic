import { createClient } from "@/utils/supabase/server";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { ConsultationThread } from "@/components/shared/consultation-thread";
import { PatientSwitcher } from "@/components/patient/patient-switcher";

export default async function ConsultationPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const resolvedSearchParams = await searchParams;
  const requestedPatientId = resolvedSearchParams?.patientId;

  // Query patients managed by this user account
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, is_high_risk")
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  const activePatient = (requestedPatientId ? patients?.find(p => p.id === requestedPatientId) : null) || patients?.[0];
  const patientId = activePatient?.id || user.id;

  const [{ data: messages }] = await Promise.all([
    supabase
      .from("consultation_messages")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-200px)] sm:h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Thread Header */}
      <div className="bg-card rounded-t-3xl border-x border-t border-border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Online Consultation</h1>
            <p className="text-xs font-semibold text-primary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Private & Encrypted Clinical Thread
            </p>
          </div>
        </div>

        {patients && patients.length > 0 && (
          <div>
            <PatientSwitcher patients={patients} activePatientId={activePatient?.id} />
          </div>
        )}
      </div>

      {/* Real-time Thread */}
      <div className="flex-1 bg-card border-x border-b border-border rounded-b-3xl overflow-hidden shadow-sm flex flex-col min-h-0">
        <ConsultationThread
          patientId={patientId}
          senderId={user.id}
          senderRole="patient"
          initialMessages={messages || []}
          compact={false}
        />
      </div>
    </div>
  );
}
