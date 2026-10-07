"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { MeetingSession } from "@/hooks/useMeetingSession";
import type { useMediaStream } from "@/hooks/useMediaStream";
import { endMeeting, leaveMeeting, updateMyMedia } from "@/lib/api";
import type { Participant } from "@/lib/types";

type MediaControls = Pick<
  ReturnType<typeof useMediaStream>,
  "stream" | "stop" | "toggleAudio" | "toggleVideo"
>;

interface UseMeetingRoomActionsOptions {
  code: string;
  session: MeetingSession | null;
  setSession: Dispatch<SetStateAction<MeetingSession | null>>;
  setParticipants: Dispatch<SetStateAction<Participant[]>>;
  media: MediaControls;
  screenStream: MediaStream | null;
  setScreenStream: Dispatch<SetStateAction<MediaStream | null>>;
  clearSession: (code: string) => void;
  writeSession: MeetingSessionWriter;
  navigateToEnded: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  shareScreenAudio: boolean;
}

type MeetingSessionWriter = (
  code: string,
  participant: MeetingSession["participant"],
  isVideoOn: boolean,
) => void;

export function useMeetingRoomActions({
  code,
  session,
  setSession,
  setParticipants,
  media,
  screenStream,
  setScreenStream,
  clearSession,
  writeSession,
  navigateToEnded,
  onError,
  onSuccess,
  shareScreenAudio,
}: UseMeetingRoomActionsOptions) {
  const syncMedia = useCallback(
    async (isMuted: boolean, isVideoOn: boolean) => {
      if (!session) return;
      const participant = await updateMyMedia(
        code,
        session.participant.id,
        isMuted,
        isVideoOn,
      );
      setSession({ participant, isVideoOn });
      setParticipants((current) =>
        current.map((item) => (item.id === participant.id ? participant : item)),
      );
      writeSession(code, participant, isVideoOn);
    },
    [code, session, setParticipants, setSession, writeSession],
  );

  const toggleMute = useCallback(async () => {
    if (!session) return;
    try {
      const audioEnabled = await media.toggleAudio();
      await syncMedia(!audioEnabled, session.isVideoOn);
    } catch (caughtError: unknown) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update microphone.",
      );
    }
  }, [media, onError, session, syncMedia]);

  const toggleVideo = useCallback(async () => {
    if (!session) return;
    try {
      const videoEnabled = await media.toggleVideo();
      await syncMedia(session.participant.is_muted, videoEnabled);
    } catch (caughtError: unknown) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update camera.",
      );
    }
  }, [media, onError, session, syncMedia]);

  const toggleScreenShare = useCallback(async () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      onError("Screen sharing is not supported in this browser.");
      return;
    }
    try {
      const nextScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: shareScreenAudio,
      });
      const [track] = nextScreenStream.getVideoTracks();
      if (track) {
        track.addEventListener("ended", () => setScreenStream(null), {
          once: true,
        });
      }
      setScreenStream(nextScreenStream);
    } catch (caughtError: unknown) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }
      onError("Unable to share your screen.");
    }
  }, [onError, screenStream, setScreenStream, shareScreenAudio]);

  const leave = useCallback(async () => {
    if (!session) return;
    try {
      await leaveMeeting(code, session.participant.id);
    } catch (caughtError: unknown) {
      onError(
        caughtError instanceof Error ? caughtError.message : "Unable to leave meeting.",
      );
    } finally {
      media.stop();
      screenStream?.getTracks().forEach((track) => track.stop());
      clearSession(code);
      navigateToEnded();
    }
  }, [
    clearSession,
    code,
    media,
    navigateToEnded,
    onError,
    screenStream,
    session,
  ]);

  const finishMeeting = useCallback(async () => {
    if (!session) return;
    try {
      await endMeeting(code, session.participant.id);
      onSuccess("Meeting ended");
      clearSession(code);
      media.stop();
      screenStream?.getTracks().forEach((track) => track.stop());
      navigateToEnded();
    } catch (caughtError: unknown) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to end meeting.",
      );
    }
  }, [
    clearSession,
    code,
    media,
    navigateToEnded,
    onError,
    onSuccess,
    screenStream,
    session,
  ]);

  return { finishMeeting, leave, toggleMute, toggleScreenShare, toggleVideo };
}
