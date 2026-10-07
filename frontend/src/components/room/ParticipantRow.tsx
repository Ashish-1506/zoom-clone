"use client";

import { Hand, MoreVertical, Mic, MicOff, Video, VideoOff } from "lucide-react";

import { Avatar } from "@/components/ui";
import type { Participant } from "@/lib/types";

interface ParticipantRowProps {
  participant: Participant;
  currentParticipantId: number;
  isHost: boolean;
  menuOpen: boolean;
  onMute: () => void;
  onToggleMenu: () => void;
  onLowerHand: () => void;
  onRemove: () => void;
}

export function ParticipantRow({
  participant,
  currentParticipantId,
  isHost,
  menuOpen,
  onMute,
  onToggleMenu,
  onLowerHand,
  onRemove,
}: ParticipantRowProps) {
  const isMe = participant.id === currentParticipantId;

  return (
    <div className="group relative flex items-center gap-3 rounded-md px-2 py-3 hover:bg-zoom-bg">
      <Avatar name={participant.display_name} size="sm" color="#0B5CFF" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{participant.display_name}</p>
        <p className="text-xs text-zoom-muted">
          {participant.role === "host" ? "(Host)" : ""} {isMe ? "(Me)" : ""}
        </p>
      </div>
      {participant.hand_raised && (
        <Hand className="size-4 shrink-0 text-amber-500" aria-label="Hand raised" />
      )}
      <div className="flex items-center gap-1 text-zoom-muted">
        {participant.is_muted ? (
          <MicOff className="size-4 text-zoom-red" />
        ) : (
          <Mic className="size-4" />
        )}
        {participant.is_video_on ? (
          <Video className="size-4" />
        ) : (
          <VideoOff className="size-4" />
        )}
      </div>
      {isHost && !isMe && (
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 bg-white pl-2 md:hidden md:group-hover:flex">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-zoom-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
            onClick={onMute}
          >
            {participant.is_muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            aria-label="More participant actions"
            title="More participant actions"
            className="min-h-11 min-w-11 rounded p-1 hover:bg-zoom-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
            onClick={onToggleMenu}
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 min-w-32 rounded border border-zoom-border bg-white p-1 shadow">
              {participant.hand_raised && (
                <button
                  type="button"
                  className="min-h-10 w-full rounded px-3 text-left text-xs hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
                  onClick={onLowerHand}
                >
                  Lower hand
                </button>
              )}
              <button
                type="button"
                className="min-h-10 w-full rounded px-3 text-left text-xs text-zoom-red hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
                onClick={onRemove}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
