"use client";

import { useEffect, useState } from "react";

import { Button, Input, Modal, Textarea } from "@/components/ui";
import type { SchedulerLinkInput } from "@/lib/api";
import type { SchedulerLink } from "@/lib/types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function createInitialForm(link: SchedulerLink | null): SchedulerLinkInput {
  if (link) {
    return {
      slug: link.slug,
      title: link.title,
      description: link.description,
      duration_minutes: link.duration_minutes,
      available_days: [...link.available_days],
      start_hour: link.start_hour,
      end_hour: link.end_hour,
      timezone: link.timezone,
      is_active: link.is_active,
    };
  }
  return {
    slug: "",
    title: "",
    description: "",
    duration_minutes: 30,
    available_days: [0, 1, 2, 3, 4],
    start_hour: 9,
    end_hour: 17,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    is_active: true,
  };
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function SchedulerLinkModal({
  open,
  link,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  link: SchedulerLink | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: SchedulerLinkInput) => Promise<void>;
}) {
  const [form, setForm] = useState<SchedulerLinkInput>(() => createInitialForm(link));
  const [slugEdited, setSlugEdited] = useState(Boolean(link));
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setForm(createInitialForm(link));
      setSlugEdited(Boolean(link));
      setFormError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [link, open]);

  const update = <K extends keyof SchedulerLinkInput>(key: K, value: SchedulerLinkInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) { setFormError("Enter a title."); return; }
    if (form.slug.trim().length < 3) { setFormError("The booking URL needs at least 3 characters."); return; }
    if (!form.available_days.length) { setFormError("Select at least one available day."); return; }
    if (form.end_hour <= form.start_hour) { setFormError("End time must be after start time."); return; }
    await onSubmit({ ...form, slug: slugify(form.slug), title: form.title.trim(), description: form.description.trim() });
  };

  const zones = [...new Set([
    form.timezone,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    "UTC",
    "America/New_York",
    "Europe/London",
    "Asia/Kolkata",
    "Asia/Tokyo",
  ])];

  return (
    <Modal open={open} title={link ? "Edit scheduling link" : "Create scheduling link"} onClose={onClose} className="max-w-2xl">
      <form onSubmit={(event) => void submit(event)} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="scheduler-title" label="Event title" required maxLength={120} value={form.title} onChange={(event) => {
              update("title", event.target.value);
              if (!slugEdited) update("slug", slugify(event.target.value));
            }} placeholder="30-minute product chat" />
          <div>
            <Input id="scheduler-slug" label="Booking URL slug" required minLength={3} maxLength={100} value={form.slug} onChange={(event) => {
              setSlugEdited(true);
              update("slug", slugify(event.target.value));
            }} placeholder="product-chat" />
            <span className="mt-1 block text-xs text-zoom-muted">/book/{form.slug || "your-link"}</span>
          </div>
          <label className="text-sm font-bold text-zoom-text sm:col-span-2">Description
            <Textarea maxLength={2000} rows={2} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What should guests expect?" className="mt-1" />
          </label>
          <label className="text-sm font-bold text-zoom-text">Duration
            <Select value={form.duration_minutes} onChange={(value) => update("duration_minutes", Number(value))}>
              {[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </Select>
          </label>
          <label className="text-sm font-bold text-zoom-text">Timezone
            <Select value={form.timezone} onChange={(value) => update("timezone", value)}>
              {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </Select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-bold text-zoom-text">Available days</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map((day, index) => (
                <label key={day} className="flex min-h-10 items-center gap-1.5 rounded border border-zoom-border px-2 text-xs">
                  <input type="checkbox" checked={form.available_days.includes(index)} onChange={(event) => update(
                    "available_days",
                    event.target.checked
                      ? [...form.available_days, index].sort()
                      : form.available_days.filter((value) => value !== index),
                  )} />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm font-bold text-zoom-text">Start time
            <Select value={form.start_hour} onChange={(value) => update("start_hour", Number(value))}>
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
            </Select>
          </label>
          <label className="text-sm font-bold text-zoom-text">End time
            <Select value={form.end_hour} onChange={(value) => update("end_hour", Number(value))}>
              {Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
            </Select>
          </label>
        </div>
        {formError && <p role="alert" className="text-sm text-zoom-red">{formError}</p>}
        <div className="flex justify-end gap-3 border-t border-zoom-border pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{link ? "Save changes" : "Create link"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Select({ value, onChange, children }: { value: number | string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-zoom-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">{children}</select>;
}
