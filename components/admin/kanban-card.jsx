"use client";

import { Draggable } from "@hello-pangea/dnd";
import { 
  Clock, 
  ShieldAlert, 
  Calendar, 
  UserCheck, 
  GripVertical
} from "lucide-react";

const SERVICE_LABELS = {
  prenatal: "Prenatal Check-up",
  delivery: "Safe Delivery",
  family: "Family Planning",
  general: "General Consult",
};

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function KanbanCard({ appointment, index, staffMap = {} }) {
  const patient = appointment.patients || {};
  const serviceLabel = SERVICE_LABELS[appointment.service_type?.toLowerCase()] || appointment.service_type;
  const attendingStaffName = appointment.attending_staff_id ? staffMap[appointment.attending_staff_id] : null;

  return (
    <Draggable draggableId={appointment.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group bg-card border border-border/80 rounded-2xl p-4 shadow-xs transition-all select-none ${
            snapshot.isDragging
              ? "shadow-xl ring-2 ring-primary border-transparent scale-105 rotate-1 z-50 bg-card/95 backdrop-blur-md"
              : "hover:border-primary/40 hover:shadow-md"
          }`}
        >
          {/* Header with Patient Name & Initials */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-secondary/50 border border-secondary text-primary font-black text-xs flex items-center justify-center shrink-0">
                {initials(patient.full_name)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-sm tracking-tight truncate">
                  {patient.full_name || "Unknown Patient"}
                </h4>
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  {serviceLabel}
                </p>
              </div>
            </div>

            <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/80 shrink-0 transition-colors" />
          </div>

          {/* Badges / High Risk Notice */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {patient.is_high_risk && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-wider border border-destructive/20">
                <ShieldAlert className="w-3 h-3" /> High Risk
              </span>
            )}
            {patient.allergies && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 truncate max-w-[150px]">
                ⚠️ {patient.allergies}
              </span>
            )}
          </div>

          {/* Attending Staff Badge */}
          {attendingStaffName && (
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">Attending: {attendingStaffName}</span>
            </div>
          )}

          {/* Time & Date Footer */}
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary/70" />
              <span>{appointment.appointment_date}</span>
            </div>
            {appointment.time_preference && (
              <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-[10px] font-bold text-foreground">
                <Clock className="w-3 h-3 text-primary" />
                <span>{appointment.time_preference}</span>
              </div>
            )}
          </div>

          {/* Notes Snippet */}
          {appointment.notes && (
            <p className="mt-2 text-[11px] text-muted-foreground/90 italic line-clamp-2 bg-muted/30 p-2 rounded-xl border border-border/30">
              &ldquo;{appointment.notes}&rdquo;
            </p>
          )}
        </div>
      )}
    </Draggable>
  );
}
