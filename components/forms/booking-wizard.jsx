"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeroUIDatePicker } from "@/components/ui/heroui-date-picker";
import {
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Clock,
  User,
  Users,
  Heart,
  Baby,
  ShieldCheck,
  Stethoscope,
  Edit3,
  Sun,
  Sunset,
  Sparkles,
} from "lucide-react";
import {
  getClinicTodayDateString,
  getClinicDateOffset,
  isSlotExpired,
  areAllSlotsExpired,
} from "@/lib/utils";
import { useFormStatus } from "react-dom";

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 sm:px-10 flex items-center justify-center gap-2.5 h-12 w-full sm:w-auto text-sm sm:text-base font-bold shadow-xl shadow-rose-300/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Confirming Booking...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-5 h-5" />
          <span>Confirm &amp; Book Appointment</span>
        </>
      )}
    </Button>
  );
}

const DEFAULT_SERVICES = [
  { id: "prenatal", title: "Prenatal Check-up", description: "Routine health monitoring, ultrasound & nutritional guidance", icon: Heart },
  { id: "delivery", title: "Safe Normal Delivery", description: "Complete lying-in maternity and delivery care", icon: Baby },
  { id: "family", title: "Family Planning", description: "Contraceptive consultation & maternal wellness", icon: Users },
  { id: "general", title: "General Consultation", description: "Maternal checkups, health questions & prescriptions", icon: Stethoscope },
];

