"use client";

import { useState } from "react";

import { Button, Modal, useToast } from "@/components/ui";
import { buildInvitationText, formatDateLong, formatTime } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

interface InviteModalProps {
  meeting: Meeting | null;
  onClose: () => void;
}

export function InviteModal({ meeting, onClose }: InviteModalProps) {
  const { success, error } = useToast();
  const [copying, setCopying] = useState(false);

  if (!meeting) return null;

  const invitation = buildInvitationText(meeting);

  const copyInvitation = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(invitation);
      success("Invitation copied to clipboard");
    } catch {
      error("Unable to copy invitation");
    } finally {
      setCopying(false);
    }
  };

  return (
    <Modal open={Boolean(meeting)} title="Meeting invitation" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="rounded-lg bg-zoom-bg p-4">
          <dl className="space-y-3">
            {[
              ["Topic", meeting.title],
              ["Time", meeting.start_time ? `${formatDateLong(meeting.start_time)}, ${formatTime(meeting.start_time)}` : "Available now"],
              ["Join link", meeting.invite_link],
              ["Meeting ID", meeting.formatted_meeting_code],
              ["Passcode", meeting.passcode],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-zoom-muted">{label}</dt>
                <dd className="mt-0.5 break-all text-zoom-text">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={copyInvitation} loading={copying}>Copy invitation</Button>
        </div>
      </div>
    </Modal>
  );
}
