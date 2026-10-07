"use client";

import { Link as LinkIcon, UserRound } from "lucide-react";

import { Button, EmptyState, Skeleton } from "@/components/ui";
import { MeetingListItem } from "@/components/meetings/MeetingListItem";
import type { Meeting } from "@/lib/types";

interface UpcomingContentProps {
  groups: Array<[string, Meeting[]]>;
  loading: boolean;
  error: Error | null;
  onRetry: () => Promise<void>;
  onStart: (meeting: Meeting) => void;
  onInvite: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
  onSchedule: () => void;
}

export function UpcomingContent(props: UpcomingContentProps) {
  if (props.loading) return <LoadingRows />;
  if (props.error) {
    return <ErrorPanel message={props.error.message} onRetry={props.onRetry} />;
  }
  if (props.groups.length === 0) {
    return (
      <EmptyState
        icon={<LinkIcon className="size-5" />}
        title="No upcoming meetings"
        text="Schedule a meeting to see it here."
        action={<Button onClick={props.onSchedule}>Schedule a meeting</Button>}
      />
    );
  }

  return (
    <div className="space-y-5">
      {props.groups.map(([label, meetings]) => (
        <div key={label}>
          <h2 className="mb-2 text-sm font-bold text-zoom-muted">{label}</h2>
          <div className="divide-y divide-zoom-border rounded-xl border border-zoom-border bg-white">
            {meetings.map((meeting) => (
              <MeetingListItem
                key={meeting.id}
                meeting={meeting}
                onStart={props.onStart}
                onInvite={props.onInvite}
                onDelete={props.onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PreviousContent({
  meetings,
  loading,
  error,
  onRetry,
}: {
  meetings: Meeting[];
  loading: boolean;
  error: Error | null;
  onRetry: () => Promise<void>;
}) {
  if (loading) return <LoadingRows />;
  if (error) return <ErrorPanel message={error.message} onRetry={onRetry} />;
  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={<UserRound className="size-5" />}
        title="No previous meetings"
        text="Your completed meetings will appear here."
      />
    );
  }
  return (
    <div className="divide-y divide-zoom-border rounded-xl border border-zoom-border bg-white">
      {meetings.map((meeting) => (
        <MeetingListItem
          key={meeting.id}
          meeting={meeting}
          previous
        />
      ))}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 rounded-xl border border-zoom-border bg-white p-4">
      {[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <div className="rounded-xl border border-zoom-border bg-white p-8 text-center">
      <p className="text-sm text-zoom-red">{message}</p>
      <Button className="mt-4" size="sm" onClick={() => void onRetry()}>Retry</Button>
    </div>
  );
}
