"use client";

import { DeviceSelect } from "./DeviceSelect";
import { CameraSettingsPreview } from "./MediaSettingsPreview";
import { SettingsSection, SettingsToggle } from "./SettingsControls";
import { useSettings } from "./SettingsProvider";

export function VideoSettings() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="space-y-8">
      <SettingsSection title="Camera">
        <DeviceSelect
          kind="videoinput"
          label="Camera"
          value={settings.camera_device_id}
          onChange={(value) => void updateSettings({ camera_device_id: value })}
        />
        <SettingsToggle
          label="Mirror my video"
          checked={settings.mirror_video}
          onChange={(value) => void updateSettings({ mirror_video: value })}
        />
        <SettingsToggle
          label="Always display participant names"
          checked={settings.display_participant_names}
          onChange={(value) => void updateSettings({ display_participant_names: value })}
        />
      </SettingsSection>
      <SettingsSection title="Camera preview">
        <CameraSettingsPreview />
      </SettingsSection>
    </div>
  );
}
