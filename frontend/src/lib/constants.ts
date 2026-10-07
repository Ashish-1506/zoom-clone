export const APP_NAME = "Zoom Workplace";
export const AUTH_TOKEN_STORAGE_KEY = "zoom:access-token";
export const ROOM_POLL_INTERVAL_SECONDS = 3;
export const CHAT_POLL_INTERVAL_SECONDS = 2;
export const CLOCK_UPDATE_INTERVAL_MS = 1000;
export const MEETING_TIMER_INTERVAL_MS = 1000;
export const DEFAULT_MEETING_DURATION_MINUTES = 40;
export const MAX_MEETING_DESCRIPTION_LENGTH = 2000;
export const MAX_CHAT_MESSAGE_LENGTH = 1000;
export const REACTION_OPTIONS = [
  { name: "clap", emoji: "👏", label: "Clap" },
  { name: "thumbs_up", emoji: "👍", label: "Thumbs up" },
  { name: "heart", emoji: "❤️", label: "Heart" },
  { name: "joy", emoji: "😂", label: "Laugh" },
  { name: "wow", emoji: "😮", label: "Wow" },
  { name: "tada", emoji: "🎉", label: "Celebrate" },
] as const;
export const REACTION_DISPLAY_MS = 3000;
