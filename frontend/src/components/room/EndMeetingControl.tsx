"use client";

import { PhoneOff } from "lucide-react";
import { useState } from "react";

import { Button, Modal } from "@/components/ui";

interface EndMeetingControlProps {
  isHost: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEndMeeting: () => void;
  onLeave: () => void;
  confirmLeave: boolean;
}

export function EndMeetingControl({
  isHost,
  menuOpen,
  onToggleMenu,
  onEndMeeting,
  onLeave,
  confirmLeave,
}: EndMeetingControlProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const requestLeave = () => {
    if (confirmLeave) setConfirmOpen(true);
    else onLeave();
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={isHost ? onToggleMenu : requestLeave}
        aria-label={isHost ? "End meeting" : "Leave meeting"}
        title={isHost ? "End meeting" : "Leave meeting"}
        className="flex min-h-11 items-center gap-2 rounded-md bg-zoom-red px-3 py-2 text-sm font-bold text-white hover:bg-[#b71e1e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-4"
      >
        <PhoneOff className="size-4" />
        <span className="hidden sm:inline">{isHost ? "End" : "Leave"}</span>
      </button>
      {isHost && menuOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-md border border-white/10 bg-white p-1 text-sm text-zoom-text shadow-xl">
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
            onClick={onEndMeeting}
          >
            End meeting for all
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
            onClick={requestLeave}
          >
            Leave meeting
          </button>
        </div>
      )}
      <Modal
        open={confirmOpen}
        title="Leave this meeting?"
        onClose={() => setConfirmOpen(false)}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Stay</Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              onLeave();
            }}
          >
            Leave meeting
          </Button>
        </div>
      </Modal>
    </div>
  );
}
