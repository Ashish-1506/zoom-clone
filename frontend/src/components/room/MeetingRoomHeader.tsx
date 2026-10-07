"use client";

import { useState } from "react";
import { Clock3, GalleryHorizontal, Info, LayoutList, ShieldCheck } from "lucide-react";

import { updateMeetingSecurity } from "@/lib/api";
import { formatElapsedTime } from "@/lib/utils";
import type { Meeting, Participant } from "@/lib/types";
import { LiveCaptions } from "./LiveCaptions";

interface MeetingRoomHeaderProps {
  code: string;
  meeting: Meeting | null;
  participant: Participant;
  elapsed: number;
  view: "speaker" | "gallery";
  isHost: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  onRecordToggle: () => void;
  onViewChange: (view: "speaker" | "gallery") => void;
  onMeetingChange: (meeting: Meeting) => void;
  onError: (message: string) => void;
}

export function MeetingRoomHeader(props: MeetingRoomHeaderProps) {
  const [securityOpen, setSecurityOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const updateSecurity = async (key: "is_locked" | "chat_enabled", value: boolean) => {
    if (!props.meeting || !props.isHost) return;
    try {
      const meeting = await updateMeetingSecurity(props.code, props.participant.id, {
        is_locked: key === "is_locked" ? value : props.meeting.is_locked,
        chat_enabled: key === "chat_enabled" ? value : props.meeting.chat_enabled,
      });
      props.onMeetingChange(meeting);
    } catch (caughtError) {
      props.onError(caughtError instanceof Error ? caughtError.message : "Unable to update meeting security.");
    }
  };

  const copyInvite = async () => {
    if (!props.meeting) return;
    try {
      await navigator.clipboard.writeText(props.meeting.invite_link);
    } catch {
      props.onError("Unable to copy the meeting invitation.");
    }
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-room-toolbar px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {props.isHost ? (
          <div className="relative">
            <button type="button" aria-label="Meeting security" title="Meeting security" onClick={() => setSecurityOpen((open) => !open)} className="flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
              <ShieldCheck className={`size-5 ${props.meeting?.is_locked ? "text-zoom-red" : "text-zoom-green"}`} />
            </button>
            {securityOpen && props.meeting && (
              <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-lg bg-white p-3 text-zoom-text shadow-xl">
                <SecurityToggle label="Lock meeting" checked={props.meeting.is_locked} onChange={(value) => void updateSecurity("is_locked", value)} />
                <SecurityToggle label="Allow participants to chat" checked={props.meeting.chat_enabled} onChange={(value) => void updateSecurity("chat_enabled", value)} />
              </div>
            )}
          </div>
        ) : (
          <ShieldCheck className={`size-5 shrink-0 ${props.meeting?.is_locked ? "text-zoom-red" : "text-zoom-green"}`} aria-label="Meeting security" />
        )}
        <span className="truncate text-sm font-bold">{props.meeting?.title ?? "Meeting room"}</span>
        <span className="hidden items-center gap-1 text-xs text-white/60 sm:flex"><Clock3 className="size-3.5" /> {formatElapsedTime(props.elapsed)}</span>
        <button type="button" onClick={props.onRecordToggle} className="flex min-h-10 items-center gap-1 rounded px-2 text-xs text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue" aria-label={props.isRecording ? "Stop recording" : "Record meeting"} title={props.isRecording ? "Stop recording" : "Record meeting"}>
          <span className={`size-2 rounded-full ${props.isRecording ? "animate-pulse bg-zoom-red" : "bg-white/70"}`} />
          <span className="hidden sm:inline">{props.isRecording ? `Recording ${formatElapsedTime(props.recordingSeconds)}` : "Record"}</span>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <LiveCaptions />
        {props.meeting && (
          <div className="relative">
            <button type="button" aria-label="Meeting info" title="Meeting info" onClick={() => setInfoOpen((open) => !open)} className="flex size-10 items-center justify-center rounded text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
              <Info className="size-4" />
            </button>
            {infoOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg bg-white p-4 text-sm text-zoom-text shadow-xl">
                <p className="font-bold">{props.meeting.title}</p>
                <p className="mt-2 text-zoom-muted">Meeting ID: {props.meeting.formatted_meeting_code}</p>
                <p className="mt-1 text-zoom-muted">Passcode: {props.meeting.passcode}</p>
                <p className="mt-2 break-all text-xs text-zoom-muted">{props.meeting.invite_link}</p>
                <button type="button" onClick={() => void copyInvite()} className="mt-3 min-h-11 w-full rounded-md bg-zoom-blue px-3 text-white hover:bg-zoom-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2">Copy invitation</button>
              </div>
            )}
          </div>
        )}
        <button type="button" aria-label="Speaker view" onClick={() => props.onViewChange("speaker")} className={`flex min-h-10 items-center rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${props.view === "speaker" ? "bg-white/15 text-white" : "text-white/60"}`}>
          <LayoutList className="mr-1 size-3.5" /> <span className="hidden sm:inline">Speaker</span>
        </button>
        <button type="button" aria-label="Gallery view" onClick={() => props.onViewChange("gallery")} className={`flex min-h-10 items-center rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${props.view === "gallery" ? "bg-white/15 text-white" : "text-white/60"}`}>
          <GalleryHorizontal className="mr-1 size-3.5" /> <span className="hidden sm:inline">Gallery</span>
        </button>
      </div>
    </header>
  );
}

function SecurityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-zoom-blue" />
    </label>
  );
}
