"use client";

import React, { useState, useTransition, useRef } from "react";
import { updateTimeSlotCapacity } from "@/app/actions";
import { Check, Loader2 } from "lucide-react";

/**
 * AutoSaveCapacity
 * Client component that allows inline editing of slot capacity
 * with instant blur-to-save and a micro-animated "✓ Saved" feedback badge.
 */
export function AutoSaveCapacity({ slotId, defaultValue }) {
  const [capacity, setCapacity] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const [showSaved, setShowSaved] = useState(false);
  const timeoutRef = useRef(null);

  const handleBlur = () => {
    const parsed = Math.min(100, Math.max(1, parseInt(capacity, 10) || 1));
    setCapacity(parsed);
    if (parsed === defaultValue && !showSaved) return;

    const fd = new FormData();
    fd.append("id", slotId);
    fd.append("max_capacity", String(parsed));

    startTransition(async () => {
      await updateTimeSlotCapacity(fd);
      setShowSaved(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowSaved(false);
      }, 2000);
    });
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <input
        type="number"
        value={capacity}
        min={1}
        max={100}
        onChange={(e) => {
          let val = e.target.value;
          if (val.length > 3) val = val.slice(0, 3);
          setCapacity(val);
        }}
        onBlur={handleBlur}
        title="Click away to auto-save capacity (max 100)"
        className="w-14 h-8 text-xs font-bold text-center rounded-lg border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all shadow-2xs text-slate-800"
      />
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin shrink-0" />
      ) : showSaved ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md animate-in fade-in duration-200 shrink-0">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>Saved</span>
        </span>
      ) : (
        <span className="text-[10px] text-gray-400 font-medium">max</span>
      )}
    </div>
  );
}
