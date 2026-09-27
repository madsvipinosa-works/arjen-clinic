// app/admin/page.jsx
import { createClient } from "@/utils/supabase/server";
import { ClinicalCommandCenter } from "@/components/admin/dashboard/clinical-command-center";

export const metadata = {
  title: "Clinical Operations Dashboard | AR-JEN Clinic",
  description: "Real-time clinical management overview for registered patients, appointments, and records.",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Real Database Queries
  const [
    { count: patientsCount },
    { count: appointmentsCount },
    { count: highRiskCount },
    { count: prenatalCount },
    { data: statusRows },
    { data: recentAppts },
    { data: recentPatients },
    { data: highRiskPatients },
  ] = await Promise.all([
    // Real patient total
    supabase.from("patients").select("*", { count: "exact", head: true }),
    // Real appointment total
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    // Real high-risk count
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("is_high_risk", true),
    // Real prenatal records count
    supabase.from("prenatal_records").select("*", { count: "exact", head: true }),
    // Real appointment status breakdown
    supabase.from("appointments").select("status"),
    // Real recent appointments with joined patient details
    supabase
      .from("appointments")
      .select("id, service_type, appointment_date, time_preference, status, created_at, patients(id, full_name, contact_number, is_high_risk)")
      .order("created_at", { ascending: false })
      .limit(8),
    // Real recently registered patients
    supabase
      .from("patients")
      .select("id, full_name, age, contact_number, created_at, is_high_risk, blood_type")
      .order("created_at", { ascending: false })
      .limit(5),
    // Real high-risk flagged patients list
    supabase
      .from("patients")
      .select("id, full_name, age, contact_number, created_at, is_high_risk, blood_type")
      .eq("is_high_risk", true)
      .limit(5),
  ]);

  const statusCounts = { Pending: 0, Approved: 0, Completed: 0, Rejected: 0 };
  statusRows?.forEach((a) => {
    if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
  });

  return (
    <ClinicalCommandCenter
      patientsCount={patientsCount || 0}
      appointmentsCount={appointmentsCount || 0}
      prenatalCount={prenatalCount || 0}
      highRiskCount={highRiskCount || 0}
      statusCounts={statusCounts}
      recentAppts={recentAppts || []}
      recentPatients={recentPatients || []}
      highRiskPatients={highRiskPatients || []}
    />
  );
}
