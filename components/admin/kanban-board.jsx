"use client";

import { useState, useMemo } from "react";
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

export function KanbanBoard({ 
  appointments = [], 
  staffMap = {},
  onUpdateTriageStatus 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  // Step 3 Fix: Default to Today's Schedule Only for Live Ops
  const [filterTodayOnly, setFilterTodayOnly] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];

  // Group appointments by triage_status with fallback to 'Waiting'
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Step 3 Fix: Strict Filtering — Only Approved appointments can enter live triage
      if (appt.status !== "Approved") {
        return false;
      }

      if (filterTodayOnly && appt.appointment_date !== todayStr) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patientName = (appt.patients?.full_name || "").toLowerCase();
        const service = (appt.service_type || "").toLowerCase();
        const date = (appt.appointment_date || "").toLowerCase();
        return patientName.includes(q) || service.includes(q) || date.includes(q);
      }

      return true;
    });
  }, [appointments, filterTodayOnly, searchQuery, todayStr]);

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
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by patient name or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-muted/50 border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Button
            type="button"
            variant={filterTodayOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTodayOnly(!filterTodayOnly)}
            className={`rounded-2xl text-xs font-bold gap-1.5 transition-all ${
              filterTodayOnly
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {filterTodayOnly ? "Today's Schedule Only" : "All Upcoming Dates"}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground self-end sm:self-center">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Triage Ops (Approved Patients)</span>
        </div>
      </div>

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
