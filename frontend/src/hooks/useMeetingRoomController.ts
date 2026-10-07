"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { MeetingRoomStageProps } from "@/components/room/meetingRoomTypes";
import { useToast } from "@/components/ui";
import { useSettings } from "@/components/settings/SettingsProvider";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useMeetingRoomActions } from "@/hooks/useMeetingRoomActions";
import { useMeetingSession, type MeetingSession } from "@/hooks/useMeetingSession";
import { usePolling } from "@/hooks/usePolling";
import { useWebRTC } from "@/hooks/useWebRTC";
import {
  getMeeting,
  listChat,
  listParticipants,
  sendParticipantReaction,
  updateParticipantHand,
  updateMyMedia,
} from "@/lib/api";
import {
  CHAT_POLL_INTERVAL_SECONDS,
  APP_NAME,
  MEETING_TIMER_INTERVAL_MS,
  REACTION_DISPLAY_MS,
  REACTION_OPTIONS,
  ROOM_POLL_INTERVAL_SECONDS,
} from "@/lib/constants";
import type { FloatingReaction, Meeting, Participant, ReactionName } from "@/lib/types";

type MeetingRoomState =
  | { status: "loading" }
  | { status: "removed"; onBackToHome: () => void }
  | { status: "active"; stageProps: MeetingRoomStageProps };

