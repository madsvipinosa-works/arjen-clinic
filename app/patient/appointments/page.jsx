import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { 
  CalendarDays, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  HelpCircle, 
  AlertCircle,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cancelAppointment } from "../../actions";
import { PatientSwitcher } from "@/components/patient/patient-switcher";

export default async function PatientAppointmentsPage({ searchParams }) {
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

  // Fetch appointments for this active patient or all patients under account
  const patientIds = activePatient ? [activePatient.id] : (patients?.map(p => p.id) || [user.id]);
  
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .in("patient_id", patientIds)
    .order("appointment_date", { ascending: false });

  const statusConfig = {
    Pending:   { icon: HelpCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    Approved:  { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    Rejected:  { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
    Completed: { icon: CheckCircle2, color: "text-primary", bg: "bg-secondary", border: "border-border" },
    Cancelled: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Track your requests, upcoming checkups, and clinic schedules.</p>
          {patients && patients.length > 0 && (
            <div className="pt-2">
              <PatientSwitcher patients={patients} activePatientId={activePatient?.id} />
            </div>
          )}
        </div>

        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold shadow-md shadow-primary/20">
          <Link href="/book" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Book Checkup
          </Link>
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments && appointments.length > 0 ? (
          appointments.map((appt) => {
            const config = statusConfig[appt.status] || statusConfig.Pending;
            const canCancel = appt.status === 'Pending' || appt.status === 'Approved';
            
            return (
              <div 
                key={appt.id} 
                className={`bg-card rounded-3xl border ${config.border} p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center shrink-0`}>
                    <config.icon className={`w-7 h-7 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground text-lg uppercase tracking-tight">{appt.service_type}</h3>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <CalendarDays className="w-3.5 h-3.5 text-primary" />
                        {format(new Date(appt.appointment_date), "MMMM d, yyyy")}
                      </p>
                      {appt.time_preference && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {appt.time_preference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t border-border md:border-none pt-4 md:pt-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${config.bg} ${config.color}`}>
                    {appt.status}
                  </span>
                  {canCancel && appt.status !== 'Cancelled' && (
                    <form action={cancelAppointment}>
                      <input type="hidden" name="id" value={appt.id} />
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-wider px-3 h-9 rounded-xl">
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No appointments scheduled yet"
            description="You haven&apos;t scheduled any visits yet. Tap below to start your initial prenatal booking."
            action={
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 font-bold">
                <Link href="/book">Schedule Checkup</Link>
              </Button>
            }
          />
        )}
      </div>

      {/* Clinic Policy Card */}
      <div className="bg-secondary/40 border border-secondary rounded-3xl p-6 flex items-start gap-4 text-secondary-foreground">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-black text-foreground uppercase tracking-wider text-xs mb-1">Clinic Policy & Reminder</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Please arrive 15 minutes before your scheduled appointment. If you need to reschedule or cancel, try to do so at least 24 hours in advance. For sudden concerns or urgent triage, use the emergency hotline.
          </p>
        </div>
      </div>
    </div>
  );
}
