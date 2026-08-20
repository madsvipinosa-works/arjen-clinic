import { createClient } from "@/utils/supabase/server";
import { format, isFuture, isToday, startOfDay } from "date-fns";
import Link from "next/link";
import { 
  Calendar, 
  CalendarDays, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  XCircle,
  Plus,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AddToCalendarButton } from "@/components/patient/add-to-calendar-button";

export async function UpcomingAppointmentsSection({ patientId }) {
  const supabase = await createClient();

  const [
    { data: appointments },
    { data: patient }
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false })
      .limit(5),
    supabase
      .from("patients")
      .select("full_name")
      .eq("id", patientId)
      .maybeSingle()
  ]);

  const today = startOfDay(new Date());
  
  // Find the next upcoming scheduled appointment
  const upcomingAppointment = appointments?.find(a => {
    const apptDate = startOfDay(new Date(a.appointment_date));
    return (isFuture(apptDate) || isToday(apptDate)) && a.status !== 'Cancelled' && a.status !== 'Rejected';
  });

  const statusStyles = {
    Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    Approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    Rejected: "bg-destructive/10 text-destructive border border-destructive/20",
    Completed: "bg-secondary text-secondary-foreground border border-border",
    Cancelled: "bg-muted text-muted-foreground border border-border",
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      {/* Next Appointment Highlight Card */}
      <div className="bg-gradient-to-br from-card via-card to-secondary/30 border border-border rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Next Clinic Visit
            </span>
          </div>
          {upcomingAppointment && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusStyles[upcomingAppointment.status] || statusStyles.Pending}`}>
              {upcomingAppointment.status}
            </span>
          )}
        </div>

        {upcomingAppointment ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight">
                {upcomingAppointment.service_type}
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Confirmed clinic booking with prenatal care team.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2.5">
                <div className="flex items-center gap-2 bg-muted/70 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{format(new Date(upcomingAppointment.appointment_date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                {upcomingAppointment.time_preference && (
                  <div className="flex items-center gap-2 bg-muted/70 px-3.5 py-2 rounded-xl text-xs font-bold text-foreground border border-border/50">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{upcomingAppointment.time_preference}</span>
                  </div>
                )}
              </div>

              {/* Native Add to Calendar Action Button */}
              <AddToCalendarButton
                appointmentDate={upcomingAppointment.appointment_date}
                timePreference={upcomingAppointment.time_preference}
                serviceType={upcomingAppointment.service_type}
                patientName={patient?.full_name || ""}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            variant="default"
            icon={CalendarDays}
            title="No Upcoming Appointment"
            description="Regular prenatal checkups monitor your baby's growth and health. Schedule your next visit in just a few taps."
            action={
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold shadow-sm px-6">
                <Link href="/book" className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Book Checkup Now
                </Link>
              </Button>
            }
            className="p-4"
          />
        )}
      </div>

      {/* Recent Appointments List */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">Recent Appointments</h3>
          <Link href="/patient/appointments" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {appointments && appointments.length > 0 ? (
            appointments.map((appt) => (
              <div key={appt.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-secondary flex items-center justify-center text-primary shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{appt.service_type}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {format(new Date(appt.appointment_date), "MMM d, yyyy")}
                      {appt.time_preference ? ` • ${appt.time_preference}` : ""}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyles[appt.status] || statusStyles.Pending}`}>
                  {appt.status}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center space-y-2">
              <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">No appointment history found for this patient profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UpcomingAppointmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 space-y-4">
        <Skeleton className="w-32 h-5 rounded-full" />
        <Skeleton className="w-48 h-7" />
        <div className="flex gap-3">
          <Skeleton className="w-36 h-8 rounded-xl" />
          <Skeleton className="w-24 h-8 rounded-xl" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <Skeleton className="w-40 h-5" />
        <div className="space-y-3">
          <Skeleton className="w-full h-12 rounded-xl" />
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
