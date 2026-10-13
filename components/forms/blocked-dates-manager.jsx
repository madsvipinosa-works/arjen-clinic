"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CalendarX2, AlertCircle, Loader2, Sparkles } from "lucide-react";

const CLOSURE_PRESETS = [
  "National Holiday",
  "Midwife Staff Training",
  "Facility Sanitation",
  "Doctor Conference",
  "Typhoon / Weather Advisory"
];

export function BlockedDatesManager({
  blockedDates = [],
  addBlockedDate,
  removeBlockedDate,
  todayDate = ""
}) {
  const [dateValue, setDateValue] = useState("");
  const [reasonValue, setReasonValue] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [isAdding, startAddTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleAdd = (e) => {
    e.preventDefault();
    if (!dateValue || !reasonValue.trim()) return;

    const fd = new FormData();
    fd.append("blocked_date", dateValue);
    fd.append("reason", reasonValue.trim());

    startAddTransition(async () => {
      await addBlockedDate(fd);
      setDateValue("");
      setReasonValue("");
    });
  };

  const handleDeleteConfirm = (id) => {
    const fd = new FormData();
    fd.append("id", id);
    startDeleteTransition(async () => {
      await removeBlockedDate(fd);
      setDeletingId(null);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/40">
        <h2 className="font-bold text-gray-900 text-lg">Blocked Dates & Holidays</h2>
        <p className="text-xs text-gray-500 mt-0.5">Lock specific clinic dates for official holidays or midwife training.</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Quick Holiday / Closure Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Reason Presets:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CLOSURE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReasonValue(preset)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  reasonValue === preset
                    ? "bg-slate-800 text-white border-slate-800 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Add Block Form */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="date"
            name="blocked_date"
            min={todayDate}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="flex-1 focus-visible:ring-slate-500 h-10 bg-white"
            required
          />
          <Input
            type="text"
            name="reason"
            value={reasonValue}
            onChange={(e) => setReasonValue(e.target.value)}
            placeholder="Closure reason (e.g. Christmas Holiday)"
            className="flex-1 focus-visible:ring-slate-500 h-10 bg-white"
            required
          />
          <Button
            type="submit"
            disabled={isAdding || !dateValue || !reasonValue.trim()}
            className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-10 px-4 gap-1.5 whitespace-nowrap font-bold text-xs"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Block Date</span>
          </Button>
        </form>

        {/* Blocked Dates List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {blockedDates?.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">
              No dates currently blocked. The clinic is open for all standard booking days.
            </p>
          ) : (
            blockedDates?.map((b) => {
              const isDeletingThis = deletingId === b.id;
              // Format date in Manila timezone with weekday
              let formattedDate = b.blocked_date;
              try {
                const [y, m, d] = b.blocked_date.split("-").map(Number);
                const dt = new Date(Date.UTC(y, m - 1, d, 4, 0, 0));
                formattedDate = dt.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
              } catch (_) {}

              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
                      {formattedDate}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg truncate">
                      {b.reason}
                    </span>
                  </div>

                  {isDeletingThis ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl shadow-2xs animate-in fade-in duration-150 shrink-0">
                      <span className="text-[11px] font-bold text-rose-800">Unblock?</span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDeleteConfirm(b.id)}
                        className="h-6 px-2 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs gap-1"
                      >
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isDeleting}
                        onClick={() => setDeletingId(null)}
                        className="h-6 px-1.5 text-[10px] font-medium text-slate-500 hover:text-slate-800 rounded-lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(b.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Remove blocked date"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
