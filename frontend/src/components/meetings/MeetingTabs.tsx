"use client";

export type MeetingTab = "upcoming" | "previous" | "personal";

interface MeetingTabsProps {
  activeTab: MeetingTab;
  onChange: (tab: MeetingTab) => void;
}

const tabs: Array<{ id: MeetingTab; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "previous", label: "Previous" },
  { id: "personal", label: "Personal Room" },
];

export function MeetingTabs({ activeTab, onChange }: MeetingTabsProps) {
  return (
    <div className="mt-7 flex gap-4 overflow-x-auto border-b border-zoom-border sm:gap-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`min-h-11 shrink-0 border-b-2 px-1 pb-3 text-sm font-bold transition ${
            activeTab === tab.id
              ? "border-zoom-blue text-zoom-blue"
              : "border-transparent text-zoom-muted hover:text-zoom-text"
          }`}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
