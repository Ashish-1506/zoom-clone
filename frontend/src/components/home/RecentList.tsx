import Link from "next/link";
import { History } from "lucide-react";

import { Button, EmptyState, Skeleton } from "@/components/ui";
import { formatDateLong, formatDuration, formatTime } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

interface RecentListProps {
  meetings: Meeting[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function RecentList({ meetings, loading, error, onRetry }: RecentListProps) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-zoom-text">Recent meetings</h2>
        <Link href="/meetings" className="text-sm font-bold text-zoom-blue hover:text-zoom-blue-dark">View all</Link>
      </div>
      {loading ? (
        <div className="space-y-3 rounded-xl border border-zoom-border bg-white p-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-zoom-border bg-white p-6 text-center">
          <p className="text-sm text-zoom-red">{error.message}</p>
          <Button className="mt-3" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={<History className="size-5" aria-hidden="true" />}
          title="No recent meetings"
          text="Meetings you finish will appear here."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-zoom-border bg-white md:block">
            <table className="w-full text-left text-sm">
            <thead className="border-b border-zoom-border bg-zoom-bg text-xs font-bold uppercase tracking-wide text-zoom-muted">
              <tr>
                <th className="px-4 py-3">Meeting</th>
                <th className="px-4 py-3">Date and time</th>
                <th className="px-4 py-3">Meeting ID</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zoom-border">
              {meetings.slice(0, 5).map((meeting) => (
                <tr key={meeting.id} className="text-zoom-text">
                  <td className="px-4 py-3 font-bold">{meeting.title}</td>
                  <td className="px-4 py-3 text-zoom-muted">
                    {meeting.start_time ? `${formatDateLong(meeting.start_time)}, ${formatTime(meeting.start_time)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{meeting.formatted_meeting_code}</td>
                  <td className="px-4 py-3 text-zoom-muted">{formatDuration(meeting.duration_minutes)}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
          {meetings.slice(0, 5).map((meeting) => (
            <article key={meeting.id} className="rounded-xl border border-zoom-border bg-white p-4">
              <p className="font-bold text-zoom-text">{meeting.title}</p>
              <p className="mt-2 text-xs text-zoom-muted">{meeting.start_time ? `${formatDateLong(meeting.start_time)}, ${formatTime(meeting.start_time)}` : "—"}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zoom-muted">
                <span className="font-mono">{meeting.formatted_meeting_code}</span>
                <span>{formatDuration(meeting.duration_minutes)}</span>
              </div>
            </article>
          ))}
        </div>
        </>
      )}
    </section>
  );
}
