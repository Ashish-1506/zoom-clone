import type { Meeting } from "@/lib/types";
import { DEFAULT_MEETING_DURATION_MINUTES } from "@/lib/constants";
import type { ScheduleFormValues } from "./ScheduleFields";

function nextFullHour(): Date {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

export function localDateParts(value: Date): Pick<ScheduleFormValues, "date" | "time"> {
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

function randomPasscode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] % 36 ** 6).toString(36).padStart(6, "0").toUpperCase();
}

export function initialScheduleValues(
  userName: string,
  meeting?: Meeting,
): ScheduleFormValues {
  const start = meeting?.start_time ? new Date(meeting.start_time) : nextFullHour();
  const parts = localDateParts(start);
  return {
    title: meeting?.title ?? `${userName}'s Zoom Meeting`,
    description: meeting?.description ?? "",
    date: parts.date,
    time: parts.time,
    hours: String(
      Math.floor(
        (meeting?.duration_minutes ?? DEFAULT_MEETING_DURATION_MINUTES) / 60,
      ),
    ),
    minutes: String(
      (meeting?.duration_minutes ?? DEFAULT_MEETING_DURATION_MINUTES) % 60,
    ),
    timezone:
      meeting?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    meetingId: "automatic",
    passcode: meeting?.passcode ?? randomPasscode(),
  };
}
