import { createClient } from "@/utils/supabase/server";
import { updateAppointmentStatus } from "../../actions";
import { AppointmentsManager } from "@/components/admin/appointments-manager";

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const [
    { data: appointments },
    { data: staffUsers },
    { data: settings }
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        appointment_date,
        time_preference,
        notes,
        status,
        attending_staff_id,
        created_at,
        patients (
          id,
          full_name,
          contact_number,
          is_high_risk,
          allergies
        )
      `)
      .order("appointment_date", { ascending: true }),
    supabase
      .from("users")
      .select("id, email, role")
      .in("role", ["admin", "staff"]),
    supabase
      .from("clinic_settings")
      .select("max_morning_slots, max_afternoon_slots")
      .eq("id", 1)
      .single()
  ]);

  return (
    <AppointmentsManager
      appointments={appointments || []}
      staffUsers={staffUsers || []}
      clinicSettings={settings || { max_morning_slots: 10, max_afternoon_slots: 10 }}
      updateAppointmentStatus={updateAppointmentStatus}
    />
  );
}
