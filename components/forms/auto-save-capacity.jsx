"use client";

import { useRef } from "react";
import { updateTimeSlotCapacity } from "@/app/actions";

// Tiny client component that auto-saves slot capacity on blur
// so the admin never needs to click a Save button.
export function AutoSaveCapacity({ slotId, defaultValue }) {
  const formRef = useRef(null);

  return (
    <form ref={formRef} action={updateTimeSlotCapacity}>
      <input type="hidden" name="id" value={slotId} />
      <input
        type="number"
        name="max_capacity"
        defaultValue={defaultValue}
        min={1}
        max={100}
        onInput={(e) => {
          if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
          const num = parseInt(e.target.value, 10);
          if (num > 100) e.target.value = "100";
        }}
        title="Click away to auto-save (max 100)"
        onBlur={() => formRef.current?.requestSubmit()}
        className="w-16 h-8 text-sm text-center rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-colors"
      />
    </form>
  );
}
