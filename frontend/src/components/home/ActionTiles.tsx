"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, LoaderCircle, Plus, Video } from "lucide-react";

import { cn } from "@/lib/utils";

export type NewMeetingOption =
  | "video-on"
  | "video-off"
  | "personal-meeting-id";

interface ActionTilesProps {
  onNewMeeting: (option: NewMeetingOption) => void;
  onJoin: () => void;
  onSchedule: () => void;
  creating?: boolean;
}

const tileClass =
  "relative flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2";

export function ActionTiles({
  onNewMeeting,
  onJoin,
  onSchedule,
  creating = false,
}: ActionTilesProps) {
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="relative">
        <button
          type="button"
          className={cn(tileClass, "w-full bg-zoom-orange")}
          onClick={() => onNewMeeting("video-on")}
          disabled={creating}
        >
          {creating ? (
            <LoaderCircle className="size-9 animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Video className="size-9" strokeWidth={1.8} aria-hidden="true" />
          )}
          <span className="text-sm font-bold">New meeting</span>
        </button>
        <button
          type="button"
          className="absolute bottom-2 right-2 min-h-11 min-w-11 rounded p-1 text-white hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setNewMeetingOpen((open) => !open)}
          disabled={creating}
          aria-expanded={newMeetingOpen}
          aria-haspopup="menu"
          aria-label="New meeting options"
          title="New meeting options"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
        {newMeetingOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-zoom-border bg-white p-1.5 shadow-lg">
            {[
              ["video-on", "Start with video on"],
              ["video-off", "Start with video off"],
              ["personal-meeting-id", "Use personal meeting ID"],
            ].map(([option, label]) => (
              <button
                key={option}
                type="button"
                className="min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-zoom-text hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
                onClick={() => {
                  onNewMeeting(option as NewMeetingOption);
                  setNewMeetingOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={cn(tileClass, "bg-zoom-blue")} onClick={onJoin}>
        <Plus className="size-9" strokeWidth={1.8} aria-hidden="true" />
        <span className="text-sm font-bold">Join</span>
      </button>
      <button type="button" className={cn(tileClass, "bg-zoom-blue")} onClick={onSchedule}>
        <CalendarDays className="size-9" strokeWidth={1.8} aria-hidden="true" />
        <span className="text-sm font-bold">Schedule</span>
      </button>
    </div>
  );
}
