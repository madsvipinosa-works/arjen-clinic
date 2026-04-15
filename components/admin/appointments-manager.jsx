"use client";

import { useState, useMemo, useTransition } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS = {
  Pending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",    icon: Clock,         dot: "bg-amber-400" },
  Approved:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-400" },
  Completed: { badge: "bg-blue-50 text-blue-700 border-blue-200",       icon: CheckCircle2,  dot: "bg-blue-400" },
  Rejected:  { badge: "bg-red-50 text-red-700 border-red-200",          icon: XCircle,       dot: "bg-red-400" },
};

const TABS = ["All", "Pending", "Approved", "Completed", "Rejected"];

const SERVICE_LABELS = {
  prenatal: "Prenatal",
  delivery: "Delivery",
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

export function AppointmentsManager({ appointments, updateAppointmentStatus }) {
  const [isPending, startTransition] = useTransition();
  const [activeTab,  setActiveTab]  = useState("Pending");
  const [search,     setSearch]     = useState("");
  const [sortField,  setSortField]  = useState("appointment_date");
  const [sortDir,    setSortDir]    = useState("asc");
  const [selected,   setSelected]   = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("Approved");

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { All: appointments.length, Pending: 0, Approved: 0, Completed: 0, Rejected: 0 };
    appointments.forEach((a) => { if (c[a.status] !== undefined) c[a.status]++; });
    return c;
  }, [appointments]);

  // ── Filter + Search + Sort ────────────────────────────────────────────────
  const visible = useMemo(() => {
    let rows = appointments;
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
  }, [appointments, activeTab, search, sortField, sortDir]);

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

  // ── Single action ─────────────────────────────────────────────────────────
  const handleStatus = (id, status) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("appointment_id", id);
      fd.append("status", status);
      await updateAppointmentStatus(fd);
    });
  };

  // ── Bulk action ───────────────────────────────────────────────────────────
  const handleBulk = () => {
    startTransition(async () => {
      await Promise.all(
        [...selected].map((id) => {
          const fd = new FormData();
          fd.append("appointment_id", id);
          fd.append("status", bulkStatus);
          return updateAppointmentStatus(fd);
        })
      );
      clearSelection();
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Appointments</h1>
          <p className="text-gray-500 mt-1">
            Manage, approve, and track all patient appointment requests.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <CalendarDays className="w-4 h-4 text-rose-500" />
          <span>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["Pending", "Approved", "Completed", "Rejected"].map((s) => {
          const cfg = STATUS[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => { setActiveTab(s); clearSelection(); }}
              className={`bg-white rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                activeTab === s ? "border-rose-300 shadow-md ring-1 ring-rose-200" : "border-gray-100 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s}</span>
                <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar: Tabs + Search + Sort ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">

        {/* Tabs row */}
        <div className="flex gap-1 px-4 pt-4 flex-wrap border-b border-gray-100 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); clearSelection(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold text-sm border-b-2 transition-all ${
                activeTab === tab
                  ? "border-rose-500 text-rose-600 bg-rose-50/60"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {tab}
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
                activeTab === tab ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {counts[tab] ?? appointments.length}
              </span>
            </button>
          ))}
        </div>

        {/* Search + actions bar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100 bg-gray-50/40">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name, service, or date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Bulk action */}
          {someSelected && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
              <span className="text-sm font-semibold text-gray-600">
                {selected.size} selected
              </span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Approved">Approve</option>
                <option value="Rejected">Reject</option>
                <option value="Completed">Complete</option>
                <option value="Pending">Set Pending</option>
              </select>
              <Button
                onClick={handleBulk}
                disabled={isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-10 px-4 font-semibold text-sm gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply
              </Button>
              <Button
                variant="ghost"
                onClick={clearSelection}
                className="text-gray-500 rounded-xl h-10 px-3 text-sm"
              >
                Clear
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium flex-shrink-0">
            <ListFilter className="w-4 h-4" />
            {visible.length} record{visible.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Table header ──────────────────────────────────────────── */}
        <div className="hidden md:grid grid-cols-[40px_1fr_160px_160px_130px_180px] items-center px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider gap-3">
          {/* Checkbox all */}
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 accent-rose-500 cursor-pointer"
          />
          {/* Patient name */}
          <button onClick={() => toggleSort("patients")} className="flex items-center gap-1 hover:text-gray-700 transition-colors text-left">
            Patient <SortIcon field="patients" sortField={sortField} sortDir={sortDir} />
          </button>
          {/* Service */}
          <button onClick={() => toggleSort("service_type")} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            Service <SortIcon field="service_type" sortField={sortField} sortDir={sortDir} />
          </button>
          {/* Date */}
          <button onClick={() => toggleSort("appointment_date")} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            Date <SortIcon field="appointment_date" sortField={sortField} sortDir={sortDir} />
          </button>
          {/* Status */}
          <span>Status</span>
          {/* Actions */}
          <span className="text-right">Actions</span>
        </div>

        {/* ── Table rows ──────────────────────────────────────────────── */}
        {visible.length === 0 ? (
          <div className="py-24 text-center">
            <CalendarDays className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium text-lg">
              {search ? "No results match your search." : `No ${activeTab === "All" ? "" : activeTab.toLowerCase() + " "}appointments.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map((appt) => {
              const cfg = STATUS[appt.status] || STATUS.Pending;
              const Icon = cfg.icon;
              const patientName = appt.patients?.full_name || "Unknown Patient";
              const contact = appt.patients?.contact_number || "—";
              const isSelected = selected.has(appt.id);

              return (
                <div
                  key={appt.id}
                  className={`grid grid-cols-[40px_1fr] md:grid-cols-[40px_1fr_160px_160px_130px_180px] items-center px-5 py-4 gap-3 transition-colors ${
                    isSelected ? "bg-rose-50/60" : "hover:bg-gray-50/60"
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(appt.id)}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />

                  {/* Patient */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                      {initials(patientName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{patientName}</p>
                      <p className="text-xs text-gray-400 truncate">{contact}</p>
                      {/* Mobile: show extras inline */}
                      <div className="flex flex-wrap gap-1.5 mt-1 md:hidden">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg font-medium">
                          {SERVICE_LABELS[appt.service_type] || appt.service_type}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded-lg font-semibold">
                          {appt.appointment_date}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg border font-bold ${cfg.badge}`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service — desktop */}
                  <p className="hidden md:block text-sm text-gray-600 font-medium">
                    {SERVICE_LABELS[appt.service_type] || appt.service_type}
                  </p>

                  {/* Date — desktop */}
                  <div className="hidden md:block">
                    <p className="text-sm font-bold text-gray-800">{appt.appointment_date}</p>
                    {appt.time_preference && (
                      <p className="text-xs text-gray-400 mt-0.5">{appt.time_preference}</p>
                    )}
                  </div>

                  {/* Status badge — desktop */}
                  <div className="hidden md:flex items-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${cfg.badge}`}>
                      <Icon className="w-3 h-3" />
                      {appt.status}
                    </span>
                  </div>

                  {/* Actions — desktop */}
                  <div className="hidden md:flex items-center justify-end gap-2">
                    {appt.status === "Pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatus(appt.id, "Approved")}
                          disabled={isPending}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 px-3 text-xs font-bold shadow-sm"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatus(appt.id, "Rejected")}
                          disabled={isPending}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-xl h-8 px-3 text-xs font-bold"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {appt.status === "Approved" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatus(appt.id, "Completed")}
                        disabled={isPending}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-8 px-3 text-xs font-bold shadow-sm"
                      >
                        Mark Complete
                      </Button>
                    )}
                    {(appt.status === "Completed" || appt.status === "Rejected") && (
                      <span className="text-xs text-gray-300 font-medium italic">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">
            Showing {visible.length} of {appointments.length} total appointments
          </span>
          {someSelected && (
            <span className="text-xs text-rose-600 font-bold">
              {selected.size} row{selected.size !== 1 ? "s" : ""} selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
