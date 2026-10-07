export type MeetingType = "instant" | "scheduled";
export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";
export type ParticipantRole = "host" | "cohost" | "participant";
export type ReactionName = "clap" | "thumbs_up" | "heart" | "joy" | "wow" | "tada";

export interface FloatingReaction {
  emoji: string;
  key: number;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  avatar_color: string;
  department: string | null;
  job_title: string | null;
  location: string | null;
  phone: string | null;
  personal_meeting_id: string;
  created_at: string;
}

export interface UserProfileUpdate {
  full_name: string;
  email: string;
  avatar_color: string;
  department: string | null;
  job_title: string | null;
  location: string | null;
  phone: string | null;
}

export interface UserSettings {
  start_video_on: boolean;
  use_24_hour_time: boolean;
  confirm_leave: boolean;
  theme: "light" | "dark";
  camera_device_id: string;
  mirror_video: boolean;
  display_participant_names: boolean;
  microphone_device_id: string;
  speaker_device_id: string;
  input_volume: number;
  mute_mic_on_join: boolean;
  show_message_preview: boolean;
  play_message_sound: boolean;
  virtual_background:
    | "none"
    | "blur"
    | "gradient-1"
    | "gradient-2"
    | "gradient-3"
    | "gradient-4";
  share_screen_audio: boolean;
  allow_remote_control: boolean;
  cloud_recording: boolean;
  recording_transcription: boolean;
  desktop_notifications: boolean;
  meeting_reminders: boolean;
  accessibility_captions: boolean;
  reduce_motion: boolean;
  keyboard_shortcuts: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  formatted_meeting_code: string;
  title: string;
  description: string | null;
  host_id: number;
  host: User;
  meeting_type: MeetingType;
  status: MeetingStatus;
  start_time: string | null;
  duration_minutes: number;
  timezone: string;
  passcode: string;
  invite_link: string;
  is_locked: boolean;
  chat_enabled: boolean;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
}

export interface Participant {
  id: number;
  meeting_id: number;
  user_id: number | null;
  display_name: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_video_on: boolean;
  is_removed: boolean;
  hand_raised: boolean;
  hand_raised_at: string | null;
  last_reaction: ReactionName | null;
  last_reaction_at: string | null;
  joined_at: string;
  left_at: string | null;
}

export interface ChatMessage {
  id: number;
  meeting_id: number;
  participant_id: number;
  sender_name: string;
  content: string;
  type: "user" | "system";
  sent_at: string;
}

export interface MeetingValidation {
  exists: boolean;
  status: MeetingStatus | null;
  title: string | null;
  host_name: string | null;
  requires_passcode: boolean;
}

export interface Whiteboard {
  id: number;
  owner_id: number;
  title: string;
  data_json: string;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingWhiteboard {
  data_json: string;
  updated_at: string;
}

export interface TeamChatUser {
  id: number;
  full_name: string;
  email: string;
  avatar_color: string;
}

export interface TeamChannel {
  id: number;
  name: string;
  description: string;
  is_private: boolean;
  is_direct: boolean;
  created_by: number;
  member_count: number;
  members: TeamChatUser[];
}

export interface TeamMessage {
  id: number;
  channel_id: number;
  sender_id: number;
  sender: TeamChatUser;
  content: string;
  created_at: string;
  edited_at: string | null;
  reply_to_id: number | null;
}

export type CallDirection = "in" | "out" | "missed";

export interface CallLog {
  id: number;
  user_id: number;
  contact_name: string | null;
  phone_number: string;
  direction: CallDirection;
  duration_seconds: number;
  created_at: string;
}

export interface Voicemail {
  id: number;
  user_id: number;
  caller_name: string;
  phone_number: string;
  duration_seconds: number;
  is_listened: boolean;
  created_at: string;
  transcript: string;
}

export interface PhoneContact {
  id: number;
  owner_id: number;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface SchedulerLink {
  id: number;
  owner_id: number;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  available_days: number[];
  start_hour: number;
  end_hour: number;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface PublicSchedulerLink {
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  available_days: number[];
  timezone: string;
}

export interface SchedulerSlot {
  start_time: string;
  end_time: string;
  label: string;
}

export interface SchedulerBooking {
  id: number;
  link_id: number;
  guest_name: string;
  guest_email: string;
  start_time: string;
  end_time: string;
  meeting_id: number | null;
  status: string;
  created_at: string;
}

export interface BookingConfirmation extends SchedulerBooking {
  meeting_link: string;
}
