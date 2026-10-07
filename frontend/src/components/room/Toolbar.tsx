"use client";

import {
  Camera,
  ChevronUp,
  Circle,
  Mic,
  MonitorUp,
  MoreHorizontal,
  MessageSquareText,
  Smile,
  Users,
  VideoOff,
  MicOff,
} from "lucide-react";
import { useState } from "react";
import type { ReactionName } from "@/lib/types";
import { EndMeetingControl } from "./EndMeetingControl";
import { ReactionPopover } from "./ReactionPopover";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarMoreMenu } from "./ToolbarMoreMenu";

interface ToolbarProps {
  isHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  participantCount: number;
  endMenuOpen: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onParticipants: () => void;
  onChat: () => void;
  onEndMenu: () => void;
  onEndMeeting: () => void;
  onLeave: () => void;
  onRecordToggle: () => void;
  isRecording: boolean;
  onShareScreen: () => void;
  onOpenWhiteboard: () => void;
  onReaction: (reaction: ReactionName) => void;
  onToggleHand: () => void;
  isSharingScreen: boolean;
  unreadChatCount: number;
  chatEnabled: boolean;
  confirmLeave: boolean;
}

export function Toolbar({
  isHost,
  isMuted,
  isVideoOn,
  isHandRaised,
  participantCount,
  endMenuOpen,
  onToggleMute,
  onToggleVideo,
  onParticipants,
  onChat,
  onEndMenu,
  onEndMeeting,
  onLeave,
  onRecordToggle,
  isRecording,
  onShareScreen,
  onOpenWhiteboard,
  onReaction,
  onToggleHand,
  isSharingScreen,
  unreadChatCount,
  chatEnabled,
  confirmLeave,
}: ToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  return (
    <div className="relative flex h-[72px] shrink-0 items-center justify-between bg-room-toolbar px-1 sm:px-5">
      <div className="flex items-center gap-1">
        <ToolbarButton label={isMuted ? "Unmute" : "Mute"} onClick={onToggleMute}>
          {isMuted ? <MicOff className="size-5 text-zoom-red" /> : <Mic className="size-5" />}
          <ChevronUp className="absolute bottom-7 right-1 size-3" />
        </ToolbarButton>
        <ToolbarButton label={isVideoOn ? "Stop Video" : "Start Video"} onClick={onToggleVideo}>
          {isVideoOn ? <Camera className="size-5" /> : <VideoOff className="size-5 text-zoom-red" />}
          <ChevronUp className="absolute bottom-7 right-1 size-3" />
        </ToolbarButton>
      </div>
      <div className="flex items-center gap-1">
        <ToolbarButton label="Participants" badge={participantCount} onClick={onParticipants}>
          <Users className="size-5" />
        </ToolbarButton>
        <ToolbarButton label={chatEnabled ? "Chat" : "Chat disabled"} badge={unreadChatCount || undefined} onClick={onChat} disabled={!chatEnabled}>
          <MessageSquareText className="size-5" />
        </ToolbarButton>
        <div className="hidden md:flex">
        <div className="relative">
          <ToolbarButton label="Share Screen" onClick={() => setShareMenuOpen((open) => !open)}>
            <MonitorUp className="size-5 text-zoom-green" />
          </ToolbarButton>
          {shareMenuOpen && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-48 rounded-lg bg-white p-1 text-zoom-text shadow-xl">
              <button type="button" className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue" onClick={() => { setShareMenuOpen(false); onShareScreen(); }}>
                {isSharingScreen ? "Stop share" : "Share Screen"}
              </button>
              <button type="button" className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue" onClick={() => { setShareMenuOpen(false); onOpenWhiteboard(); }}>
                Whiteboard
              </button>
            </div>
          )}
        </div>
        <ToolbarButton label={isRecording ? "Stop recording" : "Record"} onClick={onRecordToggle}>
          <Circle className={`size-5 ${isRecording ? "fill-zoom-red text-zoom-red" : ""}`} />
        </ToolbarButton>
        <div className="relative">
          <ToolbarButton
            label="Reactions"
            onClick={() => setReactionsOpen((open) => !open)}
          >
            <Smile className="size-5" />
          </ToolbarButton>
          {reactionsOpen && (
            <ReactionPopover
              handRaised={isHandRaised}
              onReaction={onReaction}
              onToggleHand={onToggleHand}
              onClose={() => setReactionsOpen(false)}
            />
          )}
        </div>
        </div>
        <div className="relative md:hidden">
          <ToolbarButton label="More" onClick={() => setMoreOpen((open) => !open)}>
            <MoreHorizontal className="size-5" />
          </ToolbarButton>
          {moreOpen && (
            <ToolbarMoreMenu
              onShareScreen={onShareScreen}
              onWhiteboard={onOpenWhiteboard}
              onRecordToggle={onRecordToggle}
              isRecording={isRecording}
              onReactions={() => setReactionsOpen(true)}
              onClose={() => setMoreOpen(false)}
            />
          )}
          {reactionsOpen && (
            <ReactionPopover
              handRaised={isHandRaised}
              onReaction={onReaction}
              onToggleHand={onToggleHand}
              onClose={() => setReactionsOpen(false)}
            />
          )}
        </div>
      </div>
      <EndMeetingControl
        isHost={isHost}
        menuOpen={endMenuOpen}
        onToggleMenu={onEndMenu}
        onEndMeeting={onEndMeeting}
        onLeave={onLeave}
        confirmLeave={confirmLeave}
      />
    </div>
  );
}
