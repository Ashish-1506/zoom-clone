import type {
  AuthResponse,
  ChatMessage,
  Meeting,
  MeetingStatus,
  MeetingValidation,
  Participant,
  ReactionName,
  User,
  UserProfileUpdate,
  UserSettings,
  Whiteboard,
  MeetingWhiteboard,
  TeamChannel,
  TeamChatUser,
  TeamMessage,
  CallLog,
  CallDirection,
  PhoneContact,
  Voicemail,
  BookingConfirmation,
  PublicSchedulerLink,
  SchedulerBooking,
  SchedulerLink,
  SchedulerSlot,
} from "./types";
import { AUTH_TOKEN_STORAGE_KEY } from "./constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  participantId?: number;
  userId?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL must be set before making API requests.");
  }
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) headers.set("Authorization", "Bearer " + token);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.participantId !== undefined) {
    headers.set("X-Participant-Id", String(options.participantId));
  }
  if (options.userId !== undefined) {
    headers.set("X-User-Id", String(options.userId));
  }

  const body = options.body;
  const fetchOptions = { ...options };
  delete fetchOptions.body;
  delete fetchOptions.participantId;
  delete fetchOptions.userId;
  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload: unknown = await response.json();
      if (
        typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof payload.detail === "string"
      ) {
        message = payload.detail;
      }
    } catch {
      // Preserve the status-based message when the server sends no JSON body.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function saveAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event("zoom:auth-changed"));
}

export function clearAuthToken(notify = true): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  if (notify) window.dispatchEvent(new Event("zoom:auth-changed"));
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });
}

export function signup(fullName: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/signup", { method: "POST", body: { full_name: fullName, email, password } });
}
export function getCurrentUser(): Promise<User> {
  return request<User>("/api/users/me");
}

export function updateCurrentUser(data: UserProfileUpdate): Promise<User> {
  return request<User>("/api/users/me", { method: "PATCH", body: data });
}

export async function getUserSettings(): Promise<UserSettings> {
  const result = await request<{ settings: UserSettings }>("/api/users/me/settings");
  return result.settings;
}

export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  const result = await request<{ settings: UserSettings }>("/api/users/me/settings", {
    method: "PUT",
    body: { settings },
  });
  return result.settings;
}

export function createInstantMeeting(
  title?: string,
  usePersonalId = false,
): Promise<Meeting> {
  return request<Meeting>("/api/meetings/instant", {
    method: "POST",
    body: {
      ...(title === undefined ? {} : { title }),
      use_personal_id: usePersonalId,
    },
  });
}

export interface ScheduleMeetingInput {
  title: string;
  description?: string;
  start_time: string;
  duration_minutes: number;
  timezone: string;
}

export function scheduleMeeting(input: ScheduleMeetingInput): Promise<Meeting> {
  return request<Meeting>("/api/meetings/schedule", {
    method: "POST",
    body: input,
  });
}

export function listMeetings(type: "upcoming" | "recent"): Promise<Meeting[]> {
  return request<Meeting[]>(`/api/meetings?type=${type}`);
}

export function getMeeting(code: string): Promise<Meeting> {
  return request<Meeting>(`/api/meetings/${encodeURIComponent(code)}`);
}

export function validateMeeting(code: string): Promise<MeetingValidation> {
  return request<MeetingValidation>(`/api/meetings/${encodeURIComponent(code)}/validate`);
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string | null;
  start_time?: string;
  duration_minutes?: number;
  timezone?: string;
  status?: MeetingStatus;
}

