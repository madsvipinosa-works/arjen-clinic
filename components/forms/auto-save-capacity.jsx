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
        title="Click away to auto-save"
        onBlur={() => formRef.current?.requestSubmit()}
        className="w-16 h-8 text-sm text-center rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-colors"
      />
    </form>
  );
}
