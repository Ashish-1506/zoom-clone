import { CalendarClock } from "lucide-react";

import { EmptyState } from "@/components/ui";
import type { SchedulerBooking } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short", month: "short", day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric", minute: "2-digit",
});

export function SchedulerBookings({
  bookings,
  linkTitles,
}: {
  bookings: SchedulerBooking[];
  linkTitles: Map<number, string>;
}) {
  if (!bookings.length) {
    return <EmptyState icon={<CalendarClock className="size-6" />} title="No upcoming bookings" text="Bookings made through your scheduling links will show up here." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zoom-border bg-white">
      <div className="hidden grid-cols-[1.5fr_1fr_1.2fr_0.5fr] gap-4 border-b border-zoom-border bg-zoom-bg px-5 py-3 text-xs font-bold uppercase tracking-wide text-zoom-muted md:grid">
        <span>Guest</span><span>Event</span><span>Date and time</span><span>Length</span>
      </div>
      <ul className="divide-y divide-zoom-border">
        {bookings.map((booking) => {
          const start = new Date(booking.start_time);
          const end = new Date(booking.end_time);
          const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
          return (
            <li key={booking.id} className="grid gap-2 px-5 py-4 md:grid-cols-[1.5fr_1fr_1.2fr_0.5fr] md:items-center md:gap-4">
              <div className="min-w-0"><p className="truncate text-sm font-bold text-zoom-text">{booking.guest_name}</p><p className="truncate text-xs text-zoom-muted">{booking.guest_email}</p></div>
              <p className="text-sm text-zoom-text">{linkTitles.get(booking.link_id) || "Meeting"}</p>
              <p className="text-sm text-zoom-text">{dateFormat.format(start)} · {timeFormat.format(start)}</p>
              <p className="text-xs text-zoom-muted">{minutes} min</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
