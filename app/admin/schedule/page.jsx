import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarX2, Clock, Plus, Trash2, CalendarDays, AlertCircle } from "lucide-react";
import { TimeSlotList } from "@/components/forms/time-slot-list";
import {
  addBlockedDate,
  removeBlockedDate,
  addTimeSlot,
  deleteTimeSlot,
  updateTimeSlot,
  toggleSaturdayBlock,
  toggleSundayBlock,
} from "../../actions";

export default async function ScheduleSettingsPage() {
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

  // Fetch upcoming appointments to calculate load (Phase 1 completion)
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments } = await supabase
    .from("appointments")
    .select("appointment_date, time_preference")
    .gte("appointment_date", today)
    .neq("status", "Rejected");

  // Build load map: { "2026-05-01": { "7:30 AM - 8:30 AM": 4, ... } }
  const loadMap = {};
  appointments?.forEach((a) => {
    if (!a.appointment_date || !a.time_preference) return;
    if (!loadMap[a.appointment_date]) loadMap[a.appointment_date] = {};
    const label = a.time_preference;
    loadMap[a.appointment_date][label] = (loadMap[a.appointment_date][label] || 0) + 1;
  });

  // Get next 5 days for the load view (typical work week)
  const next5Days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const blockSaturday = settings?.block_saturday || false;
  const blockSunday   = settings?.block_sunday   || false;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clinic Schedule</h1>
        <p className="text-gray-500 mt-1">Configure booking windows, patient limits, and blocked dates.</p>
      </div>

      {/* ─── Incoming Patient Load (Phase 1 Visualizer) ────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-emerald-50/40">
          <div className="p-2 bg-emerald-500 rounded-xl shadow-md">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Incoming Patient Load</h2>
            <p className="text-xs text-gray-500">Overview of booked slots for the next 5 days.</p>
          </div>
        </div>
        
        <div className="p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-2">
            {next5Days.map((dateStr) => {
              const dateObj = new Date(dateStr + 'T00:00:00');
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isBlocked = blockedDates?.some(b => b.blocked_date === dateStr);
              const dayLoad = loadMap[dateStr] || {};
              
              return (
                <div 
                  key={dateStr} 
                  className={`w-48 flex-shrink-0 rounded-2xl border p-4 transition-all ${
                    isBlocked || (dateObj.getDay() === 6 && blockSaturday) || (dateObj.getDay() === 0 && blockSunday)
                      ? "bg-gray-50 border-gray-100 opacity-60"
                      : "bg-white border-gray-100 hover:shadow-md"
                  }`}
                >
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {isBlocked ? (
                    <div className="py-4 text-center">
                      <AlertCircle className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Blocked</p>
                    </div>
                  ) : (isWeekend && ((dateObj.getDay() === 6 && blockSaturday) || (dateObj.getDay() === 0 && blockSunday))) ? (
                    <div className="py-4 text-center">
                      <CalendarX2 className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Weekend</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeSlots?.map(slot => {
                        const count = dayLoad[slot.label] || 0;
                        const percentage = Math.min((count / slot.max_capacity) * 100, 100);
                        const isFull = count >= slot.max_capacity;
                        
                        return (
                          <div key={slot.id} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="text-gray-500 truncate mr-2">{slot.label.split(' ')[0]}</span>
                              <span className={isFull ? "text-red-500" : "text-gray-400"}>
                                {count}/{slot.max_capacity}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isFull ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {timeSlots?.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic text-center py-4">No slots active</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">

        {/* ─── Time Slots Manager ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-rose-50/40">
            <div className="p-2 bg-rose-500 rounded-xl shadow-md">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Time Slots</h2>
              <p className="text-xs text-gray-500">Define specific booking windows with patient limits.</p>
            </div>
          </div>

          {/* Add New Slot — two time pickers */}
          <form action={addTimeSlot} className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Start Time</Label>
                <Input
                  type="time"
                  name="start_time"
                  required
                  className="focus-visible:ring-rose-500 h-10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">End Time</Label>
                <Input
                  type="time"
                  name="end_time"
                  required
                  className="focus-visible:ring-rose-500 h-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Max Patients</Label>
                <Input
                  name="max_capacity"
                  type="number"
                  defaultValue={10}
                  min={1}
                  className="focus-visible:ring-rose-500 h-10"
                  required
                />
              </div>
              <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-10 px-5 gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Add Slot
              </Button>
            </div>
          </form>

          {/* Slot List — client component handles edit state */}
          <TimeSlotList
            timeSlots={timeSlots || []}
            deleteTimeSlot={deleteTimeSlot}
            updateTimeSlot={updateTimeSlot}
          />
        </div>

        {/* ─── Weekend + Blocked Dates ──────────────────────────── */}
        <div className="space-y-6">

          {/* Separate Saturday / Sunday Toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-slate-50/40">
              <div className="p-2 bg-slate-800 rounded-xl shadow-md">
                <CalendarX2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Weekend Policy</h2>
                <p className="text-xs text-gray-500">Independently block Saturday and/or Sunday bookings.</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {/* Saturday Toggle */}
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-semibold text-gray-800">Block Saturdays</p>
                  <p className="text-xs text-gray-400 mt-0.5">Prevent patients from booking on all Saturdays.</p>
                </div>
                <form action={toggleSaturdayBlock}>
                  <input type="hidden" name="block_saturday" value={blockSaturday ? "false" : "true"} />
                  <Button
                    type="submit"
                    className={`h-9 px-5 rounded-xl font-semibold text-sm transition-all ${
                      blockSaturday
                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {blockSaturday ? "✓ Blocked" : "Off"}
                  </Button>
                </form>
              </div>

              {/* Sunday Toggle */}
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-semibold text-gray-800">Block Sundays</p>
                  <p className="text-xs text-gray-400 mt-0.5">Prevent patients from booking on all Sundays.</p>
                </div>
                <form action={toggleSundayBlock}>
                  <input type="hidden" name="block_sunday" value={blockSunday ? "false" : "true"} />
                  <Button
                    type="submit"
                    className={`h-9 px-5 rounded-xl font-semibold text-sm transition-all ${
                      blockSunday
                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {blockSunday ? "✓ Blocked" : "Off"}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Specific Blocked Dates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/40">
              <h2 className="font-bold text-gray-900 text-lg">Blocked Dates</h2>
              <p className="text-xs text-gray-500 mt-0.5">Lock specific dates like holidays or doctor leaves.</p>
            </div>

            <div className="p-5 space-y-4">
              <form action={addBlockedDate} className="flex flex-col sm:flex-row gap-3">
                <Input type="date" name="blocked_date" className="flex-1 focus-visible:ring-slate-500 h-10" required />
                <Input type="text" name="reason" placeholder="Reason (e.g. Holiday)" className="flex-1 focus-visible:ring-slate-500 h-10" required />
                <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-10 px-4 gap-1.5 whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Block
                </Button>
              </form>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {blockedDates?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No dates currently blocked.</p>
                ) : (
                  blockedDates?.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700 text-sm">{b.blocked_date}</span>
                        <span className="text-xs text-slate-400 font-medium bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                          {b.reason}
                        </span>
                      </div>
                      <form action={removeBlockedDate}>
                        <input type="hidden" name="id" value={b.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
