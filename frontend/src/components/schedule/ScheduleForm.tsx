"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast, Button } from "@/components/ui";
import { scheduleMeeting, updateMeeting } from "@/lib/api";
import type { Meeting } from "@/lib/types";
import {
  ScheduleFields,
  type ScheduleFormErrors,
  type ScheduleFormValues,
} from "./ScheduleFields";
import { initialScheduleValues, localDateParts } from "./scheduleFormUtils";

interface ScheduleFormProps {
  userName: string;
  editMeeting?: Meeting;
}

export function ScheduleForm({ userName, editMeeting }: ScheduleFormProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [values, setValues] = useState(() => initialScheduleValues(userName, editMeeting));
  const [errors, setErrors] = useState<ScheduleFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const timezones = useMemo(() => {
    const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return [...new Set([current, "UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"])].sort();
  }, []);

  const setValue = <K extends keyof ScheduleFormValues>(
    field: K,
    value: ScheduleFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
  };

  const validate = (): { start: Date; duration: number } | null => {
    const nextErrors: ScheduleFormErrors = {};
    const duration = Number(values.hours) * 60 + Number(values.minutes);
    const start = new Date(`${values.date}T${values.time}`);

    if (!values.title.trim()) nextErrors.title = "Topic is required.";
    if (!values.date) nextErrors.date = "Choose a date.";
    if (!values.time) nextErrors.time = "Choose a time.";
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      nextErrors.time = "Choose a future date and time.";
    }
    if (!Number.isFinite(duration) || duration < 5) {
      nextErrors.duration = "Duration must be at least 5 minutes.";
    } else if (duration > 1440) {
      nextErrors.duration = "Duration cannot exceed 24 hours.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 ? { start, duration } : null;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validated = validate();
    if (!validated) return;
    setSubmitting(true);

    try {
      if (editMeeting) {
        await updateMeeting(editMeeting.meeting_code, {
          title: values.title.trim(),
          description: values.description.trim() || null,
          start_time: validated.start.toISOString(),
          duration_minutes: validated.duration,
          timezone: values.timezone,
        });
        success("Meeting scheduled");
        router.push(`/meetings?scheduled=${editMeeting.meeting_code}`);
      } else {
        const meeting = await scheduleMeeting({
          title: values.title.trim(),
          description: values.description.trim() || undefined,
          start_time: validated.start.toISOString(),
          duration_minutes: validated.duration,
          timezone: values.timezone,
        });
        success("Meeting scheduled");
        router.push(`/meetings?scheduled=${meeting.meeting_code}`);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to save meeting.";
      setErrors({ submit: message });
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-zoom-border bg-white p-5 shadow-sm sm:p-8">
      <ScheduleFields
        values={values}
        errors={errors}
        timezones={timezones}
        minimumDate={localDateParts(new Date()).date}
        setValue={setValue}
      />
      {errors.submit && <p className="mt-5 text-sm text-zoom-red" role="alert">{errors.submit}</p>}
      <div className="sticky bottom-0 -mx-5 mt-8 flex justify-end gap-3 border-t border-zoom-border bg-white/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="secondary" className="min-h-11 flex-1 sm:min-h-0 sm:flex-none" type="button" onClick={() => router.back()}>Cancel</Button>
        <Button className="min-h-11 flex-1 sm:min-h-0 sm:flex-none" type="submit" loading={submitting}>{editMeeting ? "Save changes" : "Save"}</Button>
      </div>
    </form>
  );
}