function BookingWizardInner({ formAction, scheduleContext = {} }) {
  const searchParams = useSearchParams();
  const serviceQueryParam = searchParams?.get("service") || "";

  const {
    timeSlots = [],
    blockedDates = [],
    loadMap = {},
    services = [],
    clinicContact = "+63 (123) 456-7890",
    blockSaturday = false,
    blockSunday = false,
    userProfile = {},
  } = scheduleContext;

  const [step, setStep] = useState(1);
  const [dpaConsentChecked, setDpaConsentChecked] = useState(false);

  const activeServices = useMemo(() => {
    if (services && services.length > 0) {
      return services.map((s, idx) => ({
        id: s.id || (s.title || s.label || `svc_${idx}`).toLowerCase().replace(/[^a-z0-9]/g, "_"),
        title: s.title || s.label || s.id || "Clinic Service",
        description: s.description || s.desc || "Routine maternal and child health service.",
        price: s.price,
        Icon: [Heart, Baby, Users, Stethoscope, Sparkles][idx % 5],
      }));
    }
    return DEFAULT_SERVICES;
  }, [services]);

  // Match initial service from URL query if provided
  const initialMatchedService = useMemo(() => {
    if (!serviceQueryParam) return "";
    const clean = serviceQueryParam.toLowerCase();
    const found = activeServices.find((s) => {
      const sId = (s.id || "").toLowerCase();
      const sTitle = (s.title || "").toLowerCase();
      return sId === clean || sTitle.includes(clean) || clean.includes(sId);
    });
    return found ? found.id : "";
  }, [serviceQueryParam, activeServices]);

  const [formData, setFormData] = useState({
    booking_for: "myself", // "myself" | "dependent"
    patient_name: "",
    relationship: "",
    service_type: initialMatchedService,
    appointment_date: "",
    time: "",           // stores slot label sent to server
    selectedSlotId: "", // tracks slot by unique ID
    notes: "",
  });

  // Keep service_type in sync if query param changes
  useEffect(() => {
    if (initialMatchedService && !formData.service_type) {
      setFormData((prev) => ({ ...prev, service_type: initialMatchedService }));
    }
  }, [initialMatchedService, formData.service_type]);

  const today = useMemo(() => getClinicTodayDateString(), []);

  // Check if current selected service qualifies for Smart Triage Auto-Approval
  const isRoutineSmartTriage = useMemo(() => {
    const s = (formData.service_type || "").toLowerCase();
    return (
      s.includes("prenatal") ||
      s.includes("routine") ||
      s.includes("consult") ||
      s.includes("general") ||
      s.includes("family")
    );
  }, [formData.service_type]);

  // Quick next 7 days chips in Philippine Standard Time with Daily Load Aggregation
  const quickDates = useMemo(() => {
    const dates = [];
    const totalDailyCapacity = timeSlots.reduce((sum, s) => sum + (s.max_capacity || 10), 0) || 30;

    for (let i = 0; i < 7; i++) {
      const isoStr = getClinicDateOffset(i);
      const d = new Date(isoStr + "T00:00:00");
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayOfWeek = d.getDay();
      const isClosed = (dayOfWeek === 6 && blockSaturday) || (dayOfWeek === 0 && blockSunday) || blockedDates.includes(isoStr);
      const allSlotsExpiredForDate = areAllSlotsExpired(timeSlots, isoStr);

      const dayBookings = loadMap[isoStr] ? Object.values(loadMap[isoStr]).reduce((a, b) => a + b, 0) : 0;
      const dayLoadPct = Math.min(100, Math.round((dayBookings / totalDailyCapacity) * 100));

      let availabilityTag = "Open";
      let tagColor = "text-emerald-600";

      if (isClosed) {
        availabilityTag = "Closed";
        tagColor = "text-slate-400";
      } else if (allSlotsExpiredForDate) {
        availabilityTag = "Concluded";
        tagColor = "text-amber-600";
      } else if (dayLoadPct >= 100) {
        availabilityTag = "Full";
        tagColor = "text-red-600";
      } else if (dayLoadPct >= 80) {
        availabilityTag = "Few Left";
        tagColor = "text-rose-600";
      } else if (dayLoadPct >= 40) {
        availabilityTag = "Moderate";
        tagColor = "text-slate-600";
      }

      dates.push({
        iso: isoStr,
        dayName,
        monthDay,
        isClosed,
        allSlotsExpiredForDate,
        dayLoadPct,
        availabilityTag,
        tagColor,
      });
    }
    return dates;
  }, [blockSaturday, blockSunday, blockedDates, timeSlots, loadMap]);

  const updateField = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "appointment_date") {
        next.time = "";
        next.selectedSlotId = "";
      }
      return next;
    });
  };

  const selectSlot = (slot) => {
    setFormData((prev) => ({
      ...prev,
      selectedSlotId: slot.id,
      time: slot.label,
    }));
  };

  // Date validation
  const selectedDate = formData.appointment_date;

  const isWeekendBlocked = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    if (day === 6 && blockSaturday) return true;
    if (day === 0 && blockSunday) return true;
    return false;
  };

  const isDateBlocked = blockedDates.includes(selectedDate);
  const isDateWeekend = isWeekendBlocked(selectedDate);
  const dateUnavailable = isDateBlocked || isDateWeekend;

  // Enhanced slot status with visual percentage and color-graded load badge
  const getSlotStatus = (slot) => {
    if (!selectedDate) {
      return {
        full: false,
        isPast: false,
        unavailable: false,
        count: 0,
        left: slot.max_capacity,
        pct: 0,
        loadBadge: {
          label: `${slot.max_capacity} spots`,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          barColor: "bg-emerald-500",
        },
      };
    }

    const count = loadMap[selectedDate]?.[slot.label] || 0;
    const left = Math.max(0, slot.max_capacity - count);
    const full = count >= slot.max_capacity;
    const isPast = isSlotExpired(slot, selectedDate);
    const unavailable = full || isPast;
    const pct = Math.min(100, Math.round((count / (slot.max_capacity || 1)) * 100));

    let loadBadge = {
      label: `${left} spot${left !== 1 ? "s" : ""} left`,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      barColor: "bg-emerald-500",
    };

    if (isPast) {
      loadBadge = {
        label: "Past Session",
        color: "text-slate-500 bg-slate-100 border-slate-200",
        barColor: "bg-slate-300",
      };
    } else if (full) {
      loadBadge = {
        label: "Fully Booked",
        color: "text-red-700 bg-red-50 border-red-200",
        barColor: "bg-red-500",
      };
    } else if (left <= 2) {
      loadBadge = {
        label: `Almost Full (${left} left)`,
        color: "text-rose-700 bg-rose-50 border-rose-200",
        barColor: "bg-rose-500",
      };
    } else if (pct >= 60) {
      loadBadge = {
        label: `Filling Fast (${left} left)`,
        color: "text-amber-700 bg-amber-50 border-amber-200",
        barColor: "bg-amber-500",
      };
    }

    return { full, isPast, unavailable, count, left, pct, loadBadge };
  };

  const allSlotsUnavailable =
    timeSlots.length > 0 && timeSlots.every((s) => getSlotStatus(s).unavailable);

  const allSlotsPast =
    timeSlots.length > 0 && timeSlots.every((s) => getSlotStatus(s).isPast);

  const allSlotsFull =
    timeSlots.length > 0 && !allSlotsPast && timeSlots.every((s) => getSlotStatus(s).full);

  // Group slots into Morning & Afternoon
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const morning = [];
    const afternoon = [];
    timeSlots.forEach((slot) => {
      const upper = slot.label.toUpperCase();
      if (upper.includes("PM") && !upper.startsWith("11")) {
        afternoon.push(slot);
      } else {
        morning.push(slot);
      }
    });
    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [timeSlots]);

  const step1Valid = () => {
    if (!formData.service_type) return false;
    if (formData.booking_for === "dependent" && !formData.patient_name.trim()) return false;
    return true;
  };

  const step2Valid = () => {
    if (!selectedDate || !formData.selectedSlotId) return false;
    if (dateUnavailable || allSlotsUnavailable) return false;
    const chosen = timeSlots.find((s) => s.id === formData.selectedSlotId);
    if (!chosen) return false;
    const status = getSlotStatus(chosen);
    if (status.unavailable) return false;
    return true;
  };

  const step3Valid = () => {
    return dpaConsentChecked;
  };

  const currentStepIsValid = () => {
    if (step === 1) return step1Valid();
    if (step === 2) return step2Valid();
    if (step === 3) return step3Valid();
    return true;
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (currentStepIsValid()) setStep((s) => Math.min(3, s + 1));
  };

  const prevStep = (e) => {
    e.preventDefault();
    setStep((s) => Math.max(1, s - 1));
  };

  const jumpToStep = (targetStep) => {
    if (targetStep < step) {
      setStep(targetStep);
    } else if (targetStep === 2 && step1Valid()) {
      setStep(2);
    } else if (targetStep === 3 && step1Valid() && step2Valid()) {
      setStep(3);
    }
  };

  const selectedServiceName = useMemo(() => {
    const found = activeServices.find((s) => s.id === formData.service_type);
    return found ? found.title : formData.service_type;
  }, [activeServices, formData.service_type]);

  const formattedDateString = useMemo(() => {
    if (!formData.appointment_date) return "";
    try {
      const d = new Date(formData.appointment_date + "T00:00:00");
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return formData.appointment_date;
    }
  }, [formData.appointment_date]);

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl shadow-2xl shadow-rose-950/15 ring-1 ring-rose-200/80 border border-rose-100 overflow-visible transition-all"
    >
      {/* ── Progress Navigation Header ── */}
      <div className="bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-rose-50/90 border-b border-rose-100/90 rounded-t-3xl px-4 py-5 sm:px-8 sm:py-6">
        {/* Progress Bar */}
        <div className="relative mb-5 max-w-md mx-auto">
          <div className="h-1.5 w-full bg-rose-200/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${step === 1 ? 33 : step === 2 ? 66 : 100}%` }}
            />
          </div>
        </div>

        {/* Clickable Step Pills */}
        <div className="flex items-center justify-between max-w-lg mx-auto gap-2">
          {[
            { n: 1, title: "Patient & Care", desc: "Select Service" },
            { n: 2, title: "Date & Time", desc: "Choose Window" },
            { n: 3, title: "Review & Confirm", desc: "Final Summary" },
          ].map(({ n, title, desc }) => {
            const isCompleted = step > n;
            const isCurrent = step === n;
            const isClickable = step > n;

            return (
              <button
                key={n}
                type="button"
                onClick={() => jumpToStep(n)}
                disabled={!isClickable}
                className={`flex items-center gap-2.5 sm:gap-3 group transition-all text-left ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Step Circle Badge */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-sm ${
                    isCompleted
                      ? "bg-rose-500 text-white shadow-rose-200 ring-2 ring-rose-300 group-hover:scale-105"
                      : isCurrent
                      ? "bg-rose-500 text-white ring-4 ring-rose-200/80 shadow-md scale-105"
                      : "bg-white text-rose-300 border border-rose-200/80"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : n}
                </div>

                <div className="hidden sm:block">
                  <p
                    className={`font-serif text-xs font-black tracking-tight leading-none ${
                      isCurrent ? "text-slate-900" : isCompleted ? "text-rose-700" : "text-rose-300"
                    }`}
                  >
                    {title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden inputs for Server Action */}
      <input type="hidden" name="service_type" value={formData.service_type} />
      <input type="hidden" name="appointment_date" value={formData.appointment_date} />
      <input type="hidden" name="time" value={formData.time} />
      {formData.booking_for === "dependent" && (
        <input type="hidden" name="patient_name" value={formData.patient_name} />
      )}

      <div className="p-6 sm:p-10 min-h-[400px]">
        {/* ══════════════════════════════════════════════════
            STEP 1: PATIENT IDENTITY & SERVICE SELECTION
           ══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Identity Selector */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="font-serif text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Who is this appointment for?
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
                  Book directly under your patient account or on behalf of a family member.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl mx-auto">
                <button
                  type="button"
                  onClick={() => updateField("booking_for", "myself")}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all text-left relative cursor-pointer ${
                    formData.booking_for === "myself"
                      ? "border-rose-400 bg-gradient-to-br from-rose-50/90 to-pink-50/50 shadow-md shadow-rose-100 ring-2 ring-rose-300/30"
                      : "border-slate-100 hover:border-rose-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      formData.booking_for === "myself"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-sm text-slate-900">For Myself</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[170px]">
                      {userProfile.fullName || "Account Holder"}
                    </p>
                  </div>
                  {formData.booking_for === "myself" && (
                    <div className="absolute top-3 right-3 text-rose-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => updateField("booking_for", "dependent")}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all text-left relative cursor-pointer ${
                    formData.booking_for === "dependent"
                      ? "border-rose-400 bg-gradient-to-br from-rose-50/90 to-pink-50/50 shadow-md shadow-rose-100 ring-2 ring-rose-300/30"
                      : "border-slate-100 hover:border-rose-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      formData.booking_for === "dependent"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-sm text-slate-900">A Family Member</p>
                    <p className="text-xs text-slate-500 mt-0.5">Wife, Daughter, Sister</p>
                  </div>
                  {formData.booking_for === "dependent" && (
                    <div className="absolute top-3 right-3 text-rose-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </div>

              {/* Dependent Fields */}
              {formData.booking_for === "dependent" && (
                <div className="max-w-xl mx-auto p-5 bg-rose-50/40 border border-rose-100 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dep_patient_name" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Patient's Full Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="dep_patient_name"
                      placeholder="e.g. Maria Clara Santos"
                      value={formData.patient_name}
                      onChange={(e) => updateField("patient_name", e.target.value)}
                      className="bg-white h-11 focus-visible:ring-rose-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dep_relationship" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Relationship to Account Holder (Optional)
                    </Label>
                    <Input
                      id="dep_relationship"
                      placeholder="e.g. Wife, Daughter, Relative"
                      value={formData.relationship}
                      onChange={(e) => updateField("relationship", e.target.value)}
                      className="bg-white h-11 focus-visible:ring-rose-500 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Service Selection */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="text-center">
                <h3 className="font-serif text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Select Clinical Service
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Choose the required maternal checkup, lying-in delivery, or consultation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeServices.map((svc) => {
                  const isSelected = formData.service_type === svc.id;
                  const SvcIcon = svc.Icon || Heart;
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => updateField("service_type", svc.id)}
                      className={`text-left p-4 sm:p-5 border-2 rounded-2xl transition-all duration-200 relative group cursor-pointer ${
                        isSelected
                          ? "border-rose-400 bg-gradient-to-br from-rose-50/90 to-pink-50/50 shadow-md shadow-rose-100 ring-2 ring-rose-300/30 scale-[1.01]"
                          : "border-slate-100 hover:border-rose-200 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "bg-rose-500 text-white shadow-sm" : "bg-rose-50 text-rose-500"
                            }`}
                          >
                            <SvcIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4
                              className={`font-serif font-bold text-sm sm:text-base leading-tight ${
                                isSelected ? "text-rose-950" : "text-slate-900"
                              }`}
                            >
                              {svc.title}
                            </h4>
                            {svc.price && (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                {svc.price}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-rose-600">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2.5 leading-relaxed pl-13">
                        {svc.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Proactive Smart Triage Eligibility Banner */}
              {isRoutineSmartTriage && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-center gap-3.5 text-emerald-950 animate-in fade-in slide-in-from-top-2 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black uppercase tracking-wider text-[9px] bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded-full">
                        Smart Triage: Instant Confirmation
                      </span>
                    </div>
                    <p className="font-bold text-emerald-950 text-xs sm:text-sm">
                      Zero Wait Time for Routine Visits
                    </p>
                    <p className="text-emerald-700 text-[11px] leading-relaxed">
                      Routine checkups and consultations are automatically approved by our clinical engine with immediate confirmation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2: DATE & TIME WINDOW PICKER
           ══════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 min-h-[440px] pb-4">
            <div className="text-center">
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Select Your Date &amp; Time Window
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
                Pick an upcoming clinic day, then tap an open time slot to reserve your turn.
              </p>
            </div>

            {/* Quick 7-Day Chips with Daily Availability Indicators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick Select (Next 7 Days)
                </span>
                <span className="text-xs text-rose-600 font-semibold">
                  Operating Days: Mon–Fri (Sat 8AM–12PM)
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {quickDates.map((item) => {
                  const isSelected = formData.appointment_date === item.iso;
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      disabled={item.isClosed}
                      onClick={() => !item.isClosed && updateField("appointment_date", item.iso)}
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                        item.isClosed
                          ? "opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed"
                          : isSelected
                          ? "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-200 scale-105"
                          : "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          isSelected ? "text-rose-100" : "text-slate-500"
                        }`}
                      >
                        {item.dayName}
                      </span>
                      <span
                        className={`font-serif text-sm font-bold mt-0.5 ${
                          isSelected ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {item.monthDay}
                      </span>
                      <span
                        className={`text-[9px] font-bold mt-0.5 ${
                          isSelected ? "text-rose-100" : item.tagColor
                        }`}
                      >
                        {item.availabilityTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HeroUI Date Picker Calendar Dropdown */}
            <div className="max-w-xs mx-auto space-y-2 pt-2 border-t border-slate-100">
              <HeroUIDatePicker
                label="Or Pick Any Calendar Date"
                minDate={today}
                value={formData.appointment_date}
                onChange={(iso) => updateField("appointment_date", iso)}
                blockedDates={blockedDates}
                blockSaturday={blockSaturday}
                blockSunday={blockSunday}
                minWidth="w-full"
              />

              {isDateBlocked && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>This clinic date is closed for appointments.</span>
                </div>
              )}
              {isDateWeekend && !isDateBlocked && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {new Date(selectedDate + "T00:00:00").getDay() === 6
                      ? "Clinic is closed on Saturdays."
                      : "Clinic is closed on Sundays."}
                  </span>
                </div>
              )}
              {allSlotsUnavailable && !dateUnavailable && selectedDate && (
                <div
                  className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-bold border ${
                    allSlotsPast
                      ? "bg-amber-50/90 border-amber-200 text-amber-900"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      allSlotsPast ? "text-amber-600" : "text-red-500"
                    }`}
                  />
                  <div>
                    <p className="font-black text-sm">
                      {allSlotsPast ? "Clinic Hours Concluded for Today" : "All Slots Fully Booked"}
                    </p>
                    <p className={`font-normal mt-0.5 ${allSlotsPast ? "text-amber-800" : "text-red-600"}`}>
                      {allSlotsPast
                        ? "All consultation sessions for today have concluded. Please select tomorrow or an upcoming clinic date below."
                        : "All time windows on this date are fully booked. Please select another date."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Time Slot Cards with Color-Graded Badges & Micro-Progress Bars */}
            {selectedDate && !dateUnavailable && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                {timeSlots.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border">
                    <p className="text-sm font-semibold text-slate-500">
                      No time slots configured. Please contact the clinic at {clinicContact}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Morning Window */}
                    {morningSlots.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                          <Sun className="w-4 h-4 text-amber-500" /> Morning Sessions
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {morningSlots.map((slot) => {
                            const { full, isPast, unavailable, count, left, pct, loadBadge } = getSlotStatus(slot);
                            const isSelected = formData.selectedSlotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={unavailable}
                                onClick={() => !unavailable && selectSlot(slot)}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${
                                  isPast
                                    ? "border-slate-100 bg-slate-50/70 text-slate-400 cursor-not-allowed opacity-50 select-none"
                                    : full
                                    ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60 select-none"
                                    : isSelected
                                    ? "border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 shadow-md shadow-rose-100 ring-2 ring-rose-300/30 scale-[1.02]"
                                    : "border-slate-100 bg-white hover:border-rose-300 hover:bg-rose-50/30 cursor-pointer"
                                }`}
                              >
                                <Clock
                                  className={`w-4 h-4 mb-1.5 ${
                                    unavailable ? "text-slate-300" : isSelected ? "text-rose-500" : "text-slate-400"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-bold ${
                                    unavailable ? "text-slate-400" : isSelected ? "text-rose-950" : "text-slate-800"
                                  }`}
                                >
                                  {slot.label}
                                </span>

                                {/* Micro-progress load indicator */}
                                <div className="w-full mt-2 space-y-1">
                                  <span
                                    className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${loadBadge.color}`}
                                  >
                                    {loadBadge.label}
                                  </span>

                                  {!unavailable && (
                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${loadBadge.barColor} rounded-full transition-all duration-300`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Afternoon Window */}
                    {afternoonSlots.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                          <Sunset className="w-4 h-4 text-orange-500" /> Afternoon Sessions
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {afternoonSlots.map((slot) => {
                            const { full, isPast, unavailable, count, left, pct, loadBadge } = getSlotStatus(slot);
                            const isSelected = formData.selectedSlotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={unavailable}
                                onClick={() => !unavailable && selectSlot(slot)}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${
                                  isPast
                                    ? "border-slate-100 bg-slate-50/70 text-slate-400 cursor-not-allowed opacity-50 select-none"
                                    : full
                                    ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60 select-none"
                                    : isSelected
                                    ? "border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 shadow-md shadow-rose-100 ring-2 ring-rose-300/30 scale-[1.02]"
                                    : "border-slate-100 bg-white hover:border-rose-300 hover:bg-rose-50/30 cursor-pointer"
                                }`}
                              >
                                <Clock
                                  className={`w-4 h-4 mb-1.5 ${
                                    unavailable ? "text-slate-300" : isSelected ? "text-rose-500" : "text-slate-400"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-bold ${
                                    unavailable ? "text-slate-400" : isSelected ? "text-rose-950" : "text-slate-800"
                                  }`}
                                >
                                  {slot.label}
                                </span>

                                {/* Micro-progress load indicator */}
                                <div className="w-full mt-2 space-y-1">
                                  <span
                                    className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${loadBadge.color}`}
                                  >
                                    {loadBadge.label}
                                  </span>

                                  {!unavailable && (
                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${loadBadge.barColor} rounded-full transition-all duration-300`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3: REVIEW & CONFIRMATION
           ══════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
            <div className="text-center">
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Review Your Appointment Details
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
                Please verify your schedule details before final booking confirmation.
              </p>
            </div>

            {/* Proactive Smart Triage Confirmation Banner */}
            {isRoutineSmartTriage && (
              <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-center gap-3.5 text-emerald-950 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-black uppercase tracking-wider text-[9px] bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded-full inline-block">
                    ✓ Instant Smart Triage Guaranteed
                  </span>
                  <p className="font-bold text-emerald-950 text-sm">
                    No Waiting for Midwife Review
                  </p>
                  <p className="text-emerald-700 text-xs leading-relaxed">
                    Because this is a low-risk routine checkup, your appointment will be approved immediately upon submission.
                  </p>
                </div>
              </div>
            )}

            {/* Receipt Card with direct Edit jump buttons */}
            <div className="bg-gradient-to-br from-rose-50/80 via-white to-pink-50/40 border-2 border-rose-100 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full blur-2xl pointer-events-none" />

              {/* Patient Row */}
              <div className="flex items-center justify-between pb-4 border-b border-rose-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Patient</span>
                  <p className="font-serif text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {formData.booking_for === "dependent"
                      ? `${formData.patient_name} ${formData.relationship ? `(${formData.relationship})` : ""}`
                      : `${userProfile.fullName || "Account Holder"} (Myself)`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => jumpToStep(1)}
                  className="text-rose-600 hover:bg-rose-100/80 rounded-xl text-xs font-bold gap-1 h-8 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>

              {/* Service Row */}
              <div className="flex items-center justify-between pb-4 border-b border-rose-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Service</span>
                  <p className="font-serif text-base sm:text-lg font-black text-rose-700 mt-0.5 capitalize">
                    {selectedServiceName}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => jumpToStep(1)}
                  className="text-rose-600 hover:bg-rose-100/80 rounded-xl text-xs font-bold gap-1 h-8 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>

              {/* Date & Time Row */}
              <div className="flex items-center justify-between pb-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Date &amp; Time Window</span>
                  <p className="font-serif text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {formattedDateString}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100/80 px-3 py-1 rounded-full mt-1.5 shadow-sm">
                    <Clock className="w-3.5 h-3.5" /> {formData.time}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => jumpToStep(2)}
                  className="text-rose-600 hover:bg-rose-100/80 rounded-xl text-xs font-bold gap-1 h-8 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>
            </div>

            {/* Additional Medical Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Medical Notes / Symptoms / Special Requests (Optional)
              </Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
                className="flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 text-slate-800"
                placeholder="Mention any symptoms, pain, LMP, allergies, or questions for the midwife..."
              />
            </div>

            {/* Statutory RA 10173 (DPA 2012) Explicit Consent Checkbox */}
            <label className="flex items-start gap-3.5 p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl cursor-pointer hover:bg-slate-100/70 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={dpaConsentChecked}
                onChange={(e) => setDpaConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                required
              />
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">
                  Philippine Data Privacy Act of 2012 (RA 10173) Consent <span className="text-rose-500">*</span>
                </span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  I consent to the collection and processing of my appointment information and medical notes by AR-JEN Maternity Clinic strictly for clinical scheduling, maternal triage records, and appointment reminders.
                </p>
              </div>
            </label>

            {/* Reassurance Notice */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold">PhilHealth Accredited Maternity Clinic</p>
                <p className="text-emerald-700 mt-0.5">
                  No online payment needed now. Our medical staff will verify your appointment and confirm your slot promptly.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Footer ── */}
      <div className="px-6 sm:px-10 py-5 bg-slate-50/80 border-t border-slate-100 rounded-b-3xl flex items-center justify-between gap-4">
        {step > 1 ? (
          <Button
            type="button"
            onClick={prevStep}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-white rounded-full h-11 px-6 font-bold text-xs sm:text-sm gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Previous Step
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!currentStepIsValid()}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 h-11 text-xs sm:text-sm shadow-md shadow-rose-200 group font-bold gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Proceed to Step {step + 1}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        ) : (
          <SubmitButton disabled={!dpaConsentChecked} />
        )}
      </div>
    </form>
  );
}

export function BookingWizard(props) {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-3xl p-12 text-center border border-rose-100 shadow-xl">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-bold text-sm">Loading Appointment Wizard...</p>
      </div>
    }>
      <BookingWizardInner {...props} />
    </Suspense>
  );
}
