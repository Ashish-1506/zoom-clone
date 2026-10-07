import type { TeamChannel } from "@/lib/types";

export function channelLabel(channel: TeamChannel, currentUserId?: number): string {
  if (!channel.is_direct) return channel.name;
  return channel.members.find((member) => member.id !== currentUserId)?.full_name ?? "Direct message";
}

export function formatDay(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
