"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CalendarX2, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

export function WeekendPolicyManager({
  initialBlockSaturday = false,
  initialBlockSunday = false,
  toggleSaturdayBlock,
  toggleSundayBlock,
}) {
  const [blockSaturday, setBlockSaturday] = useState(initialBlockSaturday);
  const [blockSunday, setBlockSunday] = useState(initialBlockSunday);
  const [isSatPending, startSatTransition] = useTransition();
  const [isSunPending, startSunTransition] = useTransition();

  const handleToggleSaturday = () => {
    const nextVal = !blockSaturday;
    setBlockSaturday(nextVal);
    const fd = new FormData();
    fd.append("block_saturday", nextVal ? "true" : "false");
    startSatTransition(async () => {
      await toggleSaturdayBlock(fd);
    });
  };

  const handleToggleSunday = () => {
    const nextVal = !blockSunday;
    setBlockSunday(nextVal);
    const fd = new FormData();
    fd.append("block_sunday", nextVal ? "true" : "false");
    startSunTransition(async () => {
      await toggleSundayBlock(fd);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-slate-50/40">
        <div className="p-2 bg-slate-800 rounded-xl shadow-md">
          <CalendarX2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Weekend Operating Policy</h2>
          <p className="text-xs text-gray-500">Configure whether the clinic accepts online appointments on weekends.</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Saturday Toggle */}
        <div className="flex items-center justify-between px-6 py-4.5 gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Saturday Schedule</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                blockSaturday
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {blockSaturday ? "🚫 Blocked / Closed" : "✓ Open for Consults"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {blockSaturday 
                ? "Patients cannot select any Saturday in the booking calendar." 
                : "Open for prenatal checkups, lab triage, and routine consults."
              }
            </p>
          </div>

          <Button
            type="button"
            disabled={isSatPending}
            onClick={handleToggleSaturday}
            className={`h-9 px-4 rounded-xl font-bold text-xs transition-all gap-1.5 shadow-2xs ${
              blockSaturday
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            {isSatPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : blockSaturday ? (
              <>
                <CalendarX2 className="w-3.5 h-3.5" />
                <span>Unblock Saturday</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Block Saturday</span>
              </>
            )}
          </Button>
        </div>

        {/* Sunday Toggle */}
        <div className="flex items-center justify-between px-6 py-4.5 gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Sunday Schedule</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                blockSunday
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {blockSunday ? "🚫 Blocked / Closed" : "✓ Open for Consults"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {blockSunday 
                ? "Patients cannot select any Sunday in the booking calendar." 
                : "Open for prenatal checkups, lab triage, and routine consults."
              }
            </p>
          </div>

          <Button
            type="button"
            disabled={isSunPending}
            onClick={handleToggleSunday}
            className={`h-9 px-4 rounded-xl font-bold text-xs transition-all gap-1.5 shadow-2xs ${
              blockSunday
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            {isSunPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : blockSunday ? (
              <>
                <CalendarX2 className="w-3.5 h-3.5" />
                <span>Unblock Sunday</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Block Sunday</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
