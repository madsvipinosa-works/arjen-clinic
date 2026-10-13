import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Returns today's date in YYYY-MM-DD string format strictly in Philippine Standard Time (Asia/Manila).
 */
export function getClinicTodayDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Returns a date string in YYYY-MM-DD format offset by a number of days, strictly in Philippine Standard Time (Asia/Manila).
 * e.g., getClinicDateOffset(-1) for yesterday, getClinicDateOffset(-7) for 1 week ago, getClinicDateOffset(-30) for 1 month ago.
 */
export function getClinicDateOffset(daysOffset = 0) {
  const now = new Date();
  const target = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(target);
}

/**
 * Sanitizes and restricts phone number to digits, max 11 digits (Philippine mobile standard: 09XXXXXXXXX)
 */
export function sanitizeContactNumber(val) {
  if (!val) return "";
  const hasPlus = val.startsWith("+");
  const digits = val.replace(/\D/g, "");
  if (hasPlus) {
    return `+${digits.slice(0, 12)}`;
  }
  return digits.slice(0, 11);
}

/**
 * Enforces maximum character length on numeric input event (works with type="number" which browsers ignore)
 */
export function enforceMaxLength(maxLength) {
  return (e) => {
    if (e.target.value && e.target.value.length > maxLength) {
      e.target.value = e.target.value.slice(0, maxLength);
    }
  };
}

/**
 * Returns current date and time components in Philippine Standard Time (Asia/Manila, UTC+8).
 */
export function getClinicNowPHT() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const hours = parseInt(map.hour, 10);
  const minutes = parseInt(map.minute, 10);
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  return {
    dateStr,
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

function parseTimeString(timeStr, contextStr = "") {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  let meridiem = match[3];

  if (!meridiem && contextStr) {
    const ctxMatch = contextStr.toUpperCase().match(/(AM|PM)/);
    if (ctxMatch) meridiem = ctxMatch[1];
  }

  if (meridiem) {
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Parses start and end time (in minutes from midnight) for a time slot object or label string.
 * Supports:
 * - Direct object properties: { start_time: '07:30', end_time: '08:30' }
 * - Granular ranges: '7:30 AM - 8:30 AM', '1:00 PM - 2:00 PM'
 * - Broad shifts: 'AM', 'Morning', 'PM', 'Afternoon'
 */
export function parseSlotTimeRange(slot) {
  if (!slot) return null;

  // 1. Direct start_time / end_time properties from database record
  if (typeof slot === "object" && slot.start_time) {
    const [sh, sm] = slot.start_time.split(":").map(Number);
    const startMinutes = sh * 60 + (sm || 0);
    let endMinutes = startMinutes + 60;
    if (slot.end_time) {
      const [eh, em] = slot.end_time.split(":").map(Number);
      endMinutes = eh * 60 + (em || 0);
    }
    return { startMinutes, endMinutes };
  }

  // 2. Extract label string
  const label = (typeof slot === "string" ? slot : slot?.label || "").trim();
  if (!label) return null;

  const upper = label.toUpperCase();

  // Shift aliases
  if (upper === "AM" || upper === "MORNING" || upper.startsWith("MORNING (AM)")) {
    return { startMinutes: 8 * 60, endMinutes: 12 * 60 };
  }
  if (upper === "PM" || upper === "AFTERNOON" || upper.startsWith("AFTERNOON (PM)")) {
    return { startMinutes: 13 * 60, endMinutes: 17 * 60 };
  }

  // Time ranges e.g. "7:30 AM - 8:30 AM", "1:00 PM - 2:00 PM"
  const parts = label.split(/\s*(?:[-–—]|\bto\b)\s*/i);
  if (parts.length >= 2) {
    const start = parseTimeString(parts[0], parts[1]);
    const end = parseTimeString(parts[1]);
    if (start !== null) {
      return {
        startMinutes: start,
        endMinutes: end !== null ? end : start + 60,
      };
    }
  }

  // Single time string fallback e.g. "8:00 AM"
  const single = parseTimeString(label);
  if (single !== null) {
    return { startMinutes: single, endMinutes: single + 60 };
  }

  return null;
}

/**
 * Checks if a given time slot has already passed for the specified target date.
 * Strictly operates in Philippine Standard Time (PHT, Asia/Manila, UTC+8).
 * 
 * - Dates prior to today: immediately expired (true).
 * - Dates after today: future date, not expired (false).
 * - Today: expired if current PHT time has reached or passed the slot start time.
 */
export function isSlotExpired(slot, targetDateStr) {
  if (!targetDateStr) return false;
  const pht = getClinicNowPHT();

  if (targetDateStr < pht.dateStr) return true;
  if (targetDateStr > pht.dateStr) return false;

  // Selected date is TODAY in PHT
  const range = parseSlotTimeRange(slot);
  if (!range) return false;

  // For multi-hour broad shifts (> 2h, e.g. 8 AM - 12 PM), permit booking until end of shift.
  // For standard hourly sessions (e.g. 7:30 AM - 8:30 AM), slot expires at start time.
  const isBroadShift = range.endMinutes - range.startMinutes > 120;
  const cutoffMinutes = isBroadShift ? range.endMinutes : range.startMinutes;

  return pht.totalMinutes >= cutoffMinutes;
}

/**
 * Returns true if all provided time slots have expired for the target date.
 */
export function areAllSlotsExpired(slots, targetDateStr) {
  if (!slots || slots.length === 0 || !targetDateStr) return false;
  return slots.every((slot) => isSlotExpired(slot, targetDateStr));
}

/**
 * Synthesizes a clean ₱0 hospital triage chime using Web Audio API for incoming messages.
 * Safe for SSR (no-op if window/AudioContext is unavailable).
 */
export function playConsultationChime(isUrgent = false) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    if (isUrgent) {
      // Two-tone rapid warning chime (880Hz to 1174Hz)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Pleasant triage notification chime (587Hz to 880Hz)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Non-blocking fallback for autoplay restrictions
  }
}

/**
 * Returns dynamic relative elapsed time in Philippine Standard Time (e.g. "Just now", "5m ago", "2h ago", "Yesterday").
 */
export function formatRelativeConsultationTime(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Formats calendar day dividers for chat streams in Philippine Standard Time.
 * Returns "Today", "Yesterday", or formatted date string (e.g. "October 12, 2026").
 */
export function formatMessageDateDivider(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const msgDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

    const todayStr = getClinicTodayDateString();
    const yesterdayStr = getClinicDateOffset(-1);

    if (msgDateStr === todayStr) return "Today";
    if (msgDateStr === yesterdayStr) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}



