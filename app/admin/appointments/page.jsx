import { createClient } from "@/utils/supabase/server";
import { updateAppointmentStatus } from "../../actions";
import { AppointmentsManager } from "@/components/admin/appointments-manager";

export default async function AppointmentsPage({ searchParams }) {
  const supabase = await createClient();

  // Fetch ALL appointments with patient info — filtering/search/sort done client-side
  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      id,
      service_type,
      appointment_date,
      time_preference,
      notes,
      status,
      created_at,
      patients (
        full_name,
        contact_number
      )
    `)
    .order("appointment_date", { ascending: true });

  return (
    <AppointmentsManager
      appointments={appointments || []}
      updateAppointmentStatus={updateAppointmentStatus}
    />
  );
}
