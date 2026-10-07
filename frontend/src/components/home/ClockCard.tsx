"use client";

import { useEffect, useState } from "react";

import { formatDateLong } from "@/lib/utils";
import { CLOCK_UPDATE_INTERVAL_MS } from "@/lib/constants";
import { useSettings } from "@/components/settings/SettingsProvider";

function getNow(): Date {
  return new Date();
}

export function ClockCard() {
  const [now, setNow] = useState<Date>(getNow);
  const { settings } = useSettings();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(getNow()), CLOCK_UPDATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-zoom-border bg-white px-6 py-7 shadow-sm">
      <p className="text-5xl font-black tracking-tight text-zoom-text sm:text-6xl">
        {now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: !settings.use_24_hour_time,
        })}
      </p>
      <p className="mt-2 text-sm font-bold text-zoom-muted">{formatDateLong(now)}</p>
    </div>
  );
}
