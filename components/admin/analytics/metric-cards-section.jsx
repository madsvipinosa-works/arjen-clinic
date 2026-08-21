import { createClient } from "@/utils/supabase/server";
import { MetricCard } from "./metric-card";
import { Users, HeartHandshake, CalendarCheck2, CheckCircle2 } from "lucide-react";
import { getClinicTodayDateString } from "@/lib/utils";

export async function MetricCardsSection() {
  const supabase = await createClient();
  const todayStr = getClinicTodayDateString();

  const { data: metricsData, error } = await supabase.rpc("get_clinic_key_metrics", {
    target_date: todayStr,
  });

  if (error) {
    console.error("[MetricCardsSection] RPC error:", error.message);
  }

  const metrics = metricsData?.[0] || {
    total_patients: 0,
    active_pregnancies: 0,
    today_appointments: 0,
    today_completed: 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <MetricCard
        title="Total Patients"
        value={metrics.total_patients}
        subtitle="Registered in clinic database"
        icon={Users}
        colorScheme="primary"
      />
      <MetricCard
        title="Active Pregnancies"
        value={metrics.active_pregnancies}
        subtitle="Ongoing maternal episodes"
        icon={HeartHandshake}
        colorScheme="rose"
      />
      <MetricCard
        title="Today's Appointments"
        value={metrics.today_appointments}
        subtitle="Booked checkups today"
        icon={CalendarCheck2}
        colorScheme="indigo"
      />
      <MetricCard
        title="Completed Today"
        value={metrics.today_completed}
        subtitle="Discharged / exam done"
        icon={CheckCircle2}
        colorScheme="emerald"
      />
    </div>
  );
}
