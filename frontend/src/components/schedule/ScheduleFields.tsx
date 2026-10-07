import { Input, Textarea } from "@/components/ui";
import { MAX_MEETING_DESCRIPTION_LENGTH } from "@/lib/constants";

export interface ScheduleFormValues {
  title: string;
  description: string;
  date: string;
  time: string;
  hours: string;
  minutes: string;
  timezone: string;
  meetingId: "automatic" | "personal";
  passcode: string;
}

export type ScheduleFormErrors = Partial<
  Record<"title" | "date" | "time" | "duration" | "submit", string>
>;

interface ScheduleFieldsProps {
  values: ScheduleFormValues;
  errors: ScheduleFormErrors;
  timezones: string[];
  minimumDate: string;
  setValue: <K extends keyof ScheduleFormValues>(
    field: K,
    value: ScheduleFormValues[K],
  ) => void;
}

export function ScheduleFields({
  values,
  errors,
  timezones,
  minimumDate,
  setValue,
}: ScheduleFieldsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <Input
          id="schedule-title"
          label="Topic"
          value={values.title}
          onChange={(event) => setValue("title", event.target.value)}
          error={errors.title}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          id="schedule-description"
          label="Description"
          value={values.description}
          onChange={(event) => setValue("description", event.target.value)}
          maxLength={MAX_MEETING_DESCRIPTION_LENGTH}
          placeholder="Add a description (optional)"
        />
      </div>
      <Input
        id="schedule-date"
        label="Date"
        type="date"
        min={minimumDate}
        value={values.date}
        onChange={(event) => setValue("date", event.target.value)}
        error={errors.date}
        required
      />
      <Input
        id="schedule-time"
        label="Time"
        type="time"
        value={values.time}
        onChange={(event) => setValue("time", event.target.value)}
        error={errors.time}
        required
      />
      <div>
        <span className="mb-1.5 block text-sm font-bold text-zoom-text">Duration</span>
        <div className="flex gap-2">
          <select
            className="w-full rounded-md border border-zoom-border bg-white px-3 py-2.5 text-sm"
            value={values.hours}
            onChange={(event) => setValue("hours", event.target.value)}
            aria-label="Duration hours"
          >
            {Array.from({ length: 25 }, (_, hour) => (
              <option key={hour} value={hour}>{hour} hr</option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-zoom-border bg-white px-3 py-2.5 text-sm"
            value={values.minutes}
            onChange={(event) => setValue("minutes", event.target.value)}
            aria-label="Duration minutes"
          >
            {[0, 15, 30, 45].map((minute) => (
              <option key={minute} value={minute}>{minute} min</option>
            ))}
          </select>
        </div>
        {errors.duration && (
          <p className="mt-1 text-xs text-zoom-red">{errors.duration}</p>
        )}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-zoom-text">Time zone</span>
        <select
          className="w-full rounded-md border border-zoom-border bg-white px-3 py-2.5 text-sm"
          value={values.timezone}
          onChange={(event) => setValue("timezone", event.target.value)}
        >
          {timezones.map((timezone) => (
            <option key={timezone} value={timezone}>{timezone}</option>
          ))}
        </select>
      </label>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-bold text-zoom-text">Meeting ID</legend>
        <div className="flex flex-wrap gap-5 text-sm">
          {([
            ["automatic", "Generate automatically"],
            ["personal", "Personal Meeting ID"],
          ] as const).map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-zoom-text">
              <input
                type="radio"
                name="meeting-id"
                checked={values.meetingId === id}
                onChange={() => setValue("meetingId", id)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="md:col-span-2">
        <Input
          id="schedule-passcode"
          label="Security passcode"
          value={values.passcode}
          readOnly
          helperText="A secure passcode is generated automatically."
        />
      </div>
    </div>
  );
}
