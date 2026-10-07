import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Button, EmptyState, Skeleton } from "@/components/ui";
import { formatDuration, formatTime } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

interface UpcomingListProps {
  meetings: Meeting[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onStart: (meeting: Meeting) => void;
}

export function UpcomingList({
  meetings,
  loading,
  error,
  onRetry,
  onStart,
}: UpcomingListProps) {
  const today = new Date();
  const todaysMeetings = meetings
    .filter((meeting) => {
      if (!meeting.start_time) return false;
      const date = new Date(meeting.start_time);
      return date.toDateString() === today.toDateString();
    })
    .slice(0, 4);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-zoom-text">Upcoming meetings</h2>
        <Link href="/meetings" className="text-sm font-bold text-zoom-blue hover:text-zoom-blue-dark">
          View all meetings
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3 rounded-xl border border-zoom-border bg-white p-4">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-zoom-border bg-white p-6 text-center">
          <p className="text-sm text-zoom-red">{error.message}</p>
          <Button className="mt-3" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      ) : todaysMeetings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" aria-hidden="true" />}
          title="No meetings scheduled for today"
          text="Your next meetings will appear here."
        />
      ) : (
        <div className="divide-y divide-zoom-border rounded-xl border border-zoom-border bg-white">
          {todaysMeetings.map((meeting) => (
            <div key={meeting.id} className="flex min-h-16 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
              <div className="w-20 shrink-0 text-xs font-bold text-zoom-muted sm:w-24">
                <span>{formatTime(meeting.start_time ?? "")}</span>
                <span className="block">· {formatDuration(meeting.duration_minutes)}</span>
              </div>
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-zoom-text">{meeting.title}</p>
              <Button size="sm" onClick={() => onStart(meeting)}>Start</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
