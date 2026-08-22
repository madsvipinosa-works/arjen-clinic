import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { 
  ClipboardList, 
  Activity, 
  Scale, 
  Baby,
  Calendar,
  Printer
} from "lucide-react";
import { PatientSwitcher } from "@/components/patient/patient-switcher";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function PatientHistoryPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const resolvedSearchParams = await searchParams;
  const requestedPatientId = resolvedSearchParams?.patientId;

  // Query patients managed by this user account
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, is_high_risk, blood_type")
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  const activePatient = (requestedPatientId ? patients?.find(p => p.id === requestedPatientId) : null) || patients?.[0];
  const patientId = activePatient?.id || user.id;

  // Fetch visit logs and maternal episodes
  const [
    { data: visitLogs },
    { data: maternalEpisodes }
  ] = await Promise.all([
    supabase
      .from("visit_logs")
      .select("*")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false }),
    supabase
      .from("maternal_episodes")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Medical History</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            Complete timeline of clinic visits, vital signs, and midwife observations.
          </p>
          {patients && patients.length > 0 && (
            <div className="pt-2">
              <PatientSwitcher patients={patients} activePatientId={activePatient?.id} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <a
            href={`/patient/history/print?patientId=${patientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm hover:border-primary/40"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Clinical Summary</span>
          </a>
        </div>
      </div>

      {/* Maternal Episodes Summary Header if available */}
      {maternalEpisodes && maternalEpisodes.length > 0 && (
        <div className="bg-secondary/40 border border-secondary rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Baby className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Recorded Pregnancy Episodes</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {maternalEpisodes.map((ep, idx) => (
              <div key={ep.id} className="p-3.5 bg-card border border-border rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {ep.status === 'Active' ? 'Active Episode' : 'Past Episode'}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ep.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {ep.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground">
                  {ep.lmp ? `LMP: ${format(new Date(ep.lmp), "MMM d, yyyy")}` : `Episode #${maternalEpisodes.length - idx}`}
                </p>
                {ep.edc && (
                  <p className="text-[11px] text-muted-foreground">
                    EDC: {format(new Date(ep.edc), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline of Visits */}
      <div className="relative">
        {/* Central Line */}
        <div className="absolute left-[30px] top-0 bottom-0 w-0.5 bg-border hidden md:block" />

        <div className="space-y-8">
          {visitLogs && visitLogs.length > 0 ? (
            visitLogs.map((log) => (
              <div key={log.id} className="relative md:pl-20 group">
                {/* Timeline Dot */}
                <div className="absolute left-0 md:left-[21px] top-0 w-5 h-5 rounded-full bg-card border-4 border-primary group-hover:scale-125 transition-transform z-10 shadow-sm" />
                
                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden transition-all group-hover:shadow-md">
                  <div className="flex flex-col lg:flex-row">
                    {/* Log Date Side Box */}
                    <div className="lg:w-48 bg-muted/40 p-6 flex flex-col justify-center items-center text-center border-b lg:border-b-0 lg:border-r border-border">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                        {format(new Date(log.visit_date), "yyyy")}
                      </p>
                      <p className="text-2xl font-black text-foreground leading-none">
                        {format(new Date(log.visit_date), "MMM d")}
                      </p>
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 p-6 md:p-8 space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-2xl p-3.5 border border-border flex items-center gap-3">
                          <Activity className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blood Pressure</p>
                            <p className="text-xs sm:text-sm font-black text-foreground">{log.bp || "N/A"}</p>
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-2xl p-3.5 border border-border flex items-center gap-3">
                          <Scale className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weight</p>
                            <p className="text-xs sm:text-sm font-black text-foreground">{log.weight || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">
                          Clinical Observations
                        </h4>
                        <p className="text-foreground/90 text-xs sm:text-sm leading-relaxed font-medium">
                          {log.doctor_notes || "Routine checkup completed."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              variant="dashed"
              icon={ClipboardList}
              title="No medical records yet"
              description="Clinical observations and vital measurements will be automatically logged here after each clinic appointment."
            />
          )}
        </div>
      </div>
    </div>
  );
}
