"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useMeetingRecording(
  stream: MediaStream | null,
  onError: (message: string) => void,
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const toggle = useCallback(() => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!stream || typeof MediaRecorder === "undefined") {
      onError("Recording is unavailable because no local media stream is active.");
      return;
    }
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "zoom-meeting-recording.webm";
        link.click();
        URL.revokeObjectURL(url);
        startedAtRef.current = null;
        setSeconds(0);
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setIsRecording(true);
    } catch {
      onError("Unable to start recording in this browser.");
    }
  }, [isRecording, onError, stream]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    },
    [],
  );

  return { isRecording, seconds, toggle };
}
