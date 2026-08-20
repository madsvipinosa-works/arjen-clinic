"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import {
  Search,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  ListFilter,
  Users,
  Check,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  LayoutList,
  Columns3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { createClient } from "@/utils/supabase/client";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS = {
  Pending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",    icon: Clock,         dot: "bg-amber-400" },
  Approved:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-400" },
  Completed: { badge: "bg-blue-50 text-blue-700 border-blue-200",       icon: CheckCircle2,  dot: "bg-blue-400" },
  Rejected:  { badge: "bg-red-50 text-red-700 border-red-200",          icon: XCircle,       dot: "bg-red-400" },
};

const TABS = ["All", "Pending", "Approved", "Completed", "Rejected"];

const SERVICE_LABELS = {
  prenatal: "Prenatal Check-up",
  delivery: "Safe Delivery",
  family:   "Family Planning",
  general:  "General Consult",
};

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-rose-500" />;
}

export function AppointmentsManager({ 
  appointments = [], 
  staffUsers = [],
  clinicSettings = { max_morning_slots: 10, max_afternoon_slots: 10 },
  updateAppointmentStatus,
  updateTriageStatus
}) {
  const [appointmentsList, setAppointmentsList] = useState(appointments);
  const [viewMode, setViewMode] = useState("kanban"); // Default to "kanban" for live ops!
  const [isPending, startTransition] = useTransition();
  const [activeTab,  setActiveTab]  = useState("Pending");
  const [search,     setSearch]     = useState("");
  const [sortField,  setSortField]  = useState("appointment_date");
  const [sortDir,    setSortDir]    = useState("asc");
  const [selected,   setSelected]   = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("Approved");
  const [assignedStaff, setAssignedStaff] = useState({}); // { [apptId]: staffId }

  const todayStr = new Date().toISOString().split("T")[0];

  // ── Sync with props ────────────────────────────────────────────────────────
  useEffect(() => {
    setAppointmentsList(appointments);
  }, [appointments]);

  // ── Supabase Real-time Subscription ─────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("live-appointments-triage-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload) => {
          setAppointmentsList((prevList) =>
            prevList.map((appt) => {
              if (appt.id === payload.new.id) {
                return {
                  ...appt,
                  ...payload.new,
                  // Retain relation object if not present in new payload
                  patients: appt.patients,
                };
              }
              return appt;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          // If a new appointment is submitted in real-time, add to state if not exists
          setAppointmentsList((prevList) => {
            if (prevList.some((a) => a.id === payload.new.id)) return prevList;
            return [payload.new, ...prevList];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Optimistic Triage Status Handler ───────────────────────────────────────
  const handleUpdateTriageStatus = async (appointmentId, newStatus) => {
    const previousList = appointmentsList;
    // Optimistic Update: If discharged, mark status as Completed
    setAppointmentsList((prev) =>
      prev.map((a) => {
        if (a.id === appointmentId) {
          return {
            ...a,
            triage_status: newStatus,
            ...(newStatus === "Discharged" ? { status: "Completed" } : {}),
          };
        }
        return a;
      })
    );

    if (updateTriageStatus) {
      try {
        const res = await updateTriageStatus(appointmentId, newStatus);
        if (res && res.error) {
          console.error("Failed to update triage status:", res.error);
          setAppointmentsList(previousList);
        }
      } catch (err) {
        console.error("Error updating triage status:", err);
        setAppointmentsList(previousList);
      }
    }
  };

  // ── Staff Map ─────────────────────────────────────────────────────────────
  const staffMap = useMemo(() => {
    const m = {};
    staffUsers.forEach((u) => {
      m[u.id] = u.email ? u.email.split("@")[0] : `Staff (${u.id.slice(0, 5)})`;
    });
    return m;
  }, [staffUsers]);

  // ── Daily Slot Capacity Calculations ──────────────────────────────────────
  const todayCapacity = useMemo(() => {
    const maxMorning = clinicSettings?.max_morning_slots || 10;
    const maxAfternoon = clinicSettings?.max_afternoon_slots || 10;

    let morningBooked = 0;
    let afternoonBooked = 0;

    appointmentsList.forEach((a) => {
      if (a.appointment_date === todayStr && a.status !== "Rejected" && a.status !== "Cancelled") {
        const timePref = (a.time_preference || "").toUpperCase();
        if (timePref.includes("AM") || timePref.includes("MORNING") || timePref.startsWith("7") || timePref.startsWith("8") || timePref.startsWith("9") || timePref.startsWith("10") || timePref.startsWith("11")) {
          morningBooked++;
        } else {
          afternoonBooked++;
        }
      }
    });

    return {
      maxMorning,
      maxAfternoon,
      morningBooked,
      afternoonBooked,
      morningPct: Math.min(100, Math.round((morningBooked / maxMorning) * 100)),
      afternoonPct: Math.min(100, Math.round((afternoonBooked / maxAfternoon) * 100)),
    };
  }, [appointmentsList, todayStr, clinicSettings]);

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { All: appointmentsList.length, Pending: 0, Approved: 0, Completed: 0, Rejected: 0 };
    appointmentsList.forEach((a) => { if (c[a.status] !== undefined) c[a.status]++; });
    return c;
  }, [appointmentsList]);

  // ── Filter + Search + Sort ────────────────────────────────────────────────
  const visible = useMemo(() => {
    let rows = appointmentsList;
    if (activeTab !== "All") rows = rows.filter((a) => a.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.patients?.full_name?.toLowerCase().includes(q) ||
          a.service_type?.toLowerCase().includes(q) ||
          a.appointment_date?.includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      let va = a[sortField] ?? "";
      let vb = b[sortField] ?? "";
      if (sortField === "patients") {
        va = a.patients?.full_name ?? "";
        vb = b.patients?.full_name ?? "";
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return rows;
  }, [appointmentsList, activeTab, search, sortField, sortDir]);

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allVisibleIds = visible.map((a) => a.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allVisibleIds));
  };
  const clearSelection = () => setSelected(new Set());

  // ── Single action with Staff Assignment ───────────────────────────────────
  const handleStatus = (id, status) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("appointment_id", id);
      fd.append("status", status);
      const staffId = assignedStaff[id];
      if (staffId) {
        fd.append("attending_staff_id", staffId);
      }
      if (updateAppointmentStatus) {
        await updateAppointmentStatus(fd);
      }
    });
  };

  // ── Bulk action ───────────────────────────────────────────────────────────
  const handleBulk = () => {
    startTransition(async () => {
      if (updateAppointmentStatus) {
        await Promise.all(
          [...selected].map((id) => {
            const fd = new FormData();
            fd.append("appointment_id", id);
            fd.append("status", bulkStatus);
            return updateAppointmentStatus(fd);
          })
        );
      }
      clearSelection();
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── Page Header & View Mode Switcher ────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Clinic Operations
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Real-time Queue
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Appointments & Triage</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            Manage clinic flow, live patient triage, and attending medical staff assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-muted/70 p-1 rounded-2xl border border-border flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-sm font-black text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns3 className="w-4 h-4" />
              <span>Live Kanban Triage</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-sm font-black text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Table List View</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground bg-card px-4 py-2 rounded-2xl border border-border shadow-xs">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span>
              {new Date().toLocaleDateString("en-PH", {
                weekday: "short", year: "numeric", month: "short", day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Daily Slot Capacity Banner ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border border-border rounded-3xl p-5 shadow-xs">
        {/* Morning Shift */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              🌅 Morning Shift (AM)
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              todayCapacity.morningBooked >= todayCapacity.maxMorning
                ? "bg-destructive/10 text-destructive font-black border border-destructive/20"
                : "bg-card text-foreground border border-border shadow-xs"
            }`}>
              {todayCapacity.morningBooked} / {todayCapacity.maxMorning} Booked
            </span>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todayCapacity.morningPct >= 100 ? "bg-destructive" : todayCapacity.morningPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${todayCapacity.morningPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            {todayCapacity.maxMorning - todayCapacity.morningBooked <= 0 
              ? "⚠️ Morning shift is at maximum capacity." 
              : `${todayCapacity.maxMorning - todayCapacity.morningBooked} morning slots remaining for today.`}
          </p>
        </div>

        {/* Afternoon Shift */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              🌇 Afternoon Shift (PM)
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              todayCapacity.afternoonBooked >= todayCapacity.maxAfternoon
                ? "bg-destructive/10 text-destructive font-black border border-destructive/20"
                : "bg-card text-foreground border border-border shadow-xs"
            }`}>
              {todayCapacity.afternoonBooked} / {todayCapacity.maxAfternoon} Booked
            </span>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todayCapacity.afternoonPct >= 100 ? "bg-destructive" : todayCapacity.afternoonPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${todayCapacity.afternoonPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            {todayCapacity.maxAfternoon - todayCapacity.afternoonBooked <= 0 
              ? "⚠️ Afternoon shift is at maximum capacity." 
              : `${todayCapacity.maxAfternoon - todayCapacity.afternoonBooked} afternoon slots remaining for today.`}
          </p>
        </div>
      </div>

      {/* ── View Rendering: Kanban vs Table ─────────────────────────────── */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          appointments={appointmentsList}
          staffMap={staffMap}
          onUpdateTriageStatus={handleUpdateTriageStatus}
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Pending", "Approved", "Completed", "Rejected"].map((s) => {
              const cfg = STATUS[s];
              return (
                <button
                  key={s}
                  onClick={() => { setActiveTab(s); clearSelection(); }}
                  className={`bg-card rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                    activeTab === s ? "border-primary shadow-md ring-1 ring-primary/30" : "border-border shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s}</span>
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  </div>
                  <p className="text-3xl font-black text-foreground">{counts[s]}</p>
                </button>
              );
            })}
          </div>

          {/* Table Container */}
          <div className="bg-card rounded-3xl border border-border shadow-xs overflow-hidden">
            {/* Tabs + Search bar */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); clearSelection(); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab}
                    <span className="ml-1.5 opacity-80 text-[10px]">({counts[tab] ?? visible.length})</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search patient, service..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); clearSelection(); }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>

            {/* Bulk actions bar */}
            {someSelected && (
              <div className="px-5 py-3 bg-secondary/50 border-b border-border flex items-center justify-between gap-4 animate-in fade-in">
                <span className="text-xs font-bold text-foreground">
                  {selected.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="text-xs font-bold rounded-xl border border-border bg-card px-2.5 py-1 text-foreground focus:outline-none"
                  >
                    <option value="Approved">Set Approved</option>
                    <option value="Completed">Set Completed</option>
                    <option value="Rejected">Set Rejected</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleBulk}
                    disabled={isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl h-8 px-3 shadow-xs"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Apply
                  </Button>
                  <button
                    onClick={clearSelection}
                    className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            {visible.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <CalendarDays className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">No appointments found for this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {visible.map((appt) => {
                  const cfg = STATUS[appt.status] || STATUS.Pending;
                  const Icon = cfg.icon;
                  const isChecked = selected.has(appt.id);
                  const patientName = appt.patients?.full_name || "Unknown Patient";
                  const contact = appt.patients?.contact_number || "—";
                  const attendingStaffName = staffMap[appt.attending_staff_id];

                  return (
                    <div
                      key={appt.id}
                      className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                        isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRow(appt.id)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-2xl bg-secondary/50 border border-secondary text-primary font-black text-xs flex items-center justify-center shrink-0">
                          {initials(patientName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground text-sm tracking-tight">{patientName}</h4>
                            {appt.patients?.is_high_risk && (
                              <span className="bg-destructive/10 text-destructive text-[10px] font-black px-1.5 py-0.5 rounded uppercase border border-destructive/20">
                                HIGH RISK
                              </span>
                            )}
                            {appt.triage_status && (
                              <span className="bg-secondary text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full border border-border">
                                Queue: {appt.triage_status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {SERVICE_LABELS[appt.service_type] || appt.service_type} • {appt.appointment_date} {appt.time_preference ? `(${appt.time_preference})` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end lg:self-center">
                        {appt.status === "Pending" && (
                          <div className="flex items-center gap-1.5">
                            {staffUsers.length > 0 && (
                              <select
                                value={assignedStaff[appt.id] || ""}
                                onChange={(e) => setAssignedStaff((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                                className="h-8 rounded-xl border border-border bg-card text-foreground text-[11px] font-medium px-2 focus:ring-1 focus:ring-primary outline-none max-w-[120px] truncate"
                              >
                                <option value="">Assign Staff...</option>
                                {staffUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {staffMap[u.id] || u.email}
                                  </option>
                                ))}
                              </select>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleStatus(appt.id, "Approved")}
                              disabled={isPending}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 px-3 text-xs font-bold shadow-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatus(appt.id, "Rejected")}
                              disabled={isPending}
                              className="text-destructive hover:bg-destructive/10 rounded-xl h-8 px-2.5 text-xs font-bold"
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {appt.status === "Approved" && (
                          <div className="flex items-center gap-2">
                            {attendingStaffName && (
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-xl flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> {attendingStaffName}
                              </span>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleStatus(appt.id, "Completed")}
                              disabled={isPending}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-8 px-3 text-xs font-bold shadow-xs"
                            >
                              Complete
                            </Button>
                          </div>
                        )}

                        {(appt.status === "Completed" || appt.status === "Rejected") && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold ${cfg.badge}`}>
                            <Icon className="w-3 h-3" />
                            {appt.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer count */}
            <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Showing {visible.length} of {appointmentsList.length} total appointments
              </span>
              {someSelected && (
                <span className="text-xs text-primary font-bold">
                  {selected.size} row{selected.size !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
