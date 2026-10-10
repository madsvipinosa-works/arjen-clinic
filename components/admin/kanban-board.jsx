"use client";

import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { 
  Users, 
  Activity, 
  Stethoscope, 
  CheckCircle2, 
  Search, 
  Calendar,
  Inbox
} from "lucide-react";
import { KanbanCard } from "./kanban-card";
import { Button } from "@/components/ui/button";
import { getClinicTodayDateString } from "@/lib/utils";

const COLUMNS = [
  {
    id: "Waiting",
    title: "Waiting Room",
    subtitle: "Checked-in & awaiting triage",
    icon: Users,
    color: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    countBadge: "bg-amber-500 text-white",
  },
  {
    id: "Vital Signs",
    title: "Triage & Vitals",
    subtitle: "BP, weight, & history intake",
    icon: Activity,
    color: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    badgeBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    countBadge: "bg-indigo-500 text-white",
  },
  {
    id: "Consultation",
    title: "Consultation",
    subtitle: "With attending midwife / OB",
    icon: Stethoscope,
    color: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20",
    badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    countBadge: "bg-primary text-primary-foreground",
  },
  {
    id: "Discharged",
    title: "Discharged",
    subtitle: "Exam done & next visit set",
    icon: CheckCircle2,
    color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    countBadge: "bg-emerald-500 text-white",
  },
];

function getElapsedMinutes(timeStr) {
  if (!timeStr) return null;
  const diffMs = Date.now() - new Date(timeStr).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60));
}

