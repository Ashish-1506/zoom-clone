"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useCurrentUser } from "@/components/layout/UserProvider";
import { useToast } from "@/components/ui";
import { getUserSettings, saveUserSettings } from "@/lib/api";
import type { UserSettings } from "@/lib/types";

export const DEFAULT_USER_SETTINGS: UserSettings = {
  start_video_on: true,
  use_24_hour_time: false,
  confirm_leave: true,
  theme: "light",
  camera_device_id: "",
  mirror_video: true,
  display_participant_names: true,
  microphone_device_id: "",
  speaker_device_id: "",
  input_volume: 75,
  mute_mic_on_join: false,
  show_message_preview: true,
  play_message_sound: true,
  virtual_background: "none",
  share_screen_audio: false,
  allow_remote_control: false,
  cloud_recording: true,
  recording_transcription: false,
  desktop_notifications: true,
  meeting_reminders: true,
  accessibility_captions: false,
  reduce_motion: false,
  keyboard_shortcuts: true,
};

interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const { success, error } = useToast();
  const [settings, setSettings] = useState(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const currentSettings = useRef(settings);
  const saves = useRef(Promise.resolve());
  const userId = user?.id;

  useEffect(() => {
    let active = true;
    if (!userId) {
      const reset = window.setTimeout(() => {
        if (!active) return;
        currentSettings.current = DEFAULT_USER_SETTINGS;
        setSettings(DEFAULT_USER_SETTINGS);
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(reset);
      };
    }
    const load = window.setTimeout(() => {
      if (active) setLoading(true);
    }, 0);
    void getUserSettings()
      .then((savedSettings) => {
        if (!active) return;
        currentSettings.current = savedSettings;
        setSettings(savedSettings);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load your settings.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(load);
    };
  }, [error, userId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      const nextSettings = { ...currentSettings.current, ...updates };
      currentSettings.current = nextSettings;
      setSettings(nextSettings);
      saves.current = saves.current
        .catch(() => undefined)
        .then(async () => {
          const saved = await saveUserSettings(nextSettings);
          currentSettings.current = saved;
          setSettings(saved);
          success("Saved");
        })
        .catch((caughtError: unknown) => {
          error(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to save your settings.",
          );
        });
      await saves.current;
    },
    [error, success],
  );

  const value = useMemo(
    () => ({ settings, loading, updateSettings }),
    [loading, settings, updateSettings],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider.");
  return context;
}
