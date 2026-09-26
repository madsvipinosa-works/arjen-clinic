"use client";

import { useState, useTransition, useEffect } from "react";
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  HeartPulse,
  User,
  Stethoscope,
  X,
  Sparkles,
  ChevronDown,
  ShieldAlert,
  Loader2,
  Ticket
} from "lucide-react";
import { createWalkInAppointment, searchPatientsForReception } from "@/app/actions";

const SERVICES = [
  { id: "prenatal", label: "Prenatal Check-up", desc: "Routine maternal care & vitals" },
  { id: "general", label: "General Consult", desc: "Primary health & wellness" },
  { id: "family", label: "Family Planning", desc: "Counseling & contraceptives" },
  { id: "delivery", label: "Safe Delivery", desc: "Labor, delivery & admission" },
];

export function QuickWalkInModal({ isOpen, onClose, staffUsers = [], onAppointmentCreated }) {
  const [mode, setMode] = useState("existing"); // 'existing' | 'new'
  const [isPending, startTransition] = useTransition();

  // Existing patient search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // New patient state
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [age, setAge] = useState("");
  const [allergies, setAllergies] = useState("");
  const [isHighRisk, setIsHighRisk] = useState(false);

  // Common appointment fields
  const [serviceType, setServiceType] = useState("prenatal");
  const [timePref, setTimePref] = useState(
    new Date().getHours() < 12 ? "Morning (AM)" : "Afternoon (PM)"
  );
  const [attendingStaffId, setAttendingStaffId] = useState("");
  const [notes, setNotes] = useState("");

  // Optional quick intake vitals
  const [showVitals, setShowVitals] = useState(false);
  const [bp, setBp] = useState("");
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Debounced patient search
  useEffect(() => {
    if (mode !== "existing" || !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPatientsForReception(searchQuery);
        setSearchResults(results || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedPatient(null);
    setSearchQuery("");
    setSearchResults([]);
    setFullName("");
    setContactNumber("");
    setAge("");
    setAllergies("");
    setIsHighRisk(false);
    setNotes("");
    setBp("");
    setWeight("");
    setTemperature("");
    setErrorMsg("");
    setSuccessData(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (mode === "existing" && !selectedPatient) {
      setErrorMsg("Please search and select an existing patient.");
      return;
    }
    if (mode === "new" && !fullName.trim()) {
      setErrorMsg("Patient full name is required.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("patient_mode", mode);
      if (mode === "existing") {
        fd.append("patient_id", selectedPatient.id);
      } else {
        fd.append("full_name", fullName.trim());
        if (contactNumber) fd.append("contact_number", contactNumber.trim());
        if (age) fd.append("age", age);
        if (allergies) fd.append("allergies", allergies.trim());
        if (isHighRisk) fd.append("is_high_risk", "true");
      }

      fd.append("service_type", serviceType);
      fd.append("time_preference", timePref);
      if (attendingStaffId) fd.append("attending_staff_id", attendingStaffId);
      if (notes) fd.append("notes", notes.trim());

      // Quick vitals if populated
      if (bp) fd.append("blood_pressure", bp.trim());
      if (weight) fd.append("weight", weight.trim());
      if (temperature) fd.append("temperature", temperature.trim());

      const res = await createWalkInAppointment(fd);
      if (!res?.success) {
        setErrorMsg(res?.error || "Failed to create walk-in appointment.");
      } else {
        setSuccessData({
          ticketNumber: res.ticketNumber,
          patientName: mode === "existing" ? selectedPatient.full_name : fullName.trim(),
          serviceLabel: SERVICES.find((s) => s.id === serviceType)?.label || serviceType,
        });
        if (onAppointmentCreated) {
          onAppointmentCreated(res);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="relative p-6 pb-4 border-b border-border bg-gradient-to-r from-rose-500/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-foreground tracking-tight">Quick Walk-In Intake</h2>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Live Queue
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Sub-30s registration. Auto-assigns queue ticket and places patient into triage.
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          {!successData && (
            <div className="flex items-center gap-2 mt-4 bg-muted/60 p-1 rounded-2xl border border-border/70">
              <button
                type="button"
                onClick={() => { setMode("existing"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "existing"
                    ? "bg-card text-foreground shadow-sm font-black text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Existing Patient Search</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode("new"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "new"
                    ? "bg-card text-foreground shadow-sm font-black text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Patient Intake</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Success Screen */}
          {successData ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Queue Ticket Assigned
                </span>
                <div className="text-4xl font-black text-primary tracking-tight font-mono">
                  {successData.ticketNumber}
                </div>
                <h3 className="text-lg font-bold text-foreground mt-2">
                  {successData.patientName}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {successData.serviceLabel} • Checked into <span className="font-bold text-foreground">Waiting Room</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground max-w-md mx-auto text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-medium">Public TV Display:</span>
                  <span className="font-bold text-emerald-600">Updated in real-time</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Live Kanban:</span>
                  <span className="font-bold text-emerald-600">Placed in Waiting lane</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-2xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-all"
                >
                  Book Another Walk-In
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition-all"
                >
                  Done & View Board
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ── Mode 1: Search Existing Patient ── */}
              {mode === "existing" && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Find Patient Record</span>
                    {selectedPatient && (
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="text-[11px] text-rose-500 font-bold hover:underline"
                      >
                        Change selection
                      </button>
                    )}
                  </label>

                  {selectedPatient ? (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-sm flex items-center justify-center">
                          {selectedPatient.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground text-sm">
                              {selectedPatient.full_name}
                            </h4>
                            {selectedPatient.is_high_risk && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/20">
                                High Risk
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            {selectedPatient.contact_number || "No contact"} {selectedPatient.age ? `• ${selectedPatient.age} yrs` : ""}
                            {selectedPatient.allergies ? ` • Allergies: ${selectedPatient.allergies}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Selected
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Type patient full name or phone number..."
                          className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          autoFocus
                        />
                        {isSearching && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        )}
                      </div>

                      {/* Dropdown Results */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-border">
                          {searchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(p);
                                setSearchResults([]);
                                setSearchQuery("");
                              }}
                              className="w-full p-3 text-left hover:bg-muted/70 transition-colors flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-xs">{p.full_name}</span>
                                  {p.is_high_risk && (
                                    <span className="text-[9px] font-black uppercase px-1 rounded bg-destructive/15 text-destructive">
                                      High Risk
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {p.contact_number || "No contact"} {p.age ? `• ${p.age} y/o` : ""}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-primary">Select →</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchQuery.trim().length > 1 && !isSearching && searchResults.length === 0 && (
                        <div className="p-3 mt-1 bg-muted/40 border border-border rounded-2xl text-center text-xs text-muted-foreground">
                          No matching records found.{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setFullName(searchQuery.trim());
                              setMode("new");
                            }}
                            className="font-bold text-primary hover:underline ml-1"
                          >
                            + Register as new patient
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Mode 2: Inline New Patient Intake ── */}
              {mode === "new" && (
                <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Patient Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Maria Clara Santos"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Contact / Mobile #
                      </label>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="e.g. 0917 123 4567"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Age (Years)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 26"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Known Allergies (if any)
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="e.g. Penicillin, Aspirin, None"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* High Risk Toggle */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isHighRisk}
                      onChange={(e) => setIsHighRisk(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                      Mark as High-Risk Patient (hypertension, multiple gestation, gestational diabetes)
                    </span>
                  </label>
                </div>
              )}

              {/* ── Service Type Selection ── */}
              <div className="space-y-2">
                <label className="text-xs font-black text-foreground uppercase tracking-wider">
                  Service Requested
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SERVICES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceType(s.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        serviceType === s.id
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40 font-bold"
                          : "border-border bg-card hover:bg-muted/60"
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Shift & Staff Assignment ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Shift Preference
                  </label>
                  <select
                    value={timePref}
                    onChange={(e) => setTimePref(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                  >
                    <option value="Morning (AM)">🌅 Morning Shift (AM)</option>
                    <option value="Afternoon (PM)">🌇 Afternoon Shift (PM)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-primary" /> Attending Staff (Optional)
                  </label>
                  <select
                    value={attendingStaffId}
                    onChange={(e) => setAttendingStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                  >
                    <option value="">Any Available Midwife / Doctor</option>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email ? u.email.split("@")[0] : `Staff ${u.id.slice(0, 5)}`} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Optional Quick Vitals Accordion ── */}
              <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowVitals(!showVitals)}
                  className="w-full p-3 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-xs font-bold text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-primary" />
                    <span>Quick Intake Vitals (Optional)</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {showVitals ? "Auto-moves to Vital Signs lane" : "Click to log BP, Weight, Temp right now"}
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showVitals ? "rotate-180" : ""}`} />
                </button>

                {showVitals && (
                  <div className="p-4 grid grid-cols-3 gap-3 border-t border-border bg-card animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground uppercase">BP (mmHg)</label>
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        placeholder="e.g. 120/80"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground uppercase">Weight (kg)</label>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 58.5"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground uppercase">Temp (°C)</label>
                      <input
                        type="text"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="e.g. 36.6"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes / Reason for Walk-in */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Intake Notes / Chief Complaint
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Walk-in for routine prenatal check, experiencing mild lower back pain"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Issue Ticket & Drop into Queue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
