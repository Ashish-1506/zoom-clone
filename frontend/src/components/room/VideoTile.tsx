"use client";

import { Hand, MicOff, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { FloatingReaction, Participant } from "@/lib/types";
import type { UserSettings } from "@/lib/types";

interface VideoTileProps {
  participant: Participant;
  stream?: MediaStream | null;
  active?: boolean;
  local?: boolean;
  muted?: boolean;
  reaction?: FloatingReaction;
  mirror?: boolean;
  background?: UserSettings["virtual_background"];
  showName?: boolean;
  speakerDeviceId?: string;
  onAudioOutputError?: (message: string) => void;
}

export function VideoTile({
  participant,
  stream,
  active = false,
  local = false,
  muted = local,
  reaction,
  mirror = true,
  background = "none",
  showName = true,
  speakerDeviceId = "",
  onAudioOutputError,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream ?? null;
    if (!muted && stream) {
      void video.play().then(
        () => setAudioBlocked(false),
        () => setAudioBlocked(true),
      );
    }
    if (!speakerDeviceId || typeof video.setSinkId !== "function") return;
    void video.setSinkId(speakerDeviceId).catch(() => {
      onAudioOutputError?.("Unable to use the selected speaker.");
    });
  }, [muted, onAudioOutputError, speakerDeviceId, stream]);

  const showVideo = participant.is_video_on && Boolean(stream);

  return (
    <div
      className={cn(
        "relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg transition-colors",
        active && "ring-2 ring-zoom-blue ring-inset",
        background === "gradient-1" && "bg-gradient-to-br from-blue-500 to-cyan-300",
        background === "gradient-2" && "bg-gradient-to-br from-violet-700 to-fuchsia-300",
        background === "gradient-3" && "bg-gradient-to-br from-orange-500 to-pink-400",
        background === "gradient-4" && "bg-gradient-to-br from-emerald-600 to-teal-200",
        (background === "none" || background === "blur") && "bg-[#111]",
      )}
    >
      {participant.hand_raised && (
        <div
          aria-label={`${participant.display_name} raised their hand`}
          title="Hand raised"
          className="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-amber-400 text-black shadow"
        >
          <Hand className="size-5" />
        </div>
      )}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          muted={muted || audioBlocked}
          playsInline
          className={cn(
            showVideo ? "size-full" : "absolute size-px opacity-0",
            "object-cover",
            local && mirror && "mirror-video",
            local && background === "blur" && "blur-[1px]",
          )}
          aria-label={`${participant.display_name} video`}
        />
      )}
      {!showVideo && (
        <Avatar
          name={participant.display_name}
          color="#0B5CFF"
          size="lg"
          className="size-20 text-2xl sm:size-24 sm:text-3xl"
        />
      )}
      {audioBlocked && !muted && stream && (
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = false;
            void video.play().then(
              () => setAudioBlocked(false),
              () => {
                video.muted = true;
                onAudioOutputError?.("Unable to play participant audio.");
              },
            );
          }}
          className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-xs text-white"
          aria-label={`Enable audio from ${participant.display_name}`}
        >
          <Volume2 className="size-4" />
          Click to hear
        </button>
      )}
      {reaction && (
        <span
          key={reaction.key}
          aria-label="Participant reaction"
          className="reaction-float pointer-events-none absolute bottom-14 left-4 z-10 text-5xl drop-shadow-lg"
        >
          {reaction.emoji}
        </span>
      )}
      {showName && <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/55 px-3 py-2 text-sm text-white">
        {participant.is_muted && (
          <MicOff className="size-4 text-white/90" aria-label="Muted" />
        )}
        <span className="truncate">{participant.display_name}</span>
      </div>}
    </div>
  );
}
