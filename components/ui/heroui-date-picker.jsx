"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HeroUIDatePicker({
  label = "Date",
  value = "", // ISO string YYYY-MM-DD or null
  defaultValue = null,
  minDate = null, // ISO string YYYY-MM-DD
  maxDate = null,
  description,
  disabled = false,
  invalid = false,
  required = false,
  minWidth = "w-full",
  placement = "bottom", // "bottom" | "top" | "right"
  customIndicator,
  onChange,
  className,
  blockedDates = [],
  blockSaturday = false,
  blockSunday = false,
}) {
  // Parse initial date
  const parseIso = (isoStr) => {
    if (!isoStr) return null;
    try {
      const [y, m, d] = isoStr.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    } catch {}
    return null;
  };

  const initialDate = parseIso(value) || parseIso(defaultValue);
  const [selectedDate, setSelectedDate] = React.useState(initialDate);
  const [viewDate, setViewDate] = React.useState(initialDate || new Date());
  const [open, setOpen] = React.useState(false);
  const [yearMode, setYearMode] = React.useState(false);

  const containerRef = React.useRef(null);

  // Sync with controlled value changes
  React.useEffect(() => {
    if (value !== undefined) {
      const parsed = parseIso(value);
      setSelectedDate(parsed);
      if (parsed) setViewDate(parsed);
    }
  }, [value]);

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setYearMode(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Calendar calculations for current viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const selectDay = (day) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const isoString = `${y}-${m}-${d}`;

    setSelectedDate(newDate);
    setOpen(false);
    setYearMode(false);
    onChange?.(isoString);
  };

  const selectYear = (yr) => {
    setViewDate(new Date(yr, viewMonth, 1));
    setYearMode(false);
  };

  const isDayDisabled = (day) => {
    const dateObj = new Date(viewYear, viewMonth, day);
    const dayOfWeek = dateObj.getDay();
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;

    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    if (dayOfWeek === 6 && blockSaturday) return true;
    if (dayOfWeek === 0 && blockSunday) return true;
    if (blockedDates.includes(iso)) return true;
    return false;
  };

  const displayString = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Select date...";

  // Build grid of days (prev month filler, current month days, next month filler)
  const calendarCells = [];
  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      outside: true,
    });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      outside: false,
      selected:
        selectedDate &&
        selectedDate.getFullYear() === viewYear &&
        selectedDate.getMonth() === viewMonth &&
        selectedDate.getDate() === i,
      disabled: isDayDisabled(i),
    });
  }
  // Next month padding to fill grid
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    calendarCells.push({
      day: i,
      outside: true,
    });
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex flex-col gap-1.5 font-sans", minWidth, className)}
    >
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
      )}

      {/* Input Group Trigger */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-sm transition-all cursor-pointer outline-none select-none",
          open && "border-rose-500 ring-2 ring-rose-200/80 shadow-md",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
          invalid && "border-red-500 ring-2 ring-red-200"
        )}
      >
        <span
          className={cn(
            "font-semibold text-sm",
            selectedDate ? "text-slate-900 font-serif" : "text-slate-400 font-normal"
          )}
        >
          {displayString}
        </span>

        <div className="flex items-center gap-1.5 text-rose-500">
          {customIndicator || <CalendarIcon className="w-4 h-4" />}
        </div>
      </div>

      {description && <span className="text-xs text-slate-500">{description}</span>}

      {/* Popover Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-[100] w-72 sm:w-80 rounded-3xl bg-white p-4 shadow-2xl border-2 border-rose-100 ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150",
            placement === "top"
              ? "bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2"
              : placement === "right"
              ? "sm:top-0 sm:left-[calc(100%+0.75rem)] bottom-[calc(100%+0.5rem)] left-0 sm:bottom-auto"
              : "top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setYearMode(!yearMode)}
              className="flex items-center gap-1 font-serif font-bold text-sm text-slate-900 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Year Picker Grid (Modal inside popover) */}
          {yearMode ? (
            <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto p-1">
              {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 1 + i).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => selectYear(yr)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold transition-all",
                    yr === viewYear
                      ? "bg-rose-500 text-white shadow-sm"
                      : "hover:bg-rose-50 text-slate-700"
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center mb-1">
                {WEEK_DAYS.map((wd) => (
                  <span key={wd} className="text-[11px] font-bold text-slate-400 py-1">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  if (cell.outside) {
                    return (
                      <div
                        key={idx}
                        className="h-8 flex items-center justify-center text-xs text-slate-300 pointer-events-none"
                      >
                        {cell.day}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={cell.disabled}
                      onClick={() => !cell.disabled && selectDay(cell.day)}
                      className={cn(
                        "h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative",
                        cell.disabled && "opacity-30 text-slate-400 cursor-not-allowed line-through",
                        cell.selected &&
                          "bg-rose-500 text-white shadow-md shadow-rose-200 font-extrabold scale-105",
                        !cell.selected &&
                          !cell.disabled &&
                          "text-slate-800 hover:bg-rose-50 hover:text-rose-600"
                      )}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { HeroUIDatePicker as DatePicker };
