"use client";

import { useMeetingRecording } from "@/hooks/useMeetingRecording";
import { ChatPanel } from "./ChatPanel";
import type { MeetingRoomStageProps } from "./meetingRoomTypes";
import { MeetingRoomHeader } from "./MeetingRoomHeader";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { Toolbar } from "./Toolbar";
import { VideoGrid } from "./VideoGrid";
import { MeetingWhiteboardPanel } from "@/components/whiteboards/MeetingWhiteboardPanel";

export function MeetingRoomStage(props: MeetingRoomStageProps) {
  const recording = useMeetingRecording(props.localStream, props.onFeatureError);
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-room-bg text-white">
      <MeetingRoomHeader
        code={props.code}
        meeting={props.meeting}
        participant={props.session.participant}
        elapsed={props.elapsed}
        view={props.view}
        isHost={props.isHost}
        isRecording={recording.isRecording}
        recordingSeconds={recording.seconds}
        onRecordToggle={recording.toggle}
        onViewChange={props.onViewChange}
        onMeetingChange={props.onMeetingChange}
        onError={props.onFeatureError}
      />

      <VideoGrid
        participants={props.participants}
        localStream={props.localStream}
        remoteStreams={props.remoteStreams}
        reactions={props.reactions}
        mirrorLocalVideo={props.mirrorLocalVideo}
        virtualBackground={props.virtualBackground}
        displayParticipantNames={props.displayParticipantNames}
        speakerDeviceId={props.speakerDeviceId}
        onAudioOutputError={props.onAudioOutputError}
        localParticipantId={props.session.participant.id}
        screenStream={props.screenStream}
        onStopScreenShare={props.onToggleScreenShare}
        view={props.view}
        activeParticipantId={props.session.participant.id}
      />

      {props.mediaError && !props.permissionDismissed && (
        <div role="alert" className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-3 rounded-md bg-white px-4 py-3 text-sm text-zoom-text shadow-xl">
          <span>{props.mediaError}</span>
          <button
            type="button"
            className="min-h-11 font-bold text-zoom-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
            onClick={props.onDismissPermissionError}
          >
            Dismiss
          </button>
        </div>
      )}
      <Toolbar
        isHost={props.isHost}
        isMuted={props.session.participant.is_muted}
        isVideoOn={props.session.isVideoOn}
        isHandRaised={props.session.participant.hand_raised}
        participantCount={props.participants.length}
        endMenuOpen={props.endMenuOpen}
        onToggleMute={props.onToggleMute}
        onToggleVideo={props.onToggleVideo}
        onParticipants={props.onParticipants}
        onChat={props.onChat}
        onEndMenu={props.onEndMenu}
        onEndMeeting={props.onEndMeeting}
        onLeave={props.onLeave}
        onShareScreen={props.onToggleScreenShare}
        onOpenWhiteboard={props.onOpenWhiteboard}
        onReaction={props.onReaction}
        onToggleHand={props.onToggleHand}
        isSharingScreen={Boolean(props.screenStream)}
        confirmLeave={props.confirmLeave}
        unreadChatCount={props.unreadChatCount}
        chatEnabled={props.chatEnabled}
        onRecordToggle={recording.toggle}
        isRecording={recording.isRecording}
      />
      {props.activePanel === "Participants" && (
        <ParticipantsPanel
          code={props.code}
          meeting={props.meeting}
          currentParticipant={props.session.participant}
          isHost={props.isHost}
          onClose={props.onPanelClose}
          onParticipantsChange={props.onParticipantsChange}
          onRemoved={props.onRemoved}
          onHostMute={props.onHostMute}
          onLowerHand={props.onLowerHand}
        />
      )}
      {props.activePanel === "Chat" && (
        <ChatPanel
          code={props.code}
          currentParticipant={props.session.participant}
          onClose={props.onPanelClose}
          onUnreadChange={props.onUnreadChange}
          onLastMessageIdChange={props.onLastMessageIdChange}
        />
      )}
      {props.activePanel === "Whiteboard" && (
        <MeetingWhiteboardPanel
          code={props.code}
          participantId={props.session.participant.id}
          onClose={props.onPanelClose}
        />
      )}
    </main>
  );
}
