"use client";

import type { ReactNode } from "react";

import type { UserSettings } from "@/lib/types";

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 border-b border-zoom-border py-3 last:border-0">
      <span>
        <span className="block text-sm font-semibold text-zoom-text">{label}</span>
        {description && (
          <span className="mt-1 block text-xs text-zoom-muted">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition peer-checked:bg-zoom-blue peer-focus-visible:ring-2 peer-focus-visible:ring-zoom-blue peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition after:content-[''] peer-checked:after:translate-x-5" />
    </label>
  );
}

export function SettingsSelect<K extends keyof UserSettings>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: UserSettings[K];
  options: Array<{ value: string; label: string }>;
  onChange: (value: UserSettings[K]) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zoom-text">{label}</span>
      <select
        value={String(value)}
        onChange={(event) => onChange(event.target.value as UserSettings[K])}
        className="min-h-11 w-full rounded-md border border-zoom-border bg-white px-3 text-sm text-zoom-text focus:border-zoom-blue focus:outline-none focus:ring-2 focus:ring-zoom-blue/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-sm font-semibold text-zoom-text">
        {label}
        <span className="text-zoom-muted">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-zoom-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
      />
    </label>
  );
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-zoom-muted">
        {title}
      </h2>
      <div className="divide-y divide-zoom-border">{children}</div>
    </section>
  );
}
