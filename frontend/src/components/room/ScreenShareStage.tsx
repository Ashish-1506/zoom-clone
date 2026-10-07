"use client";

import { useEffect, useRef } from "react";

import type { FloatingReaction, Participant } from "@/lib/types";
import type { UserSettings } from "@/lib/types";
import { VideoTile } from "./VideoTile";

interface ScreenShareStageProps {
  stream: MediaStream | null;
  sharerName: string;
  isLocalSharer: boolean;
  onStopSharing?: () => void;
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  localParticipantId: number;
  reactions: Record<number, FloatingReaction>;
  mirrorLocalVideo: boolean;
  virtualBackground: UserSettings["virtual_background"];
  displayParticipantNames: boolean;
  speakerDeviceId: string;
  onAudioOutputError?: (message: string) => void;
}

export function ScreenShareStage({
  stream,
  sharerName,
  isLocalSharer,
  onStopSharing,
  participants,
  localStream,
  remoteStreams,
  localParticipantId,
  reactions,
  mirrorLocalVideo,
  virtualBackground,
  displayParticipantNames,
  speakerDeviceId,
  onAudioOutputError,
}: ScreenShareStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3 md:flex-row">
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="size-full object-contain"
            aria-label={`${sharerName} shared screen`}
          />
        ) : (
          <p className="px-4 text-center text-sm text-white/75">
            Connecting to {sharerName}&apos;s shared screen...
          </p>
        )}
        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2 sm:inset-x-4 sm:top-4">
          <span className="max-w-[70%] truncate rounded-md bg-black/75 px-3 py-2 text-xs text-white sm:text-sm">
            {isLocalSharer ? "You are sharing your screen" : `${sharerName} is sharing`}
          </span>
          {isLocalSharer && onStopSharing && (
            <button
              type="button"
              onClick={onStopSharing}
              className="min-h-10 rounded-md bg-zoom-red px-3 py-2 text-xs font-bold text-white sm:text-sm"
            >
              Stop share
            </button>
          )}
        </div>
      </div>
      <div className="flex h-[5.5rem] shrink-0 gap-2 overflow-x-auto md:h-auto md:w-52 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {participants.map((participant) => {
          const isLocal = participant.id === localParticipantId;
          return (
            <div
              key={participant.id}
              className="h-[4.5rem] w-28 shrink-0 md:h-32 md:w-full"
            >
              <VideoTile
                participant={participant}
                stream={isLocal ? localStream : remoteStreams.get(participant.id)}
                local={isLocal}
                muted={isLocal}
                reaction={reactions[participant.id]}
                mirror={!isLocal || mirrorLocalVideo}
                background={isLocal ? virtualBackground : "none"}
                showName={displayParticipantNames}
                speakerDeviceId={speakerDeviceId}
                onAudioOutputError={onAudioOutputError}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
