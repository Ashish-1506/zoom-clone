"use client";

import { Button, Modal } from "@/components/ui";
import type { Meeting } from "@/lib/types";

interface DeleteMeetingModalProps {
  meeting: Meeting | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteMeetingModal({
  meeting,
  deleting,
  onClose,
  onConfirm,
}: DeleteMeetingModalProps) {
  return (
    <Modal open={Boolean(meeting)} title="Delete meeting?" onClose={onClose}>
      <p className="text-sm leading-6 text-zoom-muted">
        Are you sure you want to cancel <strong className="text-zoom-text">{meeting?.title}</strong>?
        This meeting will no longer appear in your upcoming meetings.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Keep meeting</Button>
        <Button variant="danger" loading={deleting} onClick={onConfirm}>Delete meeting</Button>
      </div>
    </Modal>
  );
}
