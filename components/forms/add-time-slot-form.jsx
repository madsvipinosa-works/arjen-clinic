"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, AlertTriangle, Loader2 } from "lucide-react";

export function AddTimeSlotForm({ existingSlots = [], addTimeSlot }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!startTime || !endTime) {
      setError("Please specify both start and end times.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    const cap = parseInt(maxCapacity, 10);
    if (isNaN(cap) || cap < 1 || cap > 100) {
      setError("Maximum patients capacity must be between 1 and 100.");
      return;
    }

    // Overlap detection
    const overlapping = existingSlots?.find(
      (s) =>
        s.start_time &&
        s.end_time &&
        startTime < s.end_time.slice(0, 5) &&
        endTime > s.start_time.slice(0, 5)
    );

    if (overlapping) {
      setError(`Selected time overlaps with existing slot: "${overlapping.label}". Please choose another window.`);
      return;
    }

    const fd = new FormData();
    fd.append("start_time", startTime);
    fd.append("end_time", endTime);
    fd.append("max_capacity", String(cap));

    startTransition(async () => {
      await addTimeSlot(fd);
      setStartTime("");
      setEndTime("");
      setMaxCapacity(10);
      setError("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
      {error && (
        <div className="flex items-start gap-2 text-rose-700 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-2xs animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Start Time</Label>
          <Input
            type="time"
            name="start_time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setError("");
            }}
            required
            className="focus-visible:ring-rose-500 h-10 bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">End Time</Label>
          <Input
            type="time"
            name="end_time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setError("");
            }}
            required
            className="focus-visible:ring-rose-500 h-10 bg-white"
          />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Max Patients / Shift</Label>
          <Input
            name="max_capacity"
            type="number"
            value={maxCapacity}
            min={1}
            max={100}
            maxLength={3}
            onChange={(e) => {
              const val = e.target.value ? Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)) : "";
              setMaxCapacity(val);
              setError("");
            }}
            className="focus-visible:ring-rose-500 h-10 bg-white"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isPending || !startTime || !endTime}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 px-5 gap-2 shadow-sm font-bold text-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add Slot
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
