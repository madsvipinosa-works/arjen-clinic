"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
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
  Ticket,
  Footprints,
  Download,
  Tv,
  Calendar,
  Filter,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { QuickWalkInModal } from "@/components/admin/quick-walkin-modal";
import { createClient } from "@/utils/supabase/client";
import { checkInAppointment } from "@/app/actions";
import { getClinicTodayDateString } from "@/lib/utils";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS = {
  Approved:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-400" },
  Completed: { badge: "bg-blue-50 text-blue-700 border-blue-200",       icon: CheckCircle2,  dot: "bg-blue-400" },
  Cancelled: { badge: "bg-gray-100 text-gray-700 border-gray-200",       icon: XCircle,       dot: "bg-gray-400" },
  "No-Show": { badge: "bg-purple-50 text-purple-700 border-purple-200",   icon: AlertTriangle, dot: "bg-purple-400" },
  Pending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",    icon: Clock,         dot: "bg-amber-400" },
  Rejected:  { badge: "bg-red-50 text-red-700 border-red-200",          icon: XCircle,       dot: "bg-red-400" },
};

const TABS = ["All", "Approved", "Completed", "Cancelled", "No-Show", "Pending", "Rejected"];

const DATE_PRESETS = [
  { id: "today",     label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week",      label: "This Week" },
  { id: "month",     label: "This Month" },
  { id: "all",       label: "All Past Records" },
  { id: "custom",    label: "Custom Range" },
];

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
  updateTriageStatus,
  fetchAppointments,
  currentRange = "today",
  currentFrom = "",
  currentTo = "",
  currentStatus = "All"
}) {
  const [appointmentsList, setAppointmentsList] = useState(appointments);
  const [viewMode, setViewMode] = useState("kanban"); // Default to "kanban" for live ops!
  const [isPending, startTransition] = useTransition();
  const [activeTab,  setActiveTab]  = useState(currentStatus || "All");
  const [search,     setSearch]     = useState("");
  const [sortField,  setSortField]  = useState("appointment_date");
  const [sortDir,    setSortDir]    = useState("desc");
  const [selected,   setSelected]   = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("Approved");
  const [assignedStaff, setAssignedStaff] = useState({}); // { [apptId]: staffId }

  // Walk-in Intake Modal state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);

  // Date Range Filtering
  const [dateFilter, setDateFilter] = useState(currentRange || "today");
  const [customFrom, setCustomFrom] = useState(currentFrom || "");
  const [customTo, setCustomTo] = useState(currentTo || "");

  const todayStr = getClinicTodayDateString();

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
            status: newStatus === "Discharged" ? "Completed" : "Approved",
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

  // ── Check-In & Issue Queue Ticket Handler ──────────────────────────────────
  const handleCheckIn = async (appointmentId) => {
    try {
      const res = await checkInAppointment(appointmentId);
      if (res?.success && res.ticketNumber) {
        setAppointmentsList((prev) =>
          prev.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  queue_ticket_number: res.ticketNumber,
                  status: "Approved",
                  triage_status: a.triage_status === "Discharged" ? "Discharged" : (a.triage_status || "Waiting"),
                  checked_in_at: new Date().toISOString(),
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error("Check-in failed:", err);
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

  // ── Kanban filtered appointments (supports date filtering & search) ─────
  const kanbanAppointments = useMemo(() => {
    let rows = appointmentsList;
    if (dateFilter === "today") {
      rows = rows.filter((a) => a.appointment_date === todayStr);
    } else if (dateFilter === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      rows = rows.filter((a) => a.appointment_date === yStr);
    } else if (dateFilter === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      const wStr = w.toISOString().split("T")[0];
      rows = rows.filter((a) => a.appointment_date >= wStr);
    } else if (dateFilter === "month") {
      const m = new Date();
      m.setDate(m.getDate() - 30);
      const mStr = m.toISOString().split("T")[0];
      rows = rows.filter((a) => a.appointment_date >= mStr);
    } else if (dateFilter === "custom") {
      if (customFrom) rows = rows.filter((a) => a.appointment_date >= customFrom);
      if (customTo) rows = rows.filter((a) => a.appointment_date <= customTo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.patients?.full_name?.toLowerCase().includes(q) ||
          a.service_type?.toLowerCase().includes(q) ||
          a.queue_ticket_number?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [appointmentsList, dateFilter, customFrom, customTo, todayStr, search]);

  // ── Filter + Search + Sort (Table List View) ──────────────────────────────
  const visible = useMemo(() => {
    let rows = appointmentsList;

    // 1. Status Filter
    if (activeTab !== "All") rows = rows.filter((a) => a.status === activeTab);

    // 2. Date Range Filter
    if (dateFilter === "today") {
      rows = rows.filter((a) => a.appointment_date === todayStr);
    } else if (dateFilter === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      rows = rows.filter((a) => a.appointment_date === yStr);
    } else if (dateFilter === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      const wStr = w.toISOString().split("T")[0];
      rows = rows.filter((a) => a.appointment_date >= wStr);
    } else if (dateFilter === "month") {
      const m = new Date();
      m.setDate(m.getDate() - 30);
      const mStr = m.toISOString().split("T")[0];
      rows = rows.filter((a) => a.appointment_date >= mStr);
    } else if (dateFilter === "custom") {
      if (customFrom) rows = rows.filter((a) => a.appointment_date >= customFrom);
      if (customTo) rows = rows.filter((a) => a.appointment_date <= customTo);
    }

    // 3. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.patients?.full_name?.toLowerCase().includes(q) ||
          a.service_type?.toLowerCase().includes(q) ||
          a.appointment_date?.includes(q) ||
          a.queue_ticket_number?.toLowerCase().includes(q) ||
          a.notes?.toLowerCase().includes(q)
      );
    }

    // 4. Sort
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
  }, [appointmentsList, activeTab, search, sortField, sortDir, dateFilter, customFrom, customTo, todayStr]);

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { All: appointmentsList.length, Approved: 0, Completed: 0, Cancelled: 0, "No-Show": 0, Pending: 0, Rejected: 0 };
    appointmentsList.forEach((a) => {
      const s = a.status || "Pending";
      if (c[s] !== undefined) c[s]++;
      else c[s] = 1;
    });
    return c;
  }, [appointmentsList]);

  // ── Export to CSV Function (Compliant with Module 1 Deliverables) ───────────
  const handleExportCsv = () => {
    const headers = [
      "Queue Ticket",
      "Patient Name",
      "Contact Number",
      "Service Type",
      "Appointment Date",
      "Triage Status",
      "Overall Status",
      "Attending Clinician",
      "Notes",
    ];

    const targetList = viewMode === "kanban" ? kanbanAppointments : visible;

    const csvRows = targetList.map((a) => {
      const ticket = (a.queue_ticket_number || "—").replace(/"/g, '""');
      const patientName = (a.patients?.full_name || "Unknown Patient").replace(/"/g, '""');
      const contactNum = (a.patients?.contact_number || a.patients?.phone_number || "").replace(/"/g, '""');
      const service = (SERVICE_LABELS[a.service_type?.toLowerCase()] || a.service_type || "").replace(/"/g, '""');
      const apptDate = (a.appointment_date || "").replace(/"/g, '""');
      const triage = (a.triage_status || "Waiting").replace(/"/g, '""');
      const overallStatus = (a.status || "Pending").replace(/"/g, '""');
      const clinician = (staffMap[a.attending_staff_id] || "Unassigned").replace(/"/g, '""');
      const notes = (a.notes || "").replace(/"/g, '""');

      return [
        `"${ticket}"`,
        `"${patientName}"`,
        `"${contactNum}"`,
        `"${service}"`,
        `"${apptDate}"`,
        `"${triage}"`,
        `"${overallStatus}"`,
        `"${clinician}"`,
        `"${notes}"`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateRangeLabel = dateFilter === "custom" && customFrom && customTo 
      ? `${customFrom}-to-${customTo}` 
      : (dateFilter || "all");
    link.setAttribute("href", url);
    link.setAttribute("download", `arjen-appointments-${dateRangeLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

      {/* ── Page Header & Quick Actions ────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Clinic Operations
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Queue System
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Appointments & Triage</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            Manage clinic flow, walk-in intakes, live patient triage, and attending staff assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Walk-In Button */}
          <button
            type="button"
            onClick={() => setIsWalkInModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-primary to-rose-600 text-primary-foreground text-xs font-black shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Quick Walk-In</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">Ticket</span>
          </button>

          {/* Lobby TV Display Screen Link */}
          <Link
            href="/queue"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs"
          >
            <Tv className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Lobby TV</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </Link>

          {/* Quick Export to CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Download formatted CSV report for current date range"
          >
            <Download className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* View Mode Toggle */}
          <div className="bg-muted/70 p-1 rounded-2xl border border-border flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-sm font-black text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Table List View</span>
            </button>
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

      {/* ── Unified Date Presets & Filter Toolbar ──────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary" /> Date Range:
          </span>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDateFilter(preset.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === preset.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {preset.label}
            </button>
          ))}

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-muted/40 p-1.5 rounded-xl border border-border">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-0.5 text-xs rounded-lg border border-border bg-background text-foreground font-medium outline-none"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-0.5 text-xs rounded-lg border border-border bg-background text-foreground font-medium outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, patient name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-muted/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Export CSV ({viewMode === "kanban" ? kanbanAppointments.length : visible.length})</span>
          </button>
        </div>
      </div>

      {/* ── View Rendering: Kanban vs Table ─────────────────────────────── */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          appointments={kanbanAppointments}
          staffMap={staffMap}
          onUpdateTriageStatus={handleUpdateTriageStatus}
          onCheckIn={handleCheckIn}
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {["Approved", "Completed", "Cancelled", "No-Show", "Pending", "Rejected"].map((s) => {
              const cfg = STATUS[s] || { dot: "bg-muted-foreground" };
              return (
                <button
                  key={s}
                  onClick={() => { setActiveTab(s); clearSelection(); }}
                  className={`bg-card rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer ${
                    activeTab === s ? "border-primary shadow-md ring-1 ring-primary/30" : "border-border shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s}</span>
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  </div>
                  <p className="text-2xl font-black text-foreground">{counts[s] || 0}</p>
                </button>
              );
            })}
          </div>

          {/* Table Container */}
          <div className="bg-card rounded-3xl border border-border shadow-xs overflow-hidden">
            {/* Tabs + Search bar */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); clearSelection(); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === tab
                        ? "bg-secondary text-foreground font-black border border-border shadow-xs"
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
                  placeholder="Search patient, ticket, service..."
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
                    className="text-xs text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
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
                <p className="text-xs font-medium">No appointments found matching this date or status filter.</p>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            {appt.queue_ticket_number && (
                              <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs flex items-center gap-1">
                                <Ticket className="w-3 h-3" />
                                {appt.queue_ticket_number}
                              </span>
                            )}
                            {appt.is_walk_in && (
                              <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase border border-rose-500/20 flex items-center gap-0.5">
                                <Footprints className="w-2.5 h-2.5" /> Walk-in
                              </span>
                            )}
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
                            {contact !== "—" ? ` • ${contact}` : ""}
                            {appt.notes ? ` • "${appt.notes}"` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end lg:self-center flex-wrap">
                        {/* Quick Check In Trigger for Approved / Waiting appointments missing tickets */}
                        {!appt.queue_ticket_number && appt.status !== "Rejected" && appt.status !== "Completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckIn(appt.id)}
                            className="h-8 rounded-xl border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold"
                          >
                            <Ticket className="w-3.5 h-3.5 mr-1" />
                            Check In
                          </Button>
                        )}

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
                              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 px-3 text-xs font-bold shadow-xs cursor-pointer"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatus(appt.id, "Rejected")}
                              disabled={isPending}
                              className="text-destructive hover:bg-destructive/10 rounded-xl h-8 px-2.5 text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {appt.status === "Approved" && (
                          <div className="flex items-center gap-2">
                            {attendingStaffName && (
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-xl flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" /> {attendingStaffName}
                              </span>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleStatus(appt.id, "Completed")}
                              disabled={isPending}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-8 px-3 text-xs font-bold shadow-xs cursor-pointer"
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
                Showing {visible.length} of {appointmentsList.length} total appointments ({dateFilter} filter)
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

      {/* ── Quick Walk-In Patient Intake Modal ── */}
      <QuickWalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        staffUsers={staffUsers}
        onAppointmentCreated={(created) => {
          // Handled via Supabase Realtime + local notification
        }}
      />
    </div>
  );
}
