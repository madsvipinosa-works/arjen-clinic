"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { AutoSaveCapacity } from "@/components/forms/auto-save-capacity";

export function TimeSlotList({ timeSlots, deleteTimeSlot, updateTimeSlot }) {
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [validationError, setValidationError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();

  const openEdit = (slot) => {
    setEditingId(slot.id);
    setDeletingId(null);
    setValidationError("");
    // Convert stored "HH:MM:SS" or "HH:MM" to "HH:MM" for <input type="time">
    const toInputTime = (t) => (t ? t.slice(0, 5) : "");
    setEditValues({
      start_time: toInputTime(slot.start_time),
      end_time: toInputTime(slot.end_time),
      max_capacity: slot.max_capacity,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setValidationError("");
  };

  const handleChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
    setValidationError("");
  };

  // Client-side pre-validation before submitting
  const validate = () => {
    const { start_time, end_time, max_capacity } = editValues;
    if (!start_time || !end_time) return "Start and end times are required.";
    if (end_time <= start_time) return "End time must be after start time.";
    if (!max_capacity || max_capacity < 1) return "Capacity must be at least 1.";

    // Check overlap with other active slots
    const hasOverlap = timeSlots?.some(
      (s) =>
        s.id !== editingId &&
        s.start_time &&
        s.end_time &&
        start_time < s.end_time.slice(0, 5) &&
        end_time > s.start_time.slice(0, 5)
    );
    if (hasOverlap) {
      return "This slot overlaps with another configured time slot.";
    }

    return null;
  };

  const handleDeleteConfirm = (id) => {
    const fd = new FormData();
    fd.append("id", id);
    startDeleteTransition(async () => {
      await deleteTimeSlot(fd);
      setDeletingId(null);
    });
  };

  if (timeSlots.length === 0) {
    return (
      <p className="text-center text-gray-400 py-10 text-sm italic">
        No time slots defined yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {timeSlots.map((slot) => {
        const isEditing = editingId === slot.id;
        const isDeletingThis = deletingId === slot.id;

        return (
          <div key={slot.id} className="group">
            {/* ── Row view ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3.5 gap-4 hover:bg-gray-50/70 transition-colors">
              {/* Slot label */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                <span className="font-bold text-gray-800 text-sm truncate">
                  {slot.label}
                </span>

                {/* Inline Quick Capacity Adjuster */}
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <span className="text-xs text-gray-400">·</span>
                  <AutoSaveCapacity slotId={slot.id} defaultValue={slot.max_capacity} />
                </div>
              </div>

              {/* Action buttons & Safe Deletion Confirmation */}
              <div className="flex items-center gap-2 shrink-0">
                {isDeletingThis ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl shadow-2xs animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-rose-800">Delete slot?</span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => handleDeleteConfirm(slot.id)}
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
                  <>
                    {/* Edit toggle */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => (isEditing ? closeEdit() : openEdit(slot))}
                      className={`h-8 w-8 p-0 rounded-lg transition-all ${
                        isEditing
                          ? "text-rose-600 bg-rose-50"
                          : "text-gray-400 hover:text-rose-600 hover:bg-rose-50 opacity-80 group-hover:opacity-100"
                      }`}
                      title={isEditing ? "Cancel edit" : "Edit slot time & capacity"}
                    >
                      {isEditing ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5" />
                      )}
                    </Button>

                    {/* Safe Delete Trigger */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(slot.id)}
                      className="text-gray-300 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ── Inline edit panel ────────────────────────────────── */}
            {isEditing && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const err = validate();
                  if (err) {
                    setValidationError(err);
                    return;
                  }
                  const fd = new FormData(e.currentTarget);
                  startUpdateTransition(async () => {
                    await updateTimeSlot(fd);
                    closeEdit();
                  });
                }}
                className="px-5 pb-5 pt-3 bg-rose-50/40 border-t border-rose-100 space-y-3 animate-in slide-in-from-top-2 duration-200"
              >
                <input type="hidden" name="id" value={slot.id} />

                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Edit Booking Window & Limit
                </p>

                {/* Validation error */}
                {validationError && (
                  <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2 shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      Start Time
                    </Label>
                    <Input
                      type="time"
                      name="start_time"
                      value={editValues.start_time}
                      onChange={(e) => handleChange("start_time", e.target.value)}
                      required
                      className="focus-visible:ring-rose-500 h-9 text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      End Time
                    </Label>
                    <Input
                      type="time"
                      name="end_time"
                      value={editValues.end_time}
                      onChange={(e) => handleChange("end_time", e.target.value)}
                      required
                      className="focus-visible:ring-rose-500 h-9 text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      Max Patients
                    </Label>
                    <Input
                      name="max_capacity"
                      type="number"
                      min={1}
                      max={100}
                      maxLength={3}
                      value={editValues.max_capacity}
                      onChange={(e) => {
                        const val = e.target.value
                          ? Math.min(100, Math.max(1, parseInt(e.target.value.slice(0, 3), 10) || 1))
                          : "";
                        handleChange("max_capacity", val);
                      }}
                      required
                      className="focus-visible:ring-rose-500 h-9 text-sm bg-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 px-4 gap-2 shadow-sm text-sm font-bold"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
