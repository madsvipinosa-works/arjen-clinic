// app/admin/schedule/page.jsx
// AR-JEN Maternity Clinic: Schedule & Shift Capacity Management

import { createClient } from "@/utils/supabase/server";
import { Clock, CalendarCheck } from "lucide-react";
import { TimeSlotList } from "@/components/forms/time-slot-list";
import { AddTimeSlotForm } from "@/components/forms/add-time-slot-form";
import { WeekendPolicyManager } from "@/components/forms/weekend-policy-manager";
import { BlockedDatesManager } from "@/components/forms/blocked-dates-manager";
import { ScheduleCapacityVisualizer } from "@/components/admin/schedule-capacity-visualizer";
import { getClinicTodayDateString, getClinicDateOffset } from "@/lib/utils";
import {
  addBlockedDate,
  removeBlockedDate,
  addTimeSlot,
  deleteTimeSlot,
  updateTimeSlot,
  toggleSaturdayBlock,
  toggleSundayBlock,
} from "../../actions";

import { requireStaffSession } from "@/lib/rbac-server";
import { canManageSystemSettings } from "@/lib/rbac";

export const metadata = {
  title: "Clinic Schedule & Capacity | AR-JEN Clinic Admin",
  description: "Configure booking windows, patient shift limits, and holiday closures for AR-JEN Maternity Clinic.",
};

export default async function ScheduleSettingsPage() {
  await requireStaffSession(canManageSystemSettings);
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const { data: timeSlots } = await supabase
    .from("time_slots")
    .select("id, label, max_capacity, start_time, end_time")
    .order("sort_order", { ascending: true });

  const { data: blockedDates } = await supabase
    .from("blocked_dates")
    .select("*")
    .order("blocked_date", { ascending: true });

  // Today in Philippine Standard Time (PHT, UTC+8)
  const today = getClinicTodayDateString();

  // Fetch upcoming appointments to calculate live capacity load
  const { data: appointments } = await supabase
    .from("appointments")
    .select("appointment_date, time_preference")
    .gte("appointment_date", today)
    .neq("status", "Rejected");

  // Build load map: { "YYYY-MM-DD": { "7:30 AM - 8:30 AM": 4, ... } }
  const loadMap = {};
  appointments?.forEach((a) => {
    if (!a.appointment_date || !a.time_preference) return;
    if (!loadMap[a.appointment_date]) loadMap[a.appointment_date] = {};
    const label = a.time_preference;
    loadMap[a.appointment_date][label] = (loadMap[a.appointment_date][label] || 0) + 1;
  });

  // Rolling 7-day calendar week strictly generated in Philippine Standard Time
  const next7Days = Array.from({ length: 7 }, (_, i) => getClinicDateOffset(i));

  const blockSaturday = settings?.block_saturday || false;
  const blockSunday = settings?.block_sunday || false;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 font-jakarta max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Clinic Schedule &amp; Shift Limits
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-100 flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5" />
              {timeSlots?.length || 0} Active Windows
            </span>
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Configure outpatient appointment windows, patient per-shift capacity, and holiday closure policies.
          </p>
        </div>
      </div>

      {/* ─── 7-Day Rolling Horizon Load Visualizer ──────────────────────── */}
      <ScheduleCapacityVisualizer
        next7Days={next7Days}
        loadMap={loadMap}
        timeSlots={timeSlots || []}
        blockedDates={blockedDates || []}
        blockSaturday={blockSaturday}
        blockSunday={blockSunday}
        todayDateStr={today}
      />

      {/* ─── 2-Column Core Management Workspace ────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">

        {/* ─── Time Slots Manager ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-rose-50/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500 rounded-2xl shadow-md text-white shadow-rose-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Booking Windows &amp; Limits</h2>
                <p className="text-xs text-gray-500">Define triage slots and maximum patient capacity per midwife shift.</p>
              </div>
            </div>
          </div>

          {/* Add New Slot — Client-side validated with overlap prevention */}
          <AddTimeSlotForm
            existingSlots={timeSlots || []}
            addTimeSlot={addTimeSlot}
          />

          {/* Slot List — Interactive with inline capacity auto-save and two-step safe deletion */}
          <TimeSlotList
            timeSlots={timeSlots || []}
            deleteTimeSlot={deleteTimeSlot}
            updateTimeSlot={updateTimeSlot}
          />
        </div>

        {/* ─── Weekend Policies & Blocked Dates ────────────────────────── */}
        <div className="space-y-6">

          {/* Independent Saturday / Sunday Policy Controls */}
          <WeekendPolicyManager
            initialBlockSaturday={blockSaturday}
            initialBlockSunday={blockSunday}
            toggleSaturdayBlock={toggleSaturdayBlock}
            toggleSundayBlock={toggleSundayBlock}
          />

          {/* Specific Blocked Dates & Philippine Closure Presets */}
          <BlockedDatesManager
            blockedDates={blockedDates || []}
            addBlockedDate={addBlockedDate}
            removeBlockedDate={removeBlockedDate}
            todayDate={today}
          />

        </div>
      </div>
    </div>
  );
}
