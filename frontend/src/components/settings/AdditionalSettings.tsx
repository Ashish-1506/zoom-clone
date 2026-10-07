"use client";

import { SettingsSelect, SettingsSection, SettingsToggle } from "./SettingsControls";
import { useSettings } from "./SettingsProvider";

export function AdditionalSettings({ tab }: { tab: string }) {
  const { settings, updateSettings } = useSettings();

  if (tab === "Chat") {
    return (
      <SettingsSection title="Messages">
        <SettingsToggle
          label="Show message preview"
          checked={settings.show_message_preview}
          onChange={(value) => void updateSettings({ show_message_preview: value })}
        />
        <SettingsToggle
          label="Play sound for new messages"
          checked={settings.play_message_sound}
          onChange={(value) => void updateSettings({ play_message_sound: value })}
        />
      </SettingsSection>
    );
  }
  if (tab === "Background") {
    return (
      <SettingsSection title="Self-view background">
        <SettingsSelect
          label="Virtual background"
          value={settings.virtual_background}
          options={[
            { value: "none", label: "None" },
            { value: "blur", label: "Blur" },
            { value: "gradient-1", label: "Blue gradient" },
            { value: "gradient-2", label: "Violet gradient" },
            { value: "gradient-3", label: "Sunset gradient" },
            { value: "gradient-4", label: "Mint gradient" },
          ]}
          onChange={(value) =>
            void updateSettings({
              virtual_background: value as typeof settings.virtual_background,
            })
          }
        />
        <div
          aria-label="Background preview"
          className={`mt-4 aspect-video max-w-sm rounded-lg ${
            settings.virtual_background === "blur"
              ? "bg-gradient-to-br from-slate-500 via-slate-300 to-slate-600 blur-[1px]"
              : settings.virtual_background === "gradient-1"
                ? "bg-gradient-to-br from-blue-500 to-cyan-300"
                : settings.virtual_background === "gradient-2"
                  ? "bg-gradient-to-br from-violet-700 to-fuchsia-300"
                  : settings.virtual_background === "gradient-3"
                    ? "bg-gradient-to-br from-orange-500 to-pink-400"
                    : settings.virtual_background === "gradient-4"
                      ? "bg-gradient-to-br from-emerald-600 to-teal-200"
                      : "bg-room-bg"
          }`}
        />
      </SettingsSection>
    );
  }
  if (tab === "Share Screen") {
    return (
      <SettingsSection title="Screen sharing">
        <SettingsToggle
          label="Share computer sound by default"
          checked={settings.share_screen_audio}
          onChange={(value) => void updateSettings({ share_screen_audio: value })}
        />
        <SettingsToggle
          label="Allow remote control"
          checked={settings.allow_remote_control}
          onChange={(value) => void updateSettings({ allow_remote_control: value })}
        />
      </SettingsSection>
    );
  }
  if (tab === "Recording") {
    return (
      <SettingsSection title="Recording">
        <SettingsToggle
          label="Enable cloud recording"
          checked={settings.cloud_recording}
          onChange={(value) => void updateSettings({ cloud_recording: value })}
        />
        <SettingsToggle
          label="Create audio transcript"
          checked={settings.recording_transcription}
          onChange={(value) => void updateSettings({ recording_transcription: value })}
        />
      </SettingsSection>
    );
  }
  if (tab === "Notifications") {
    return (
      <SettingsSection title="Notifications">
        <SettingsToggle
          label="Desktop notifications"
          checked={settings.desktop_notifications}
          onChange={(value) => void updateSettings({ desktop_notifications: value })}
        />
        <SettingsToggle
          label="Meeting reminders"
          checked={settings.meeting_reminders}
          onChange={(value) => void updateSettings({ meeting_reminders: value })}
        />
      </SettingsSection>
    );
  }
  return (
    <SettingsSection title="Accessibility">
      <SettingsToggle
        label="Always show live captions"
        checked={settings.accessibility_captions}
        onChange={(value) => void updateSettings({ accessibility_captions: value })}
      />
      <SettingsToggle
        label="Reduce motion"
        checked={settings.reduce_motion}
        onChange={(value) => void updateSettings({ reduce_motion: value })}
      />
      <SettingsToggle
        label="Enable keyboard shortcuts"
        checked={settings.keyboard_shortcuts}
        onChange={(value) => void updateSettings({ keyboard_shortcuts: value })}
      />
    </SettingsSection>
  );
}
