"use client";

import { SettingsSection, SettingsSelect, SettingsToggle } from "./SettingsControls";
import { useSettings } from "./SettingsProvider";

export function GeneralSettings() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="space-y-8">
      <SettingsSection title="Meeting">
        <SettingsToggle
          label="Start meeting with video on"
          checked={settings.start_video_on}
          onChange={(value) => void updateSettings({ start_video_on: value })}
        />
        <SettingsToggle
          label="Display time in 24-hour format"
          checked={settings.use_24_hour_time}
          onChange={(value) => void updateSettings({ use_24_hour_time: value })}
        />
        <SettingsToggle
          label="Ask me to confirm when I leave a meeting"
          checked={settings.confirm_leave}
          onChange={(value) => void updateSettings({ confirm_leave: value })}
        />
        <SettingsToggle
          label="Mute my mic when joining"
          checked={settings.mute_mic_on_join}
          onChange={(value) => void updateSettings({ mute_mic_on_join: value })}
        />
      </SettingsSection>
      <SettingsSection title="Appearance">
        <SettingsSelect
          label="Theme"
          value={settings.theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(value) =>
            void updateSettings({ theme: value as "light" | "dark" })
          }
        />
      </SettingsSection>
    </div>
  );
}