export function useMeetingRoomController(code: string): MeetingRoomState {
  const router = useRouter();
  const { error, info, success } = useToast();
  const { readSession, writeSession, clearSession } = useMeetingSession();
  const { settings } = useSettings();
  const [session, setSession] = useState<MeetingSession | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [view, setView] = useState<"speaker" | "gallery">("gallery");
  const [endMenuOpen, setEndMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<Participant[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<
    Record<number, FloatingReaction>
  >({});
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const lastChatIdRef = useRef<number | undefined>(undefined);
  const [chatCursorReady, setChatCursorReady] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [permissionDismissed, setPermissionDismissed] = useState(false);
  const participantSnapshotRef = useRef(new Map<number, Participant>());
  const lastReactionAtRef = useRef(new Map<number, string | null>());
  const snapshotReadyRef = useRef(false);
  const reactionTimersRef = useRef(new Map<number, number>());
  const reactionKeyRef = useRef(0);
  const media = useMediaStream({
    enabled: Boolean(session),
    initialVideoEnabled: session?.isVideoOn ?? settings.start_video_on,
    initialAudioEnabled: session ? !session.participant.is_muted : !settings.mute_mic_on_join,
    videoDeviceId: settings.camera_device_id,
    audioDeviceId: settings.microphone_device_id,
  });

  useEffect(() => {
    document.title = meeting?.title
      ? `${meeting.title} | ${APP_NAME}`
      : `Meeting room | ${APP_NAME}`;
  }, [meeting?.title]);

  useEffect(() => {
    const stored = readSession(code);
    if (!stored) {
      router.replace(`/j/${encodeURIComponent(code)}`);
      return;
    }
    queueMicrotask(() => {
      setSession(stored);
      setRoomParticipants([stored.participant]);
    });
    void getMeeting(code)
      .then(setMeeting)
      .catch((caughtError: unknown) => {
        error(caughtError instanceof Error ? caughtError.message : "Unable to load meeting.");
      });
  }, [code, error, readSession, router]);

  const refreshUnread = useCallback(async () => {
    if (activePanel === "Chat" || !session || !chatCursorReady) return;
    try {
      const messages = await listChat(code, lastChatIdRef.current);
      if (messages.length > 0) {
        const latestId = messages[messages.length - 1].id;
        lastChatIdRef.current = latestId;
        const unread = messages.filter(
          (message) =>
            message.type === "user" &&
            message.participant_id !== session.participant.id,
        ).length;
        if (unread > 0) setUnreadChatCount((count) => count + unread);
      }
    } catch {
      // Chat errors are shown by ChatPanel when a user opens it.
    }
  }, [activePanel, chatCursorReady, code, session]);

  useEffect(() => {
    void listChat(code)
      .then((messages) => {
        const latestId = messages.at(-1)?.id;
        if (
          latestId !== undefined &&
          (lastChatIdRef.current === undefined || latestId > lastChatIdRef.current)
        ) {
          lastChatIdRef.current = latestId;
        }
        setChatCursorReady(true);
      })
      .catch((caughtError: unknown) => {
        error(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load chat messages.",
        );
      });
  }, [code, error]);
  usePolling(refreshUnread, CHAT_POLL_INTERVAL_SECONDS);

  useEffect(() => {
    if (!session) return;
    const joinedAt = new Date(session.participant.joined_at).getTime();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - joinedAt) / MEETING_TIMER_INTERVAL_MS)));
    };
    update();
    const timer = window.setInterval(update, MEETING_TIMER_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!media.stream || !session) return;
    media.stream.getVideoTracks().forEach((track) => {
      track.enabled = session.isVideoOn;
    });
  }, [media.stream, session]);

  useEffect(() => {
    const stopMedia = () => {
      media.stop();
      screenStream?.getTracks().forEach((track) => track.stop());
    };
    window.addEventListener("beforeunload", stopMedia);
    return () => window.removeEventListener("beforeunload", stopMedia);
  }, [media, screenStream]);

  const localParticipants = useMemo(
    () => (session ? [{ ...session.participant, is_video_on: session.isVideoOn }] : []),
    [session],
  );
  const isHost = session?.participant.role === "host";
  const remoteStreams = useWebRTC({
    code,
    participantId: session?.participant.id ?? null,
    localStream: media.stream,
  });

  const handleParticipantsChange = useCallback(
    (next: Participant[]) => {
      const isInitialSnapshot = !snapshotReadyRef.current;
      for (const participant of next) {
        const previous = participantSnapshotRef.current.get(participant.id);
        if (isInitialSnapshot) {
          lastReactionAtRef.current.set(
            participant.id,
            participant.last_reaction_at,
          );
        } else {
          const seenAt = lastReactionAtRef.current.get(participant.id) ?? null;
          if (
            participant.last_reaction_at &&
            (!seenAt ||
              Date.parse(participant.last_reaction_at) > Date.parse(seenAt))
          ) {
            lastReactionAtRef.current.set(
              participant.id,
              participant.last_reaction_at,
            );
            const option = REACTION_OPTIONS.find(
              (reaction) => reaction.name === participant.last_reaction,
            );
            if (option) {
              const reaction = {
                emoji: option.emoji,
                key: ++reactionKeyRef.current,
              };
              setFloatingReactions((current) => ({
                ...current,
                [participant.id]: reaction,
              }));
              const previousTimer = reactionTimersRef.current.get(participant.id);
              if (previousTimer !== undefined) window.clearTimeout(previousTimer);
              const timer = window.setTimeout(() => {
                setFloatingReactions((current) => {
                  if (current[participant.id]?.key !== reaction.key) return current;
                  const remaining = { ...current };
                  delete remaining[participant.id];
                  return remaining;
                });
                reactionTimersRef.current.delete(participant.id);
              }, REACTION_DISPLAY_MS);
              reactionTimersRef.current.set(participant.id, timer);
            }
          }
          if (
            isHost &&
            previous &&
            !previous.hand_raised &&
            participant.hand_raised &&
            participant.id !== session?.participant.id
          ) {
            info(`${participant.display_name} raised their hand`);
          }
        }
        participantSnapshotRef.current.set(participant.id, participant);
      }
      snapshotReadyRef.current = true;
      setRoomParticipants(next);
      const current = next.find((participant) => participant.id === session?.participant.id);
      if (!current || current.is_removed) {
        setRemoved(true);
        return;
      }
      if (session && current.is_muted && !session.participant.is_muted) {
        info("The host muted you");
      }
      if (
        session &&
        (current.is_muted !== session.participant.is_muted ||
          current.hand_raised !== session.participant.hand_raised)
      ) {
        setSession({ participant: current, isVideoOn: session.isVideoOn });
        writeSession(code, current, session.isVideoOn);
        if (current.is_muted) {
          media.stream?.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }
      }
    },
    [code, info, isHost, media.stream, session, writeSession],
  );

  useEffect(
    () => () => {
      reactionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      reactionTimersRef.current.clear();
    },
    [],
  );

  const refreshParticipants = useCallback(async () => {
    try {
      const next = await listParticipants(code);
      handleParticipantsChange(next);
    } catch {
      // The participants panel surfaces polling errors itself.
    }
  }, [code, handleParticipantsChange]);
  usePolling(refreshParticipants, ROOM_POLL_INTERVAL_SECONDS);

  const toggleHand = useCallback(async () => {
    if (!session) return;
    try {
      const participant = await updateParticipantHand(
        code,
        session.participant.id,
        session.participant.id,
        !session.participant.hand_raised,
      );
      handleParticipantsChange([
        ...roomParticipants.filter((item) => item.id !== participant.id),
        participant,
      ]);
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to update hand.");
    }
  }, [code, error, handleParticipantsChange, roomParticipants, session]);

  const lowerHand = useCallback(
    async (target: Participant) => {
      if (!session) return;
      try {
        const participant = await updateParticipantHand(
          code,
          target.id,
          session.participant.id,
          false,
        );
        handleParticipantsChange([
          ...roomParticipants.filter((item) => item.id !== participant.id),
          participant,
        ]);
      } catch (caughtError: unknown) {
        error(caughtError instanceof Error ? caughtError.message : "Unable to lower hand.");
      }
    },
    [code, error, handleParticipantsChange, roomParticipants, session],
  );

  const sendReaction = useCallback(
    async (reaction: ReactionName) => {
      if (!session) return;
      try {
        const participant = await sendParticipantReaction(
          code,
          session.participant.id,
          reaction,
        );
        handleParticipantsChange([
          ...roomParticipants.filter((item) => item.id !== participant.id),
          participant,
        ]);
      } catch (caughtError: unknown) {
        error(caughtError instanceof Error ? caughtError.message : "Unable to send reaction.");
      }
    },
    [code, error, handleParticipantsChange, roomParticipants, session],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (!event.altKey || event.key.toLowerCase() !== "y") return;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      void toggleHand();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [toggleHand]);

  const muteParticipant = async (target: Participant) => {
    if (!session) return;
    try {
      const participant = await updateMyMedia(
        code,
        target.id,
        !target.is_muted,
        target.is_video_on,
      );
      setRoomParticipants((current) =>
        current.map((item) => (item.id === participant.id ? participant : item)),
      );
      success(target.is_muted ? "Participant unmuted" : "Participant muted");
    } catch (caughtError: unknown) {
      error(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to mute participant.",
      );
    }
  };

  const roomActions = useMeetingRoomActions({
    code,
    session,
    setSession,
    setParticipants: setRoomParticipants,
    media,
    screenStream,
    setScreenStream,
    shareScreenAudio: settings.share_screen_audio,
    clearSession,
    writeSession,
    navigateToEnded: () => router.replace(`/meeting/${encodeURIComponent(code)}/ended`),
    onError: error,
    onSuccess: success,
  });

  const handleLastMessageIdChange = useCallback((messageId: number) => {
    if (lastChatIdRef.current === undefined || messageId > lastChatIdRef.current) {
      lastChatIdRef.current = messageId;
    }
  }, []);

  if (!session) return { status: "loading" };
  if (removed) {
    return {
      status: "removed",
      onBackToHome: () => {
        clearSession(code);
        router.replace("/");
      },
    };
  }

  return {
    status: "active",
    stageProps: {
      code,
      meeting,
      onMeetingChange: setMeeting,
      participants: roomParticipants.length > 0 ? roomParticipants : localParticipants,
      session,
      elapsed,
      view,
      onViewChange: setView,
      localStream: media.stream,
      remoteStreams,
      reactions: floatingReactions,
      mirrorLocalVideo: settings.mirror_video,
      virtualBackground: settings.virtual_background,
      displayParticipantNames: settings.display_participant_names,
      speakerDeviceId: settings.speaker_device_id,
      onAudioOutputError: error,
      confirmLeave: settings.confirm_leave,
      shareScreenAudio: settings.share_screen_audio,
      screenStream,
      mediaError: media.error,
      permissionDismissed,
      onDismissPermissionError: () => setPermissionDismissed(true),
      isHost: Boolean(isHost),
      endMenuOpen,
      unreadChatCount,
      chatEnabled: meeting?.chat_enabled ?? true,
      activePanel,
      onToggleMute: () => void roomActions.toggleMute(),
      onToggleVideo: () => void roomActions.toggleVideo(),
      onToggleScreenShare: () => void roomActions.toggleScreenShare(),
      onOpenWhiteboard: () => setActivePanel("Whiteboard"),
      onParticipants: () => setActivePanel("Participants"),
      onChat: () => {
        setUnreadChatCount(0);
        setActivePanel("Chat");
      },
      onEndMenu: () => setEndMenuOpen((open) => !open),
      onEndMeeting: () => void roomActions.finishMeeting(),
      onLeave: () => void roomActions.leave(),
      onFeatureError: error,
      onPanelClose: () => setActivePanel(null),
      onUnreadChange: setUnreadChatCount,
      onLastMessageIdChange: handleLastMessageIdChange,
      onParticipantsChange: handleParticipantsChange,
      onRemoved: () => setRemoved(true),
      onHostMute: (target) => void muteParticipant(target),
      onLowerHand: (target) => void lowerHand(target),
      onReaction: (reaction) => void sendReaction(reaction),
      onToggleHand: () => void toggleHand(),
    },
  };
}
