import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatMeetingCode(code: string): string {
  const digits = code.replace(/[\s-]/g, "");
  if (!/^\d{11}$/.test(digits)) {
    throw new Error("Meeting code must contain exactly 11 digits.");
  }

  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

export function parseMeetingInput(raw: string): string | null {
  const value = raw.trim();
  const compact = value.replace(/[\s-]/g, "");
  if (/^\d{11}$/.test(compact)) {
    return compact;
  }

  try {
    const parsed = new URL(value);
    const match = parsed.pathname.match(/\/j\/(\d{11})\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(toDate(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(date));
}

export function buildInvitationText(meeting: {
  title: string;
  start_time: string | null;
  invite_link: string;
  formatted_meeting_code: string;
  passcode: string;
}): string {
  return [
    "You are invited to a Zoom meeting",
    "",
    `Topic: ${meeting.title}`,
    `Time: ${meeting.start_time ? `${formatDateLong(meeting.start_time)}, ${formatTime(meeting.start_time)}` : "Available now"}`,
    `Join link: ${meeting.invite_link}`,
    `Meeting ID: ${meeting.formatted_meeting_code}`,
    `Passcode: ${meeting.passcode}`,
  ].join("\n");
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error("Duration must be a non-negative number.");
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  }
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(`${remainingMinutes} min`);
  }

  return parts.join(" ");
}

export function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const padded = (value: number) => value.toString().padStart(2, "0");
  return hours > 0
    ? `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`
    : `${padded(minutes)}:${padded(seconds)}`;
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }
  return date;
}
