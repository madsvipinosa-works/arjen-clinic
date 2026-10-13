"use client";

import React from "react";
import Link from "next/link";
import { 
  CalendarDays, CalendarX2, AlertCircle, ArrowUpRight, 
  CheckCircle2, Flame, AlertTriangle, Users
} from "lucide-react";

export function ScheduleCapacityVisualizer({
  next7Days = [],
  loadMap = {},
  timeSlots = [],
  blockedDates = [],
  blockSaturday = false,
  blockSunday = false,
  todayDateStr = "",
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden font-jakarta">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-emerald-50/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500 rounded-2xl shadow-md text-white shadow-emerald-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-lg tracking-tight">
                7-Day Incoming Shift Capacity & Load
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                PHT Synced
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Live maternal booking volume across all lying-in shifts for the upcoming week. Click any date to view appointments.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 flex-wrap">
          <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;70% Capacity
          </span>
          <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 70-90% Busy
          </span>
          <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> &gt;90% Full / Peak
          </span>
        </div>
      </div>

      {/* 7-Day Rolling Horizon Scroll Area */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {next7Days.map((dateStr) => {
            // Parse date strictly in PHT
            const [y, m, d] = dateStr.split("-").map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d, 4, 0, 0));
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isSaturdayBlocked = dayOfWeek === 6 && blockSaturday;
            const isSundayBlocked = dayOfWeek === 0 && blockSunday;
            const blockedMatch = blockedDates?.find((b) => b.blocked_date === dateStr);
            const isBlocked = Boolean(blockedMatch) || isSaturdayBlocked || isSundayBlocked;
            const isToday = dateStr === todayDateStr;

            const dayLoad = loadMap[dateStr] || {};

            // Calculate cumulative metrics for the day
            let totalBooked = 0;
            let totalMax = 0;
            timeSlots?.forEach((slot) => {
              totalBooked += dayLoad[slot.label] || 0;
              totalMax += slot.max_capacity || 0;
            });

            const dayPercent = totalMax > 0 ? Math.min(100, Math.round((totalBooked / totalMax) * 100)) : 0;
            const isDayFull = totalMax > 0 && totalBooked >= totalMax;

            const weekdayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const monthDayLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return (
              <div
                key={dateStr}
                className={`w-52 flex-shrink-0 rounded-2xl border p-4.5 transition-all flex flex-col justify-between ${
                  isBlocked
                    ? "bg-slate-50/80 border-slate-200/60 opacity-60"
                    : isToday
                    ? "bg-gradient-to-b from-emerald-50/40 via-white to-white border-emerald-300 ring-2 ring-emerald-400/20 shadow-md"
                    : "bg-white border-gray-200/80 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Card Header & Link to Appointments */}
                  <Link
                    href={`/admin/appointments?date=${dateStr}`}
                    className="block group/link mb-3 pb-2.5 border-b border-gray-100"
                    title={`View appointments for ${dateStr}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isToday ? "text-emerald-700" : "text-gray-400"
                        }`}>
                          {weekdayLabel}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                            Today
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover/link:text-emerald-600 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all" />
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm font-bold text-gray-900 group-hover/link:text-emerald-700 transition-colors">
                        {monthDayLabel}
                      </p>

                      {/* Cumulative Load Pill */}
                      {!isBlocked && totalMax > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                          isDayFull || dayPercent >= 90
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : dayPercent >= 70
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {totalBooked}/{totalMax} ({dayPercent}%)
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Body Content */}
                  {blockedMatch ? (
                    <div className="py-6 text-center space-y-1">
                      <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
                      <p className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">
                        Clinic Closed
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium truncate px-1">
                        {blockedMatch.reason}
                      </p>
                    </div>
                  ) : (isSaturdayBlocked || isSundayBlocked) ? (
                    <div className="py-6 text-center space-y-1">
                      <CalendarX2 className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                        Weekend Blocked
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {isSaturdayBlocked ? "Saturday Policy Off" : "Sunday Policy Off"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {timeSlots?.map((slot) => {
                        const count = dayLoad[slot.label] || 0;
                        const percentage = Math.min((count / slot.max_capacity) * 100, 100);
                        const isFull = count >= slot.max_capacity;

                        return (
                          <div key={slot.id} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-gray-600 truncate mr-2">
                                {slot.label}
                              </span>
                              <span className={isFull ? "text-rose-600 font-black" : "text-gray-400"}>
                                {count}/{slot.max_capacity}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isFull
                                    ? "bg-rose-500"
                                    : percentage >= 70
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {timeSlots?.length === 0 && (
                        <p className="text-[11px] text-gray-400 italic text-center py-4">
                          No active booking slots configured
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                {!isBlocked && (
                  <div className="pt-3 mt-3 border-t border-gray-100 text-center">
                    <Link
                      href={`/admin/appointments?date=${dateStr}`}
                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Manage Day Schedule</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
