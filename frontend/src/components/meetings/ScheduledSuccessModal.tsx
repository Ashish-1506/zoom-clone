"use client";

import { useEffect, useState } from "react";

import { Button, Modal, Spinner, useToast } from "@/components/ui";
import { getMeeting } from "@/lib/api";
import type { Meeting } from "@/lib/types";
import { buildInvitationText, formatDateLong, formatDuration, formatTime } from "@/lib/utils";

interface ScheduledSuccessModalProps {
  code: string | null;
  onClose: () => void;
}

export function ScheduledSuccessModal({ code, onClose }: ScheduledSuccessModalProps) {
  const { success, error } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!code) {
      queueMicrotask(() => setMeeting(null));
      return;
    }
    let active = true;
    queueMicrotask(() => setLoading(true));
    void getMeeting(code)
      .then((result) => {
        if (active) setMeeting(result);
      })
      .catch((caughtError: unknown) => {
        if (active) error(caughtError instanceof Error ? caughtError.message : "Unable to load meeting.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, error]);

  const copyInvitation = async () => {
    if (!meeting) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(buildInvitationText(meeting));
      success("Invitation copied to clipboard");
    } catch {
      error("Unable to copy invitation");
    } finally {
      setCopying(false);
    }
  };

  return (
    <Modal open={Boolean(code)} title="Meeting scheduled" onClose={onClose}>
      {loading || !meeting ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-xl font-black text-zoom-text">{meeting.title}</p>
            <p className="mt-1 text-sm text-zoom-muted">
              {meeting.start_time ? `${formatDateLong(meeting.start_time)}, ${formatTime(meeting.start_time)}` : "Available now"}
              {" · "}
              {formatDuration(meeting.duration_minutes)}
            </p>
          </div>
          <dl className="space-y-3 rounded-lg bg-zoom-bg p-4 text-sm">
            <div><dt className="font-bold text-zoom-muted">Meeting ID</dt><dd className="font-mono text-zoom-text">{meeting.formatted_meeting_code}</dd></div>
            <div><dt className="font-bold text-zoom-muted">Passcode</dt><dd className="text-zoom-text">{meeting.passcode}</dd></div>
            <div><dt className="font-bold text-zoom-muted">Invite link</dt><dd className="break-all text-zoom-blue">{meeting.invite_link}</dd></div>
          </dl>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Done</Button>
            <Button onClick={() => void copyInvitation()} loading={copying}>Copy invitation</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
