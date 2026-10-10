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

