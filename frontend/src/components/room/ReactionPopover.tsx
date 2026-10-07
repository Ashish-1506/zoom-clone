"use client";

import { Hand } from "lucide-react";
import { useEffect } from "react";

import { REACTION_OPTIONS } from "@/lib/constants";
import type { ReactionName } from "@/lib/types";

interface ReactionPopoverProps {
  handRaised: boolean;
  onReaction: (reaction: ReactionName) => void;
  onToggleHand: () => void;
  onClose: () => void;
}

export function ReactionPopover({
  handRaised,
  onReaction,
  onToggleHand,
  onClose,
}: ReactionPopoverProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      aria-label="Reactions"
      className="absolute bottom-full right-0 z-30 mb-3 w-64 rounded-xl border border-zoom-border bg-white p-3 text-zoom-text shadow-2xl"
    >
      <div className="grid grid-cols-6 gap-1">
        {REACTION_OPTIONS.map((reaction) => (
          <button
            key={reaction.name}
            type="button"
            aria-label={reaction.label}
            title={reaction.label}
            onClick={() => onReaction(reaction.name)}
            className="flex size-10 items-center justify-center rounded-lg text-xl transition hover:scale-110 hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
          >
            {reaction.emoji}
          </button>
        ))}
      </div>
      <div className="my-2 border-t border-zoom-border" />
      <button
        type="button"
        onClick={onToggleHand}
        className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
      >
        <Hand className="size-4 text-amber-500" />
        {handRaised ? "Lower Hand" : "Raise Hand"}
        <span className="ml-auto text-xs font-normal text-zoom-muted">Alt+Y</span>
      </button>
    </div>
  );
}
