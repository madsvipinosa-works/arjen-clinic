"use client";

import { useState } from "react";
import { CalendarPlus, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Format a Date object into an ICS timestamp string: YYYYMMDDTHHMMSS
 */
function formatIcsDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Parses appointment date and time preference into start and end Date objects
 */
function getEventDates(appointmentDateStr, timePreference) {
  const baseDate = new Date(appointmentDateStr);
  let startHour = 9;
  let startMinute = 0;

  if (timePreference) {
    const pref = String(timePreference).toLowerCase();
    if (pref.includes("afternoon") || pref.includes("pm")) {
      startHour = 14;
    } else if (pref.includes("morning") || pref.includes("am")) {
      startHour = 9;
    }
  }

  const startDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    startHour,
    startMinute,
    0
  );

  // Default duration: 1 hour
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  return { startDate, endDate };
}

export function AddToCalendarButton({
  appointmentDate,
  timePreference,
  serviceType = "Prenatal Checkup",
  patientName = "",
}) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    try {
      const { startDate, endDate } = getEventDates(appointmentDate, timePreference);
      const dtStart = formatIcsDateTime(startDate);
      const dtEnd = formatIcsDateTime(endDate);
      const dtStamp = formatIcsDateTime(new Date());
      const uid = `arjen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@arjenclinic.com`;

      const summary = `AR-JEN Clinic: ${serviceType}`;
      const description = `Prenatal clinic checkup for ${patientName || "Patient"} at AR-JEN Maternity Clinic.\\n\\nService: ${serviceType}\\nTime Preference: ${timePreference || "Scheduled Slot"}\\n\\nClinic Reminder: Please arrive 15 minutes prior to your appointment time.`;
      const location = "AR-JEN Maternity Clinic, Main Bldg.";

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AR-JEN Clinic//Maternity Patient Portal//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT2H",
        "ACTION:DISPLAY",
        "DESCRIPTION:Upcoming Clinic Checkup at AR-JEN Clinic",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arjen-appointment-${serviceType.toLowerCase().replace(/\s+/g, "-")}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("Failed to generate calendar file:", err);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleDownload}
      className={`rounded-xl font-bold text-xs h-9 transition-all border-border ${
        downloaded
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : "bg-card text-foreground hover:bg-secondary/40 hover:text-primary shadow-xs"
      }`}
    >
      {downloaded ? (
        <>
          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
          <span>Calendar Saved!</span>
        </>
      ) : (
        <>
          <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-primary" />
          <span>Add to Calendar</span>
        </>
      )}
    </Button>
  );
}
