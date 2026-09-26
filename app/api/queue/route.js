import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getClinicTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const todayStr = getClinicTodayDateString();

    const [
      { data: queueRows, error: queueErr },
      { data: staffUsers },
      { data: settings }
    ] = await Promise.all([
      supabase.rpc("get_today_queue"),
      supabase
        .from("users")
        .select("id, email, role")
        .in("role", ["admin", "doctor", "midwife", "nurse", "staff"]),
      supabase
        .from("clinic_settings")
        .select("clinic_name, navbar_logo")
        .eq("id", 1)
        .single()
    ]);

    if (queueErr) {
      console.error("[api/queue] Error fetching appointments:", queueErr.message);
      return NextResponse.json({ success: false, error: queueErr.message }, { status: 500 });
    }

    const staffMap = {};
    (staffUsers || []).forEach((u) => {
      const prefix = u.role === 'doctor' ? 'Dr. ' : u.role === 'midwife' ? 'Midwife ' : u.role === 'nurse' ? 'Nurse ' : '';
      const rawName = u.email ? u.email.split("@")[0] : "Staff";
      staffMap[u.id] = `${prefix}${rawName}`;
    });

    // Mask patient names for healthcare privacy (DPA / HIPAA compliance)
    // E.g. "Maria Clara Santos" -> "Maria S."
    const sanitizeName = (fullName) => {
      if (!fullName) return "Patient";
      const parts = fullName.trim().split(" ");
      if (parts.length === 1) return parts[0];
      const firstName = parts[0];
      const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
      return `${firstName} ${lastInitial}.`;
    };

    const sanitizedQueue = (queueRows || []).map((a) => ({
      id: a.id,
      ticket_number: a.ticket_number || "—",
      service_type: a.service_type || "General",
      triage_status: a.triage_status || "Waiting",
      patient_name: sanitizeName(a.patient_name),
      attending_staff: staffMap[a.attending_staff_id] || null,
      is_walk_in: !!a.is_walk_in,
      checked_in_at: a.checked_in_at,
    }));

    return NextResponse.json({
      success: true,
      clinic: {
        name: settings?.clinic_name || "AR-JEN Maternity and Lying-In Clinic",
        logo: settings?.navbar_logo || null,
      },
      queue: sanitizedQueue,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/queue] Server error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
