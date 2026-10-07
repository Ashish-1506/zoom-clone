"use client";

import { Copy, ExternalLink, UserRound } from "lucide-react";

import { Button, Skeleton, useToast } from "@/components/ui";
import type { User } from "@/lib/types";

export function PersonalRoom({
  user,
  onStart,
}: {
  user: User | null;
  onStart: () => void;
}) {
  const { info, error } = useToast();
  if (!user) {
    return (
      <div className="space-y-3 rounded-xl border border-zoom-border bg-white p-4">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  const link = `${window.location.origin}/j/${user.personal_meeting_id}`;
  return (
    <div className="max-w-2xl rounded-xl border border-zoom-border bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-zoom-blue-light p-3 text-zoom-blue">
          <UserRound className="size-6" />
        </div>
        <div>
          <h2 className="font-black text-zoom-text">{user.full_name}&apos;s Personal Room</h2>
          <p className="text-sm text-zoom-muted">Your always-available meeting room</p>
        </div>
      </div>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="font-bold text-zoom-muted">Personal meeting ID</dt>
          <dd className="mt-1 font-mono text-zoom-text">{user.personal_meeting_id}</dd>
        </div>
        <div>
          <dt className="font-bold text-zoom-muted">Invite link</dt>
          <dd className="mt-1 break-all text-zoom-blue">{link}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onStart}>Start</Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard
              .writeText(link)
              .then(() => info("Personal Room link copied"))
              .catch(() => error("Unable to copy the Personal Room link"));
          }}
        >
          <Copy className="size-4" />
          Copy
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="size-4" />
          Open link
        </Button>
      </div>
    </div>
  );
}
