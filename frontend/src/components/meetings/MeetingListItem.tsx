"use client";

import { useState } from "react";
import { Copy, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui";
import { formatDateLong, formatDuration, formatTime } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

interface MeetingListItemProps {
  meeting: Meeting;
  previous?: boolean;
  onStart?: (meeting: Meeting) => void;
  onInvite?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
}

export function MeetingListItem({
  meeting,
  previous = false,
  onStart,
  onInvite,
  onDelete,
}: MeetingListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const date = meeting.start_time ?? meeting.ended_at ?? new Date().toISOString();
  const timeRange = meeting.start_time
    ? `${formatTime(meeting.start_time)} - ${formatTime(new Date(new Date(meeting.start_time).getTime() + meeting.duration_minutes * 60000))}`
    : "Instant meeting";

  return (
    <div className="relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full shrink-0 text-sm font-bold text-zoom-text sm:w-40">
        {previous ? formatDateLong(date) : timeRange}
        {previous && <span className="mt-1 block text-xs font-normal text-zoom-muted">{formatTime(date)}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-zoom-text">{meeting.title}</p>
        <p className="mt-1 text-xs text-zoom-muted">Meeting ID: {meeting.formatted_meeting_code}</p>
      </div>
      {previous ? (
        <p className="shrink-0 text-sm text-zoom-muted">{formatDuration(meeting.duration_minutes)}</p>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {onStart && <Button size="sm" className="min-h-11 sm:min-h-0" onClick={() => onStart(meeting)}>Start</Button>}
          {onInvite && <Button variant="secondary" size="sm" className="hidden min-h-11 sm:inline-flex sm:min-h-0" onClick={() => onInvite(meeting)}>
            <Copy className="size-4" aria-hidden="true" /> <span className="hidden lg:inline">Copy invitation</span>
          </Button>}
          {onDelete && <div className="relative">
            <button
              type="button"
              aria-label={`More options for ${meeting.title}`}
              title="More actions"
              className="min-h-11 min-w-11 rounded-md p-2 text-zoom-muted hover:bg-zoom-bg hover:text-zoom-text"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-28 rounded-md border border-zoom-border bg-white p-1 shadow-lg">
                <button type="button" className="w-full rounded px-3 py-2 text-left text-sm text-zoom-red hover:bg-zoom-bg" onClick={() => { setMenuOpen(false); onDelete(meeting); }}>Delete</button>
                </div>
            )}
          </div>
            }
        </div>
      )}
    </div>
  );
}
