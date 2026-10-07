"use client";

import { useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/ui";
import { useSettings } from "./SettingsProvider";

export function CameraSettingsPreview() {
  const { settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let nextStream: MediaStream | null = null;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: settings.camera_device_id
        ? { deviceId: { exact: settings.camera_device_id } }
        : true,
    };
    void navigator.mediaDevices
      .getUserMedia(constraints)
      .then((mediaStream) => {
        nextStream = mediaStream;
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
        setError("");
      })
      .catch(() => {
        if (active) setError("Camera preview is unavailable. Check camera permissions.");
      });
    return () => {
      active = false;
      nextStream?.getTracks().forEach((track) => track.stop());
    };
  }, [settings.camera_device_id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-room-bg">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`size-full object-cover ${settings.mirror_video ? "mirror-video" : ""}`}
          aria-label="Camera preview"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-white/70">
          {error || <Spinner size="sm" />}
        </div>
      )}
    </div>
  );
}

export function AudioLevelMeter() {
  const { settings } = useSettings();
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let frame = 0;

    void navigator.mediaDevices
      .getUserMedia({
        audio: settings.microphone_device_id
          ? { deviceId: { exact: settings.microphone_device_id } }
          : true,
      })
      .then((mediaStream) => {
        stream = mediaStream;
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(mediaStream).connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const measure = () => {
          analyser.getByteTimeDomainData(samples);
          const average = samples.reduce(
            (sum, sample) => sum + Math.abs(sample - 128),
            0,
          ) / samples.length;
          setLevel(Math.min(100, Math.round((average / 32) * settings.input_volume)));
          frame = window.requestAnimationFrame(measure);
        };
        measure();
      })
      .catch(() => setLevel(0));

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (context) void context.close();
    };
  }, [settings.input_volume, settings.microphone_device_id]);

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-zoom-bg"
      role="meter"
      aria-label="Microphone input level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={level}
    >
      <div className="h-full rounded-full bg-zoom-green transition-[width]" style={{ width: `${level}%` }} />
    </div>
  );
}
