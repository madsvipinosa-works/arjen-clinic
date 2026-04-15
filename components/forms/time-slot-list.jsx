"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";

export function TimeSlotList({ timeSlots, deleteTimeSlot, updateTimeSlot }) {
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [validationError, setValidationError] = useState("");

  const openEdit = (slot) => {
    setEditingId(slot.id);
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
    return null;
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

        return (
          <div key={slot.id} className="group">
            {/* ── Row view ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3.5 gap-4 hover:bg-gray-50/60">
              {/* Slot label */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                <span className="font-semibold text-gray-800 text-sm truncate">
                  {slot.label}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  · max {slot.max_capacity}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Edit toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => (isEditing ? closeEdit() : openEdit(slot))}
                  className={`h-8 w-8 p-0 rounded-lg transition-all ${
                    isEditing
                      ? "text-rose-500 bg-rose-50"
                      : "text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                  }`}
                  title={isEditing ? "Cancel edit" : "Edit slot"}
                >
                  {isEditing ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Pencil className="w-4 h-4" />
                  )}
                </Button>

                {/* Delete */}
                <form action={deleteTimeSlot}>
                  <input type="hidden" name="id" value={slot.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Delete slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>

            {/* ── Inline edit panel ────────────────────────────────── */}
            {isEditing && (
              <form
                action={async (formData) => {
                  const err = validate();
                  if (err) { setValidationError(err); return; }
                  await updateTimeSlot(formData);
                  closeEdit();
                }}
                className="px-5 pb-5 pt-2 bg-rose-50/40 border-t border-rose-100 space-y-3 animate-in slide-in-from-top-2 duration-200"
              >
                <input type="hidden" name="id" value={slot.id} />

                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Edit Time Slot
                </p>

                {/* Validation error */}
                {validationError && (
                  <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {validationError}
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
                      className="focus-visible:ring-rose-500 h-9 text-sm"
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
                      className="focus-visible:ring-rose-500 h-9 text-sm"
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
                      value={editValues.max_capacity}
                      onChange={(e) =>
                        handleChange("max_capacity", parseInt(e.target.value, 10))
                      }
                      required
                      className="focus-visible:ring-rose-500 h-9 text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-9 px-4 gap-2 shadow-sm text-sm"
                  >
                    <Check className="w-4 h-4" /> Save
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
