"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 flex items-center gap-2 h-12 w-full md:w-auto text-base transition-all"
    >
      {pending && <Loader2 className="w-5 h-5 animate-spin" />}
      {pending ? "Securely Submitting..." : "Confirm & Send Request"}
    </Button>
  );
}

export function BookingWizard({ formAction, scheduleContext = {} }) {
  const {
    timeSlots = [],
    blockedDates = [],
    loadMap = {},
    blockSaturday = false,
    blockSunday = false,
  } = scheduleContext;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    service_type: "",
    appointment_date: "",
    time: "",           // stores the time slot LABEL (sent to server)
    selectedSlotId: "", // tracks the selected slot by unique ID
    notes: "",
  });

  const today = new Date().toISOString().split("T")[0];

  const updateField = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Reset time selection if date changes
      if (field === "appointment_date") {
        next.time = "";
        next.selectedSlotId = "";
      }
      return next;
    });
  };

  // Select a time slot by its unique ID and store the label for the server
  const selectSlot = (slot) => {
    setFormData((prev) => ({
      ...prev,
      selectedSlotId: slot.id,
      time: slot.label,
    }));
  };

  // ── Date validation helpers ──────────────────────────────────
  const selectedDate = formData.appointment_date;

  const isWeekendBlocked = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    if (day === 6 && blockSaturday) return true; // Saturday
    if (day === 0 && blockSunday)   return true; // Sunday
    return false;
  };

  const isDateBlocked = blockedDates.includes(selectedDate);
  const isDateWeekend = isWeekendBlocked(selectedDate);
  const dateUnavailable = isDateBlocked || isDateWeekend;

  // Compute full/available status per slot for selected date
  const getSlotStatus = (slot) => {
    if (!selectedDate) return { full: false, count: 0 };
    const count = loadMap[selectedDate]?.[slot.label] || 0;
    return { full: count >= slot.max_capacity, count };
  };

  const allSlotsFull =
    timeSlots.length > 0 && timeSlots.every((s) => getSlotStatus(s).full);

  const step2Valid = () => {
    if (!selectedDate || !formData.selectedSlotId) return false;
    if (dateUnavailable || allSlotsFull) return false;
    // The chosen slot must not be full
    const chosen = timeSlots.find((s) => s.id === formData.selectedSlotId);
    if (chosen && getSlotStatus(chosen).full) return false;
    return true;
  };

  const currentStepIsValid = () => {
    if (step === 1) return formData.service_type !== "";
    if (step === 2) return step2Valid();
    return true;
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (currentStepIsValid()) setStep(step + 1);
  };

  const prevStep = (e) => {
    e.preventDefault();
    setStep(step - 1);
  };

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-rose-100"
    >
      {/* ── Step Tracker ─────────────────────────────── */}
      <div className="bg-rose-50 border-b border-rose-100 flex p-5 text-sm font-semibold justify-center gap-6 md:gap-12">
        {[
          { icon: ClipboardList, label: "Service Info", n: 1 },
          { icon: CalendarDays,  label: "Schedule",     n: 2 },
          { icon: CheckCircle2,  label: "Finalize",     n: 3 },
        ].map(({ icon: Icon, label, n }) => (
          <div
            key={n}
            className={`flex items-center gap-2 transition-colors ${
              step >= n ? "text-rose-700" : "text-rose-300"
            }`}
          >
            <Icon className={`w-5 h-5 ${step >= n ? "text-rose-500" : ""}`} />
            <span className="hidden md:inline">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Always-present hidden fields ──────────────────────── */}
      <input type="hidden" name="service_type" value={formData.service_type} />
      <input type="hidden" name="appointment_date" value={formData.appointment_date} />
      <input type="hidden" name="time" value={formData.time} />

      <div className="p-8 md:p-12 min-h-[380px]">
        {/* ── STEP 1: SERVICE ──────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">What do you need help with?</h2>
              <p className="text-gray-500 mt-2">Select the medical service or consultation you require.</p>
            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { value: "prenatal", label: "Prenatal Check-up",   desc: "Routine monitoring for you and your baby" },
                { value: "delivery", label: "Safe Delivery",        desc: "Request lying-in delivery space" },
                { value: "family",   label: "Family Planning",      desc: "Contraception and family counseling" },
                { value: "general",  label: "General Consult",      desc: "Standard checkups and prescriptions" },
              ].map((svc) => (
                <button
                  key={svc.value}
                  type="button"
                  onClick={() => updateField("service_type", svc.value)}
                  className={`text-left p-5 border-2 rounded-2xl transition-all duration-200 ${
                    formData.service_type === svc.value
                      ? "border-rose-500 bg-rose-50/50 shadow-md shadow-rose-100"
                      : "border-gray-100 hover:border-rose-200 hover:bg-gray-50"
                  }`}
                >
                  <h3 className={`font-bold ${formData.service_type === svc.value ? "text-rose-700" : "text-gray-800"}`}>
                    {svc.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{svc.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: DATE + TIME SLOTS ───────────────── */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Choose a Schedule</h2>
              <p className="text-gray-500 mt-2">Pick a date, then select an available time window.</p>
            </div>

            {/* Date Picker */}
            <div className="max-w-xs mx-auto space-y-2">
              <Label htmlFor="date_picker" className="text-gray-700 font-semibold">Preferred Date</Label>

              <Input
                type="date"
                id="date_picker"
                min={today}
                value={formData.appointment_date}
                onChange={(e) => updateField("appointment_date", e.target.value)}
                className="h-12 border-gray-200 rounded-xl focus-visible:ring-rose-500 text-lg font-medium cursor-pointer"
              />

              {isDateBlocked && (
                <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4" /> This date is closed / unavailable.
                </div>
              )}
              {isDateWeekend && !isDateBlocked && (
                <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4" />
                  {new Date(selectedDate + "T00:00:00").getDay() === 6
                    ? "The clinic is closed on Saturdays."
                    : "The clinic is closed on Sundays."}
                </div>
              )}
              {allSlotsFull && !dateUnavailable && selectedDate && (
                <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4" /> This date is fully booked.
                </div>
              )}
            </div>

            {/* Time Slot Cards */}
            {selectedDate && !dateUnavailable && (
              <div>


                {timeSlots.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">
                    No time slots configured yet. Contact the clinic.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">
                      Available Time Windows
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {timeSlots.map((slot) => {
                        const { full, count } = getSlotStatus(slot);
                        const isSelected = formData.selectedSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={full}
                            onClick={() => !full && selectSlot(slot)}
                            className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                              full
                                ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
                                : isSelected
                                ? "border-rose-500 bg-rose-50 shadow-md shadow-rose-100"
                                : "border-gray-100 hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer"
                            }`}
                          >
                            <Clock
                              className={`w-5 h-5 mb-1.5 ${
                                full ? "text-gray-300" : isSelected ? "text-rose-500" : "text-gray-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-bold leading-tight ${
                                full ? "text-gray-400" : isSelected ? "text-rose-700" : "text-gray-700"
                              }`}
                            >
                              {slot.label}
                            </span>
                            {full && (
                              <span className="mt-1.5 text-[10px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
                                FULL
                              </span>
                            )}
                            {!full && (
                              <span className="mt-1.5 text-[10px] text-gray-400">
                                {slot.max_capacity - count} slot{slot.max_capacity - count !== 1 ? "s" : ""} left
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: REVIEW + NOTES ───────────────────── */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-300 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Final Details</h2>
              <p className="text-gray-500 mt-2">Review your selection and leave a note for the doctor.</p>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-rose-100 pb-3">
                <span className="text-gray-500">Service</span>
                <span className="font-bold text-gray-900 capitalize">
                  {formData.service_type.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-rose-100 pb-3">
                <span className="text-gray-500">Date</span>
                <span className="font-bold text-gray-900">{formData.appointment_date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Time</span>
                <span className="font-bold text-rose-700">{formData.time}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-gray-700 font-semibold">
                Additional Medical Notes (Optional)
              </Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="flex min-h-[120px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-all font-medium text-gray-800"
                placeholder="Briefly describe any symptoms, pains, or concerns..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Footer ─────────────────────────── */}
      <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        {step > 1 ? (
          <Button
            type="button"
            onClick={prevStep}
            variant="ghost"
            className="text-gray-500 hover:text-gray-800 rounded-full h-12 px-6 font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!currentStepIsValid()}
            className="bg-gray-900 hover:bg-black text-white rounded-full px-8 h-12 text-base shadow-md group disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Next Step{" "}
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  );
}
