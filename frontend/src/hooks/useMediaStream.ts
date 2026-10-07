"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseMediaStreamResult {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  toggleVideo: () => Promise<boolean>;
  toggleAudio: () => Promise<boolean>;
  error: string | null;
  stop: () => void;
}

interface UseMediaStreamOptions {
  enabled?: boolean;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

const mediaError = "Camera or microphone is blocked";

export function useMediaStream({
  enabled = true,
  initialVideoEnabled = true,
  initialAudioEnabled = false,
  videoDeviceId = "",
  audioDeviceId = "",
}: UseMediaStreamOptions = {}): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestMedia = useCallback(async (video: boolean, audio: boolean): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(mediaError);
      return false;
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? videoDeviceId
            ? { deviceId: { exact: videoDeviceId } }
            : true
          : false,
        audio: audio
          ? audioDeviceId
            ? { deviceId: { exact: audioDeviceId } }
            : true
          : false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = nextStream;
      setStream(nextStream);
      setVideoEnabled(nextStream.getVideoTracks().some((track) => track.enabled));
      setAudioEnabled(nextStream.getAudioTracks().some((track) => track.enabled));
      setError(null);
      return true;
    } catch {
      setError(mediaError);
      setVideoEnabled(false);
      setAudioEnabled(false);
      return false;
    }
  }, [audioDeviceId, videoDeviceId]);

  useEffect(() => {
    if (enabled) {
      if (initialVideoEnabled || initialAudioEnabled) {
        queueMicrotask(() => void requestMedia(initialVideoEnabled, initialAudioEnabled));
      }
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      queueMicrotask(() => {
        setStream(null);
        setVideoEnabled(false);
        setAudioEnabled(false);
      });
    }
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [enabled, initialAudioEnabled, initialVideoEnabled, requestMedia]);

  const toggleVideo = useCallback(async () => {
    if (!streamRef.current || streamRef.current.getVideoTracks().length === 0) {
      return requestMedia(true, audioEnabled);
    }
    const enabled = !videoEnabled;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setVideoEnabled(enabled);
    return enabled;
  }, [audioEnabled, requestMedia, videoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (!streamRef.current || streamRef.current.getAudioTracks().length === 0) {
      return requestMedia(videoEnabled, true);
    }
    const enabled = !audioEnabled;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setAudioEnabled(enabled);
    return enabled;
  }, [audioEnabled, requestMedia, videoEnabled]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setVideoEnabled(false);
    setAudioEnabled(false);
  }, []);

  return { stream, videoEnabled, audioEnabled, toggleVideo, toggleAudio, error, stop };
}
