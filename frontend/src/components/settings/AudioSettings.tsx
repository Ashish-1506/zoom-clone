"use client";

import { AudioLevelMeter } from "./MediaSettingsPreview";
import { DeviceSelect } from "./DeviceSelect";
import { SettingsSection, SettingsSlider, SettingsToggle } from "./SettingsControls";
import { useSettings } from "./SettingsProvider";

export function AudioSettings() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="space-y-8">
      <SettingsSection title="Microphone">
        <DeviceSelect
          kind="audioinput"
          label="Microphone"
          value={settings.microphone_device_id}
          onChange={(value) => void updateSettings({ microphone_device_id: value })}
        />
        <SettingsSlider
          label="Input volume"
          value={settings.input_volume}
          onChange={(value) => void updateSettings({ input_volume: value })}
        />
        <AudioLevelMeter />
        <SettingsToggle
          label="Mute my mic when joining"
          checked={settings.mute_mic_on_join}
          onChange={(value) => void updateSettings({ mute_mic_on_join: value })}
        />
      </SettingsSection>
      <SettingsSection title="Speaker">
        <DeviceSelect
          kind="audiooutput"
          label="Speaker"
          value={settings.speaker_device_id}
          onChange={(value) => void updateSettings({ speaker_device_id: value })}
        />
      </SettingsSection>
    </div>
  );
}
