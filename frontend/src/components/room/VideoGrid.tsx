"use client";

import { cn } from "@/lib/utils";
import type { FloatingReaction, Participant } from "@/lib/types";
import type { UserSettings } from "@/lib/types";

import { ScreenShareStage } from "./ScreenShareStage";
import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  participants: Participant[];
  localStream?: MediaStream | null;
  remoteStreams?: Map<number, MediaStream>;
  remoteScreenStreams?: Map<number, MediaStream>;
  activeScreenSharerId?: number | null;
  localParticipantId: number;
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
  remoteScreenStreams = new Map(),
  activeScreenSharerId = null,
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
  const localSharing = Boolean(screenStream);
  const screenSharerId =
    activeScreenSharerId ?? (localSharing ? localParticipantId : null);

  if (screenSharerId !== null) {
    const isLocalSharer = localSharing && screenSharerId === localParticipantId;
    return (
      <ScreenShareStage
        stream={
          isLocalSharer
            ? (screenStream ?? null)
            : (remoteScreenStreams.get(screenSharerId) ?? null)
        }
        sharerName={
          participants.find((participant) => participant.id === screenSharerId)
            ?.display_name ?? "A participant"
        }
        isLocalSharer={isLocalSharer}
        onStopSharing={isLocalSharer ? onStopScreenShare : undefined}
        participants={participants}
        localStream={localStream ?? null}
        remoteStreams={remoteStreams}
        localParticipantId={localParticipantId}
        reactions={reactions}
        mirrorLocalVideo={mirrorLocalVideo}
        virtualBackground={virtualBackground}
        displayParticipantNames={displayParticipantNames}
        speakerDeviceId={speakerDeviceId}
        onAudioOutputError={onAudioOutputError}
      />
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
