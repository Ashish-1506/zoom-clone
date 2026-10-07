"use client";

import { cn } from "@/lib/utils";
import type { FloatingReaction, Participant } from "@/lib/types";
import type { UserSettings } from "@/lib/types";

import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  participants: Participant[];
  localStream?: MediaStream | null;
  remoteStreams?: Map<number, MediaStream>;
  localParticipantId?: number;
  screenStream?: MediaStream | null;
  onStopScreenShare?: () => void;
  view: "speaker" | "gallery";
  activeParticipantId?: number;
  reactions?: Record<number, FloatingReaction>;
  mirrorLocalVideo?: boolean;
  virtualBackground?: UserSettings["virtual_background"];
  displayParticipantNames?: boolean;
  speakerDeviceId?: string;
  onAudioOutputError?: (message: string) => void;
}

export function VideoGrid({
  participants,
  localStream,
  remoteStreams = new Map(),
  localParticipantId,
  screenStream,
  onStopScreenShare,
  view,
  activeParticipantId,
  reactions = {},
  mirrorLocalVideo = true,
  virtualBackground = "none",
  displayParticipantNames = true,
  speakerDeviceId = "",
  onAudioOutputError,
}: VideoGridProps) {
  const [featured, ...others] = participants;

  if (screenStream) {
    return (
      <div className="relative min-h-0 flex-1 p-3">
        <video
          ref={(element) => {
            if (element && element.srcObject !== screenStream) element.srcObject = screenStream;
          }}
          autoPlay
          muted
          playsInline
          className="size-full rounded-lg object-contain"
          aria-label="Shared screen"
        />
        <div className="absolute left-6 top-6 flex items-center gap-3 rounded-md bg-black/70 px-3 py-2 text-sm">
          <span>You are sharing your screen</span>
          <button type="button" onClick={onStopScreenShare} className="rounded bg-zoom-red px-3 py-1 text-xs font-bold">
            Stop share
          </button>
        </div>
      </div>
    );
  }

  if (view === "speaker" && featured) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row">
        <div className="min-h-0 flex-1">
          <VideoTile
            participant={featured}
            stream={featured.id === localParticipantId ? localStream : remoteStreams.get(featured.id)}
            local={featured.id === localParticipantId}
            muted={featured.id === localParticipantId}
            active={featured.id === activeParticipantId}
            reaction={reactions[featured.id]}
            mirror={featured.id !== localParticipantId || mirrorLocalVideo}
            background={featured.id === localParticipantId ? virtualBackground : "none"}
            showName={displayParticipantNames}
            speakerDeviceId={speakerDeviceId}
            onAudioOutputError={onAudioOutputError}
          />
        </div>
        {others.length > 0 && (
          <div className="flex gap-3 overflow-x-auto sm:w-44 sm:flex-col sm:overflow-y-auto">
            {others.map((participant) => (
              <div key={participant.id} className="h-28 min-w-44 sm:h-28 sm:min-w-0">
                <VideoTile
                  participant={participant}
                  stream={remoteStreams.get(participant.id)}
                  active={participant.id === activeParticipantId}
                  reaction={reactions[participant.id]}
                  mirror={participant.id !== localParticipantId || mirrorLocalVideo}
                  background={participant.id === localParticipantId ? virtualBackground : "none"}
                  showName={displayParticipantNames}
                  speakerDeviceId={speakerDeviceId}
                  onAudioOutputError={onAudioOutputError}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-2 sm:p-3 md:overflow-hidden",
        participants.length === 1 && "grid-cols-1",
        participants.length === 2 && "md:grid-cols-2",
        participants.length >= 3 && participants.length <= 4 && "md:grid-cols-2",
        participants.length >= 5 && "md:grid-cols-3",
      )}
    >
      {participants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          stream={participant.id === localParticipantId ? localStream : remoteStreams.get(participant.id)}
          local={participant.id === localParticipantId}
          muted={participant.id === localParticipantId}
          active={participant.id === activeParticipantId}
          reaction={reactions[participant.id]}
          mirror={participant.id !== localParticipantId || mirrorLocalVideo}
          background={participant.id === localParticipantId ? virtualBackground : "none"}
          showName={displayParticipantNames}
          speakerDeviceId={speakerDeviceId}
          onAudioOutputError={onAudioOutputError}
        />
      ))}
    </div>
  );
}