export function updateMeeting(code: string, input: UpdateMeetingInput): Promise<Meeting> {
  return request<Meeting>(`/api/meetings/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: input,
  });
}

export function updateMeetingSecurity(
  code: string,
  participantId: number,
  settings: { is_locked: boolean; chat_enabled: boolean },
): Promise<Meeting> {
  return request<Meeting>(`/api/meetings/${encodeURIComponent(code)}/security`, {
    method: "PATCH",
    participantId,
    body: settings,
  });
}

export function cancelMeeting(code: string): Promise<Meeting> {
  return request<Meeting>(`/api/meetings/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

export interface JoinMeetingInput {
  display_name: string;
  passcode?: string;
}

export function joinMeeting(
  code: string,
  input: JoinMeetingInput,
  userId?: number,
): Promise<Participant> {
  return request<Participant>(`/api/meetings/${encodeURIComponent(code)}/join`, {
    method: "POST",
    body: input,
    userId,
  });
}

export function leaveMeeting(code: string, participantId: number): Promise<Participant> {
  return request<Participant>(`/api/meetings/${encodeURIComponent(code)}/leave`, {
    method: "POST",
    participantId,
  });
}

export function endMeeting(code: string, participantId: number): Promise<Meeting> {
  return request<Meeting>(`/api/meetings/${encodeURIComponent(code)}/end`, {
    method: "POST",
    participantId,
  });
}

export function listParticipants(code: string): Promise<Participant[]> {
  return request<Participant[]>(
    `/api/meetings/${encodeURIComponent(code)}/participants`,
  );
}

export function muteAll(code: string, participantId: number): Promise<Participant[]> {
  return request<Participant[]>(`/api/meetings/${encodeURIComponent(code)}/mute-all`, {
    method: "POST",
    participantId,
  });
}

export function removeParticipant(
  code: string,
  targetParticipantId: number,
  participantId: number,
): Promise<Participant> {
  return request<Participant>(
    `/api/meetings/${encodeURIComponent(code)}/participants/${targetParticipantId}`,
    { method: "DELETE", participantId },
  );
}

export function updateMyMedia(
  code: string,
  participantId: number,
  isMuted: boolean,
  isVideoOn: boolean,
): Promise<Participant> {
  return request<Participant>(
    `/api/meetings/${encodeURIComponent(code)}/participants/${participantId}/media`,
    {
      method: "PATCH",
      participantId,
      body: { is_muted: isMuted, is_video_on: isVideoOn },
    },
  );
}

export function updateParticipantHand(
  code: string,
  participantId: number,
  actingParticipantId: number,
  raised: boolean,
): Promise<Participant> {
  return request<Participant>(
    `/api/meetings/${encodeURIComponent(code)}/participants/${participantId}/hand`,
    {
      method: "PATCH",
      participantId: actingParticipantId,
      body: { raised },
    },
  );
}

export function sendParticipantReaction(
  code: string,
  participantId: number,
  emoji: ReactionName,
): Promise<Participant> {
  return request<Participant>(
    `/api/meetings/${encodeURIComponent(code)}/participants/${participantId}/reaction`,
    {
      method: "POST",
      participantId,
      body: { emoji },
    },
  );
}

export function listChat(code: string, afterId?: number): Promise<ChatMessage[]> {
  const query = afterId === undefined ? "" : `?after_id=${afterId}`;
  return request<ChatMessage[]>(`/api/meetings/${encodeURIComponent(code)}/chat${query}`);
}

export function sendChat(
  code: string,
  participantId: number,
  content: string,
): Promise<ChatMessage> {
  return request<ChatMessage>(`/api/meetings/${encodeURIComponent(code)}/chat`, {
    method: "POST",
    participantId,
    body: { content },
  });
}

export function listWhiteboards(): Promise<Whiteboard[]> {
  return request<Whiteboard[]>("/api/whiteboards");
}

export function createWhiteboard(title: string): Promise<Whiteboard> {
  return request<Whiteboard>("/api/whiteboards", {
    method: "POST",
    body: { title, data_json: "[]" },
  });
}

export function getWhiteboard(id: number): Promise<Whiteboard> {
  return request<Whiteboard>(`/api/whiteboards/${id}`);
}

export function updateWhiteboard(
  id: number,
  changes: { title?: string; data_json?: string; thumbnail?: string | null },
): Promise<Whiteboard> {
  return request<Whiteboard>(`/api/whiteboards/${id}`, {
    method: "PATCH",
    body: changes,
  });
}

export function deleteWhiteboard(id: number): Promise<void> {
  return request<void>(`/api/whiteboards/${id}`, { method: "DELETE" });
}

export function getMeetingWhiteboard(
  code: string,
  participantId: number,
): Promise<MeetingWhiteboard> {
  return request<MeetingWhiteboard>(
    `/api/meetings/${encodeURIComponent(code)}/whiteboard`,
    { participantId },
  );
}

export function saveMeetingWhiteboard(
  code: string,
  participantId: number,
  dataJson: string,
): Promise<MeetingWhiteboard> {
  return request<MeetingWhiteboard>(
    `/api/meetings/${encodeURIComponent(code)}/whiteboard`,
    { method: "PUT", participantId, body: { data_json: dataJson } },
  );
}

export function listTeamChannels(): Promise<TeamChannel[]> {
  return request<TeamChannel[]>("/api/chat/channels");
}

export function createTeamChannel(input: {
  name: string;
  description: string;
  is_private: boolean;
}): Promise<TeamChannel> {
  return request<TeamChannel>("/api/chat/channels", { method: "POST", body: input });
}

export function listTeamMessages(channelId: number, afterId?: number): Promise<TeamMessage[]> {
  const query = afterId === undefined ? "" : `?after_id=${afterId}`;
  return request<TeamMessage[]>(`/api/chat/channels/${channelId}/messages${query}`);
}

export function sendTeamMessage(
  channelId: number,
  content: string,
  replyToId?: number,
): Promise<TeamMessage> {
  return request<TeamMessage>(`/api/chat/channels/${channelId}/messages`, {
    method: "POST",
    body: { content, ...(replyToId === undefined ? {} : { reply_to_id: replyToId }) },
  });
}

export function updateTeamMessage(messageId: number, content: string): Promise<TeamMessage> {
  return request<TeamMessage>(`/api/chat/messages/${messageId}`, {
    method: "PATCH",
    body: { content },
  });
}

export function deleteTeamMessage(messageId: number): Promise<void> {
  return request<void>(`/api/chat/messages/${messageId}`, { method: "DELETE" });
}

export function createDirectMessage(userId: number): Promise<TeamChannel> {
  return request<TeamChannel>("/api/chat/dm", { method: "POST", body: { user_id: userId } });
}

export function listTeamChatUsers(): Promise<TeamChatUser[]> {
  return request<TeamChatUser[]>("/api/users");
}

export function listCallLogs(): Promise<CallLog[]> {
  return request<CallLog[]>("/api/phone/call-logs");
}

export function createCallLog(data: {
  contact_name?: string | null;
  phone_number: string;
  direction: CallDirection;
  duration_seconds: number;
}): Promise<CallLog> {
  return request<CallLog>("/api/phone/call-logs", { method: "POST", body: data });
}

export function listVoicemails(): Promise<Voicemail[]> {
  return request<Voicemail[]>("/api/phone/voicemails");
}

export function markVoicemailListened(id: number, isListened = true): Promise<Voicemail> {
  return request<Voicemail>(`/api/phone/voicemails/${id}`, {
    method: "PATCH",
    body: { is_listened: isListened },
  });
}

export function listPhoneContacts(): Promise<PhoneContact[]> {
  return request<PhoneContact[]>("/api/phone/contacts");
}

export function createPhoneContact(data: {
  name: string;
  phone: string;
  email?: string | null;
}): Promise<PhoneContact> {
  return request<PhoneContact>("/api/phone/contacts", { method: "POST", body: data });
}

export function updatePhoneContact(
  id: number,
  data: Partial<Pick<PhoneContact, "name" | "phone" | "email">>,
): Promise<PhoneContact> {
  return request<PhoneContact>(`/api/phone/contacts/${id}`, { method: "PATCH", body: data });
}

export function deletePhoneContact(id: number): Promise<void> {
  return request<void>(`/api/phone/contacts/${id}`, { method: "DELETE" });
}

export interface SchedulerLinkInput {
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  available_days: number[];
  start_hour: number;
  end_hour: number;
  timezone: string;
  is_active?: boolean;
}

export function listSchedulerLinks(): Promise<SchedulerLink[]> {
  return request<SchedulerLink[]>("/api/scheduler/links");
}

export function createSchedulerLink(data: SchedulerLinkInput): Promise<SchedulerLink> {
  return request<SchedulerLink>("/api/scheduler/links", { method: "POST", body: data });
}

export function updateSchedulerLink(id: number, data: Partial<SchedulerLinkInput>): Promise<SchedulerLink> {
  return request<SchedulerLink>(`/api/scheduler/links/${id}`, { method: "PATCH", body: data });
}

export function deleteSchedulerLink(id: number): Promise<void> {
  return request<void>(`/api/scheduler/links/${id}`, { method: "DELETE" });
}

export function listSchedulerBookings(): Promise<SchedulerBooking[]> {
  return request<SchedulerBooking[]>("/api/scheduler/bookings");
}

export function getPublicSchedulerLink(slug: string): Promise<PublicSchedulerLink> {
  return request<PublicSchedulerLink>(`/api/scheduler/public/${encodeURIComponent(slug)}`);
}

export function listPublicSchedulerSlots(slug: string, date: string): Promise<SchedulerSlot[]> {
  return request<SchedulerSlot[]>(`/api/scheduler/public/${encodeURIComponent(slug)}/slots?date=${encodeURIComponent(date)}`);
}

export function bookSchedulerSlot(
  slug: string,
  data: { guest_name: string; guest_email: string; start_time: string },
): Promise<BookingConfirmation> {
  return request<BookingConfirmation>(`/api/scheduler/public/${encodeURIComponent(slug)}/book`, { method: "POST", body: data });
}
