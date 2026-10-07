"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, Modal } from "@/components/ui";
import { validateMeeting } from "@/lib/api";
import { parseMeetingInput } from "@/lib/utils";

interface JoinModalProps {
  open: boolean;
  defaultName: string;
  onClose: () => void;
}

export function JoinModal({ open, defaultName, onClose }: JoinModalProps) {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setName(defaultName);
        setMeetingInput("");
        setError("");
      });
    }
  }, [defaultName, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = parseMeetingInput(meetingInput);
    if (!code) {
      setError("This meeting ID is not valid. Please check and try again.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const meeting = await validateMeeting(code);
      if (!meeting.exists) {
        setError("This meeting ID is not valid. Please check and try again.");
      } else if (meeting.status === "ended" || meeting.status === "cancelled") {
        setError("This meeting has ended.");
      } else {
        router.push(`/j/${code}?name=${encodeURIComponent(name.trim())}`);
        onClose();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to validate this meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="Join meeting" onClose={onClose}>
      <form className="space-y-5" onSubmit={submit}>
        <Input
          id="meeting-input"
          label="Meeting ID or personal link name"
          placeholder="123 4567 8901 or invite link"
          value={meetingInput}
          onChange={(event) => setMeetingInput(event.target.value)}
          autoFocus
        />
        <Input
          id="join-name"
          label="Your name"
          placeholder="Enter your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {error && <p className="text-sm text-zoom-red" role="alert">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting} disabled={!meetingInput.trim() || !name.trim()}>
            Join
          </Button>
        </div>
      </form>
    </Modal>
  );
}