export function KanbanBoard({ 
  appointments = [], 
  staffMap = {},
  onUpdateTriageStatus,
  onCheckIn,
  onStepAside,
  onReturnToQueue,
  dateFilter = "today",
  onViewAll,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
}) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const isControlledSearch = typeof externalSearchQuery === "string";
  const activeSearch = isControlledSearch ? externalSearchQuery : internalSearchQuery;
  const handleSearchChange = (val) => {
    if (externalOnSearchChange) externalOnSearchChange(val);
    else setInternalSearchQuery(val);
  };

  // Re-render tick every 30s for live elapsed minutes on stepped-out cards
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Default to today only if the user is on the "today" preset.
  // When a historical range (e.g. all, month, week, yesterday, custom) is selected, allow all loaded records to show.
  const [filterTodayOnly, setFilterTodayOnly] = useState(dateFilter === "today");

  const todayStr = getClinicTodayDateString();

  // Keep in sync whenever parent date preset changes
  useEffect(() => {
    setFilterTodayOnly(dateFilter === "today");
  }, [dateFilter]);

  // Separate list for patients on hold / stepped out
  const onHoldAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const s = appt.triage_status?.toLowerCase();
      return s === "stepped out" || s === "returning";
    });
  }, [appointments]);

  // Group appointments by triage_status with fallback to 'Waiting'
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Live Ops Kanban: Show active triage patients (Approved, Scheduled, or Completed).
      // Filter out Pending (must be approved first), Rejected, and Cancelled.
      if (appt.status === "Pending" || appt.status === "Rejected" || appt.status === "Cancelled") {
        return false;
      }

      // Filter out stepped-out patients from the 4 primary lanes (they appear in the grace shelf)
      const ts = appt.triage_status?.toLowerCase();
      if (ts === "stepped out" || ts === "returning") {
        return false;
      }

      if (filterTodayOnly && appt.appointment_date !== todayStr) {
        return false;
      }

      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase();
        const patientName = (appt.patients?.full_name || "").toLowerCase();
        const service = (appt.service_type || "").toLowerCase();
        const ticket = (appt.queue_ticket_number || "").toLowerCase();
        const date = (appt.appointment_date || "").toLowerCase();
        return patientName.includes(q) || service.includes(q) || ticket.includes(q) || date.includes(q);
      }

      return true;
    });
  }, [appointments, filterTodayOnly, activeSearch, todayStr]);

  const columnsData = useMemo(() => {
    const map = {
      "Waiting": [],
      "Vital Signs": [],
      "Consultation": [],
      "Discharged": [],
    };

    filteredAppointments.forEach((appt) => {
      const statusKey = appt.triage_status || "Waiting";
      if (map[statusKey]) {
        map[statusKey].push(appt);
      } else {
        map["Waiting"].push(appt);
      }
    });

    return map;
  }, [filteredAppointments]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the exact same spot
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newTriageStatus = destination.droppableId;
    const appointmentId = draggableId;

    if (onUpdateTriageStatus) {
      await onUpdateTriageStatus(appointmentId, newTriageStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Board Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter lane cards by name, ticket, service..."
              value={activeSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-muted/50 border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {activeSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>

          <Button
            type="button"
            variant={filterTodayOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTodayOnly(!filterTodayOnly)}
            className={`rounded-2xl text-xs font-bold gap-1.5 transition-all cursor-pointer ${
              filterTodayOnly
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {filterTodayOnly
                ? "Today's Schedule Only"
                : dateFilter === "all"
                ? "Showing All Records"
                : "Showing Filtered Range"}
            </span>
          </Button>

          {/* Quick Active Lane Breakdown Pill */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-2xl border border-border/60">
            <span>Waiting: <strong className="text-amber-600">{columnsData["Waiting"]?.length || 0}</strong></span>
            <span>•</span>
            <span>Vitals: <strong className="text-indigo-600">{columnsData["Vital Signs"]?.length || 0}</strong></span>
            <span>•</span>
            <span>Consult: <strong className="text-rose-600">{columnsData["Consultation"]?.length || 0}</strong></span>
            <span>•</span>
            <span>Done: <strong className="text-emerald-600">{columnsData["Discharged"]?.length || 0}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground self-end sm:self-center shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Triage Ops ({filteredAppointments.length} Active Patients)</span>
        </div>
      </div>

      {filteredAppointments.length === 0 && (
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Inbox className="w-4 h-4 text-primary shrink-0" />
            <span>
              {filterTodayOnly
                ? "No approved triage patients scheduled for today. Check past records or intake a walk-in patient."
                : "No approved triage patients found matching this filter."}
            </span>
          </div>
          {filterTodayOnly && onViewAll && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewAll}
              className="text-xs font-bold rounded-xl cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all"
            >
              View All Past Records
            </Button>
          )}
        </div>
      )}

      {/* ── On Hold / Stepped Out Grace Shelf ──────────────────────────── */}
      {onHoldAppointments.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Patients On Hold / Stepped Out ({onHoldAppointments.length})
              </h4>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 hidden md:inline">
                • Temporarily stepped out of lobby. Priority resumption upon return.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {onHoldAppointments.map((appt) => {
              const isReturning = appt.triage_status === "Returning";
              const elapsedMins = getElapsedMinutes(appt.checked_in_at || appt.created_at);
              return (
                <div
                  key={appt.id}
                  className={`p-3 rounded-2xl border bg-card flex flex-col justify-between gap-2.5 shadow-2xs transition-all ${
                    isReturning
                      ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-500/5"
                      : "border-amber-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {appt.queue_ticket_number && (
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            {appt.queue_ticket_number}
                          </span>
                        )}
                        {isReturning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-[10px] uppercase tracking-wider border border-emerald-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Returning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-500/25">
                            Stepped Out
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-sm text-foreground truncate mt-1">
                        {appt.patients?.full_name || "Patient"}
                      </h5>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {appt.service_type || "General Consult"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      {isReturning ? (
                        <span className="text-emerald-600 font-bold">🏃 Approaching desk</span>
                      ) : elapsedMins !== null ? (
                        <span className={elapsedMins > 15 ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                          ⏱️ On hold • ~{elapsedMins}m
                        </span>
                      ) : (
                        "In grace period"
                      )}
                    </span>
                    {onReturnToQueue && (
                      <Button
                        size="sm"
                        onClick={() => onReturnToQueue(appt.id, "Waiting")}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer gap-1"
                      >
                        <span>↩️ Return to Queue</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Drag & Drop Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const items = columnsData[column.id] || [];

            return (
              <div
                key={column.id}
                className="flex flex-col bg-muted/30 border border-border/70 rounded-3xl p-4 min-h-[500px] shadow-xs"
              >
                {/* Column Header */}
                <div className={`rounded-2xl p-3.5 border bg-gradient-to-br ${column.color} mb-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${column.badgeBg} flex items-center justify-center font-bold`}>
                      <ColumnIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                        {column.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {column.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${column.countBadge}`}>
                    {items.length}
                  </span>
                </div>

                {/* Droppable Drop Zone */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-3 rounded-2xl p-1.5 transition-colors ${
                        snapshot.isDraggingOver
                          ? "bg-primary/5 ring-2 ring-primary/30 ring-dashed"
                          : ""
                      }`}
                    >
                      {items.map((appointment, index) => (
                        <KanbanCard
                          key={appointment.id}
                          appointment={appointment}
                          index={index}
                          staffMap={staffMap}
                          onCheckIn={onCheckIn}
                          onStepAside={onStepAside}
                        />
                      ))}
                      {provided.placeholder}

                      {items.length === 0 && (
                        <div className="h-44 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center text-center p-4 text-muted-foreground/60 space-y-1.5">
                          <Inbox className="w-6 h-6 opacity-40" />
                          <p className="text-xs font-bold">No approved patients in this queue</p>
                          <p className="text-[10px] opacity-75">Drag an approved patient card here to update triage status</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
