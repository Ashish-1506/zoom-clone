"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { useMediaStream } from "@/hooks/useMediaStream";
import { useMeetingSession } from "@/hooks/useMeetingSession";
import { joinMeeting, updateMyMedia } from "@/lib/api";
import type { Meeting } from "@/lib/types";
import { formatDateLong, formatTime } from "@/lib/utils";
import { Button, Input, Spinner, useToast } from "@/components/ui";
import { useSettings } from "@/components/settings/SettingsProvider";

interface PreJoinPreviewProps {
  meeting: Meeting;
  code: string;
  initialName: string;
  passcode?: string;
}

export function PreJoinPreview({
  meeting,
  code,
  initialName,
  passcode,
}: PreJoinPreviewProps) {
  const router = useRouter();
  const { error: showError } = useToast();
  const { writeSession } = useMeetingSession();
  const { settings } = useSettings();
  const { stream, videoEnabled, audioEnabled, toggleVideo, toggleAudio, error, stop } =
    useMediaStream({
      initialVideoEnabled: settings.start_video_on,
      initialAudioEnabled: !settings.mute_mic_on_join,
      videoDeviceId: settings.camera_device_id,
      audioDeviceId: settings.microphone_device_id,
    });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [name, setName] = useState(initialName);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => stop, [stop]);

  const handleJoin = async () => {
    const displayName = name.trim();
    if (!displayName) return;
    setJoining(true);
    try {
      const joinedParticipant = await joinMeeting(
        code,
        { display_name: displayName, passcode },
      );
      const participant = await updateMyMedia(
        code,
        joinedParticipant.id,
        !audioEnabled,
        videoEnabled,
      );
      writeSession(code, participant, videoEnabled);
      stop();
      router.push(`/meeting/${code}`);
    } catch (caughtError) {
      showError(caughtError instanceof Error ? caughtError.message : "Unable to join meeting.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-zoom-bg px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-[720px] gap-8 rounded-2xl bg-white p-5 shadow-sm sm:p-8 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-room-bg">
            {videoEnabled && stream ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`size-full object-cover ${settings.mirror_video ? "mirror-video" : ""}`}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-white/60">
                Camera is off
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={() => void toggleAudio()} className="flex size-11 items-center justify-center rounded-full bg-zoom-bg text-zoom-text hover:bg-zoom-blue-light" aria-label={audioEnabled ? "Mute" : "Unmute"} title={audioEnabled ? "Mute" : "Unmute"}>
              {audioEnabled ? <Mic className="size-4 text-zoom-blue" /> : <MicOff className="size-4 text-zoom-red" />}
            </button>
            <button type="button" onClick={() => void toggleVideo()} className="flex size-11 items-center justify-center rounded-full bg-zoom-bg text-zoom-text hover:bg-zoom-blue-light" aria-label={videoEnabled ? "Stop Video" : "Start Video"} title={videoEnabled ? "Stop Video" : "Start Video"}>
              {videoEnabled ? <Video className="size-4 text-zoom-blue" /> : <VideoOff className="size-4 text-zoom-red" />}
            </button>
          </div>
          <button type="button" className="mt-4 text-sm font-bold text-zoom-blue hover:text-zoom-blue-dark">
            Test speaker and microphone
          </button>
          {error && <p className="mt-3 text-xs text-zoom-muted">{error}</p>}
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold text-zoom-blue">Ready to join?</p>
          <h1 className="mt-2 text-2xl font-black text-zoom-text">{meeting.title}</h1>
          <p className="mt-2 text-sm text-zoom-muted">Hosted by {meeting.host.full_name}</p>
          {meeting.start_time && (
            <p className="mt-1 text-sm text-zoom-muted">
              {formatDateLong(meeting.start_time)} at {formatTime(meeting.start_time)}
            </p>
          )}
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zoom-muted">
            Meeting ID
          </p>
          <p className="mt-1 font-mono text-sm text-zoom-text">{meeting.formatted_meeting_code}</p>
          <div className="mt-6">
            <Input
              id="prejoin-name"
              label="Your name"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <Button className="mt-5 w-full" size="lg" loading={joining} disabled={!name.trim()} onClick={() => void handleJoin()}>
            Join
          </Button>
        </div>
      </div>
      {stream === null && !error && <Spinner size="sm" />}
    </main>
  );
}
