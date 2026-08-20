import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Heart, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientSwitcher } from "@/components/patient/patient-switcher";
import { 
  ActivePregnancySummary, 
  ActivePregnancySkeleton 
} from "@/components/patient/active-pregnancy-summary";
import { 
  UpcomingAppointmentsSection, 
  UpcomingAppointmentsSkeleton 
} from "@/components/patient/upcoming-appointments";
import { 
  RecentVisitsSection, 
  RecentVisitsSkeleton 
} from "@/components/patient/recent-visits-and-notes";

export default async function PatientDashboard({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Await searchParams in Next.js 15+
  const resolvedSearchParams = await searchParams;
  const requestedPatientId = resolvedSearchParams?.patientId;

  // Query all patients managed by this user account (Decoupled Accounts)
  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select("id, full_name, is_high_risk, created_at")
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  // Handle empty state if no patient records exist for this account yet
  if (!patients || patients.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-lg shadow-black/5 space-y-6">
          <div className="w-20 h-20 bg-secondary/50 border border-secondary rounded-full flex items-center justify-center mx-auto text-primary">
            <Heart className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-foreground tracking-tight">Welcome to AR-JEN Clinic</h1>
            <p className="text-muted-foreground font-medium max-w-md mx-auto text-sm">
              Your patient portal is ready. To get started with prenatal care, schedule your first appointment or contact our clinic team.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 font-bold shadow-md shadow-primary/20">
              <Link href="/book" className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5" />
                Book First Checkup
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 font-bold border-border text-foreground hover:bg-muted">
              <Link href="/patient/consultation">
                Contact Care Team
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine active patient profile
  const activePatient = (requestedPatientId ? patients.find(p => p.id === requestedPatientId) : null) || patients[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Account Context Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/60 backdrop-blur-sm border border-border/60 p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Patient Care Portal
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AR-JEN Maternity
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Hello, <span className="text-primary">{activePatient.full_name?.split(" ")[0] || "there"}!</span>
          </h1>

          <div className="pt-1">
            <PatientSwitcher patients={patients} activePatientId={activePatient.id} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 sm:px-8 font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm">
            <Link href="/book" className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Maternal Episode & Gestational Tracker (Wrapped in Suspense) */}
      <Suspense key={`active-pregnancy-${activePatient.id}`} fallback={<ActivePregnancySkeleton />}>
        <ActivePregnancySummary patientId={activePatient.id} />
      </Suspense>

      {/* Dashboard Dual Grid: Appointments & Clinical Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Next & Recent Appointments */}
        <div className="lg:col-span-2 space-y-8">
          <Suspense key={`appointments-${activePatient.id}`} fallback={<UpcomingAppointmentsSkeleton />}>
            <UpcomingAppointmentsSection patientId={activePatient.id} />
          </Suspense>
        </div>

        {/* Right Column (1 Col): Clinical Observations & Consultation Callout */}
        <div className="space-y-8">
          <Suspense key={`visits-${activePatient.id}`} fallback={<RecentVisitsSkeleton />}>
            <RecentVisitsSection patientId={activePatient.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
