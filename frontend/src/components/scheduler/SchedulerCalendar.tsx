"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function SchedulerCalendar({
  month,
  selectedDate,
  availableDays,
  onMonthChange,
  onSelectDate,
}: {
  month: Date;
  selectedDate: Date;
  availableDays: number[];
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - mondayOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          title="Previous month"
          disabled={month <= currentMonth}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="flex size-11 items-center justify-center rounded hover:bg-zoom-bg disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        ><ChevronLeft className="size-5" /></button>
        <p className="font-bold text-zoom-text">{month.toLocaleDateString([], { month: "long", year: "numeric" })}</p>
        <button type="button" aria-label="Next month" title="Next month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-11 items-center justify-center rounded hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs" aria-label="Choose an available date">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <span key={`${label}-${index}`} className="py-2 font-bold text-zoom-muted">{label}</span>)}
        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const weekday = (day.getDay() + 6) % 7;
          const disabled = day < today || !isCurrentMonth || !availableDays.includes(weekday);
          const active = dateKey(day) === dateKey(selectedDate);
          return (
            <button
              key={dateKey(day)}
              type="button"
              disabled={disabled}
              aria-label={day.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              aria-pressed={active}
              onClick={() => onSelectDate(day)}
              className={`mx-auto flex size-10 items-center justify-center rounded-full font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${active ? "bg-zoom-blue text-white" : "text-zoom-text hover:bg-zoom-blue-light"} disabled:cursor-not-allowed disabled:text-zoom-border disabled:hover:bg-transparent`}
            >{day.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}
