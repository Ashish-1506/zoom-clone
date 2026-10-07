"use client";

import { Check, Copy, Pencil } from "lucide-react";
import { useState } from "react";

import { ProfileAvatar, ProfileEditor } from "@/components/profile/ProfileEditor";
import { useCurrentUser } from "@/components/layout/UserProvider";
import { Button, Skeleton, useToast } from "@/components/ui";
import { formatMeetingCode } from "@/lib/utils";

const fields = [
  ["Email", "email"],
  ["Department", "department"],
  ["Job title", "job_title"],
  ["Location", "location"],
  ["Phone", "phone"],
] as const;

export default function ProfilePage() {
  const { user, loading, error } = useCurrentUser();
  const { success, error: showError } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPersonalId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.personal_meeting_id);
      setCopied(true);
      success("Personal meeting ID copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch (caughtError: unknown) {
      showError(caughtError instanceof Error ? caughtError.message : "Unable to copy ID.");
    }
  };

  if (loading) return <Skeleton className="h-80 w-full max-w-3xl" />;
  if (error || !user) {
    return <p role="alert" className="rounded-lg bg-white p-6 text-sm text-zoom-red">{error ?? "Profile unavailable."}</p>;
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-zoom-blue">Account</p>
        <h1 className="mt-1 text-3xl font-black text-zoom-text">Profile</h1>
      </div>
      <section className="max-w-3xl rounded-xl border border-zoom-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-start gap-5 border-b border-zoom-border pb-6 sm:flex-row sm:items-center">
          <ProfileAvatar name={user.full_name} color={user.avatar_color} />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-zoom-text">{user.full_name}</h2>
            <p className="mt-1 text-sm text-zoom-muted">{user.email}</p>
          </div>
          <Button variant="secondary" onClick={() => setEditorOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        </div>
        <div className="grid gap-x-10 sm:grid-cols-2">
          {fields.map(([label, key]) => (
            <div key={key} className="border-b border-zoom-border py-4 last:border-0">
              <p className="text-xs font-bold uppercase tracking-wide text-zoom-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold text-zoom-text">{user[key] || "Not set"}</p>
            </div>
          ))}
          <div className="border-b border-zoom-border py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zoom-muted">Personal meeting ID</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-sm font-semibold text-zoom-text">{formatMeetingCode(user.personal_meeting_id)}</p>
              <button
                type="button"
                aria-label={copied ? "Copied personal meeting ID" : "Copy personal meeting ID"}
                title="Copy personal meeting ID"
                onClick={() => void copyPersonalId()}
                className="flex size-9 items-center justify-center rounded text-zoom-blue hover:bg-zoom-blue-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>
      <ProfileEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </>
  );
}
