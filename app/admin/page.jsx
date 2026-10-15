// app/admin/page.jsx
import { createClient } from "@/utils/supabase/server";
import { ClinicalCommandCenter } from "@/components/admin/dashboard/clinical-command-center";
import { getClinicTodayDateString } from "@/lib/utils";
import { requireStaffSession } from "@/lib/rbac-server";

export const metadata = {
  title: "Clinical Operations Dashboard | AR-JEN Clinic",
  description: "Real-time clinical management overview for registered patients, appointments, and records.",
};

export default async function AdminDashboardPage() {
  // Defense-in-depth: Enforce staff session (Finding 4)
  await requireStaffSession();

  const supabase = await createClient();
  const todayStr = getClinicTodayDateString();

  // High-performance parallel database count and slice queries (O(1) HTTP headers, 0 table scan bloat)
  const [
    { count: patientsCount },
    { count: appointmentsCount },
    { count: todayApptsCount },
    { count: highRiskCount },
    { count: activePrenatalCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: completedCount },
    { count: noShowCount },
    { count: cancelledCount },
    { count: rejectedCount },
    { data: recentAppts },
    { data: recentPatients },
    { data: highRiskPatientsRaw },
  ] = await Promise.all([
    // Real patient total
    supabase.from("patients").select("*", { count: "exact", head: true }),
    // Real lifetime appointment total
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    // Real today's appointment count in Asia/Manila
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", todayStr),
    // Real high-risk maternal count
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("is_high_risk", true),
    // Real active ongoing pregnancy episodes
    supabase.from("maternal_episodes").select("*", { count: "exact", head: true }).eq("status", "Active"),
    // Status counts via O(1) header counts (No in-memory row downloads)
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "Pending"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "Approved"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "Completed"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "No-Show"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "Cancelled"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "Rejected"),
    // Recent appointments with joined patient details and queue tickets
    supabase
      .from("appointments")
      .select("id, service_type, appointment_date, time_preference, status, triage_status, queue_ticket_number, created_at, patients(id, full_name, contact_number, is_high_risk, blood_type)")
      .order("created_at", { ascending: false })
      .limit(10),
    // Recently registered patients with blood type
    supabase
      .from("patients")
      .select("id, full_name, age, contact_number, created_at, is_high_risk, blood_type")
      .order("created_at", { ascending: false })
      .limit(6),
    // Flagged high-risk patients with maternal episodes and recent vitals for clinical triage reasons
    supabase
      .from("patients")
      .select(`
        id, full_name, age, contact_number, created_at, is_high_risk, blood_type,
        maternal_episodes (id, high_risk_reasons, status),
        visit_logs (id, bp, weight, visit_date)
      `)
      .eq("is_high_risk", true)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const statusCounts = {
    Pending: pendingCount || 0,
    Approved: approvedCount || 0,
    Completed: completedCount || 0,
    "No-Show": noShowCount || 0,
    Cancelled: cancelledCount || 0,
    Rejected: rejectedCount || 0,
  };

  // Enrich high-risk patients with the specific clinical reason
  const highRiskPatients = (highRiskPatientsRaw || []).map((patient) => {
    const activeEpisode = patient.maternal_episodes?.find((e) => e.status === "Active") || patient.maternal_episodes?.[0];
    const episodeReasons = activeEpisode?.high_risk_reasons;
    const latestVisit = patient.visit_logs?.[0]; // visit_logs ordered or first item

    let reasonLabel = null;
    if (episodeReasons) {
      reasonLabel = Array.isArray(episodeReasons) ? episodeReasons.filter(Boolean).join(", ") : String(episodeReasons);
    } else if (latestVisit?.bp) {
      const parts = latestVisit.bp.split("/");
      const sys = parseInt(parts[0], 10);
      const dia = parseInt(parts[1], 10);
      if (sys >= 140 || dia >= 90) {
        reasonLabel = `Elevated BP: ${latestVisit.bp} mmHg`;
      }
    }

    return {
      ...patient,
      clinicalReason: reasonLabel || "Clinical Risk Criteria Flagged",
    };
  });

  return (
    <ClinicalCommandCenter
      patientsCount={patientsCount || 0}
      appointmentsCount={appointmentsCount || 0}
      todayApptsCount={todayApptsCount || 0}
      activePrenatalCount={activePrenatalCount || 0}
      highRiskCount={highRiskCount || 0}
      statusCounts={statusCounts}
      recentAppts={recentAppts || []}
      recentPatients={recentPatients || []}
      highRiskPatients={highRiskPatients}
      clinicTodayStr={todayStr}
    />
  );
}

