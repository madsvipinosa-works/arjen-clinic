import { createClient } from "@/utils/supabase/server";
import { updateAppointmentStatus, updateTriageStatus, fetchAppointments } from "../../actions";
import { AppointmentsManager } from "@/components/admin/appointments-manager";
import { getClinicTodayDateString } from "@/lib/utils";

export const metadata = {
  title: "Appointments & Reception Queue | AR-JEN Clinic Admin",
  description: "Live reception queue, Kanban triage board, and historical appointment audit with CSV reporting.",
};

export default async function AppointmentsPage({ searchParams }) {
  const supabase = await createClient();
  const params = await searchParams;
  const range = params?.range || "today"; // Default to Today
  const fromDate = params?.from;
  const toDate = params?.to;
  const statusFilter = params?.status;

  const todayStr = getClinicTodayDateString();
  const today = new Date();

  let query = supabase
    .from("appointments")
    .select(`
      id,
      service_type,
      appointment_date,
      time_preference,
      notes,
      status,
      triage_status,
      attending_staff_id,
      is_walk_in,
      queue_ticket_number,
      checked_in_at,
      created_at,
      patients (
        id,
        full_name,
        contact_number,
        is_high_risk,
        allergies
      )
    `);

  // Status Filter
  if (statusFilter && statusFilter !== "all" && statusFilter !== "All") {
    query = query.eq("status", statusFilter);
  }

  // Date Range Presets
  if (range === "today") {
    query = query.eq("appointment_date", todayStr);
  } else if (range === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    query = query.eq("appointment_date", yesterday.toISOString().split("T")[0]);
  } else if (range === "week") {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.gte("appointment_date", weekAgo.toISOString().split("T")[0]);
  } else if (range === "month") {
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    query = query.gte("appointment_date", monthAgo.toISOString().split("T")[0]);
  } else if (range === "custom") {
    if (fromDate) query = query.gte("appointment_date", fromDate);
    if (toDate) query = query.lte("appointment_date", toDate);
  } // 'all' fetches all past and upcoming records without date constraints

  query = query.order("appointment_date", { ascending: false }).order("created_at", { ascending: false });

  const [
    { data: appointments, error: apptError },
    { data: staffUsers },
    { data: settings }
  ] = await Promise.all([
    query,
    supabase
      .from("users")
      .select("id, email, role")
      .in("role", ["admin", "doctor", "midwife", "nurse", "staff"]),
    supabase
      .from("clinic_settings")
      .select("max_morning_slots, max_afternoon_slots")
      .eq("id", 1)
      .single()
  ]);

  if (apptError) {
    console.error("[AppointmentsPage] Query error:", apptError.message);
  }

  return (
    <AppointmentsManager
      appointments={appointments || []}
      initialAppointments={appointments || []}
      staffUsers={staffUsers || []}
      clinicSettings={settings || { max_morning_slots: 10, max_afternoon_slots: 10 }}
      updateAppointmentStatus={updateAppointmentStatus}
      updateTriageStatus={updateTriageStatus}
      fetchAppointments={fetchAppointments}
      currentRange={range}
      currentFrom={fromDate || ""}
      currentTo={toDate || ""}
      currentStatus={statusFilter || "All"}
    />
  );
}
