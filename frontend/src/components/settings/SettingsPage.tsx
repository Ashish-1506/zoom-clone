"use client";

import { useState } from "react";

import { AudioSettings } from "./AudioSettings";
import { AdditionalSettings } from "./AdditionalSettings";
import { GeneralSettings } from "./GeneralSettings";
import { useSettings } from "./SettingsProvider";
import { VideoSettings } from "./VideoSettings";

const tabs = [
  "General",
  "Video",
  "Audio",
  "Share Screen",
  "Chat",
  "Background",
  "Recording",
  "Notifications",
  "Accessibility",
] as const;

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("General");
  const { loading } = useSettings();

  return (
    <div>
      <p className="text-sm font-bold text-zoom-blue">Preferences</p>
      <h1 className="mt-1 text-3xl font-black text-zoom-text">Settings</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav
          aria-label="Settings categories"
          className="flex gap-1 overflow-x-auto rounded-lg border border-zoom-border bg-white p-2 lg:flex-col lg:overflow-visible"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => setActiveTab(tab)}
              className={`min-h-11 shrink-0 rounded-md px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${
                activeTab === tab
                  ? "bg-zoom-blue-light text-zoom-blue"
                  : "text-zoom-muted hover:bg-zoom-bg hover:text-zoom-text"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <section className="min-h-[480px] rounded-xl border border-zoom-border bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-6 border-b border-zoom-border pb-4 text-xl font-bold text-zoom-text">
            {activeTab}
          </h2>
          {loading ? (
            <p className="text-sm text-zoom-muted" role="status">Loading settings…</p>
          ) : (
            <div className="max-w-2xl space-y-8">
              {activeTab === "General" && <GeneralSettings />}
              {activeTab === "Video" && <VideoSettings />}
              {activeTab === "Audio" && <AudioSettings />}
              {!["General", "Video", "Audio"].includes(activeTab) && (
                <AdditionalSettings tab={activeTab} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
