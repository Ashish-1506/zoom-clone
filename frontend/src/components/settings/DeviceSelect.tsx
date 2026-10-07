"use client";

import { useEffect, useState } from "react";

import type { UserSettings } from "@/lib/types";
import { SettingsSelect } from "./SettingsControls";

interface MediaDeviceChoice {
  deviceId: string;
  label: string;
}

export function DeviceSelect({
  kind,
  label,
  value,
  onChange,
}: {
  kind: "videoinput" | "audioinput" | "audiooutput";
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [devices, setDevices] = useState<MediaDeviceChoice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const found = await navigator.mediaDevices.enumerateDevices();
        if (active) {
          setDevices(
            found
              .filter((device) => device.kind === kind)
              .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `${label} ${index + 1}`,
              })),
          );
          setError("");
        }
      } catch {
        if (active) setError("Device list unavailable.");
      }
    };
    void load();
    navigator.mediaDevices?.addEventListener("devicechange", load);
    return () => {
      active = false;
      navigator.mediaDevices?.removeEventListener("devicechange", load);
    };
  }, [kind, label]);

  const options = [
    { value: "", label: `System default ${label.toLowerCase()}` },
    ...devices.map((device) => ({
      value: device.deviceId,
      label: device.label,
    })),
  ];
  return (
    <div>
      <SettingsSelect<"camera_device_id" | "microphone_device_id" | "speaker_device_id">
        label={label}
        value={value as UserSettings["camera_device_id"]}
        options={options}
        onChange={(next) => onChange(String(next))}
      />
      {error && <p role="status" className="mt-1 text-xs text-zoom-muted">{error}</p>}
    </div>
  );
}
