"use client";

import { useState, type FormEvent } from "react";

import { Avatar, Button, Input, Modal, useToast } from "@/components/ui";
import { updateCurrentUser } from "@/lib/api";
import { useCurrentUser } from "@/components/layout/UserProvider";
import type { User, UserProfileUpdate } from "@/lib/types";

const profileFields = [
  { key: "full_name", label: "Full name", maxLength: 120 },
  { key: "email", label: "Email", maxLength: 255 },
  { key: "department", label: "Department", maxLength: 120 },
  { key: "job_title", label: "Job title", maxLength: 120 },
  { key: "location", label: "Location", maxLength: 120 },
  { key: "phone", label: "Phone", maxLength: 40 },
] as const;

export function ProfileEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, setUser } = useCurrentUser();
  if (!open || !user) return null;
  return <ProfileEditForm user={user} setUser={setUser} onClose={onClose} />;
}

function ProfileEditForm({
  user,
  setUser,
  onClose,
}: {
  user: User;
  setUser: (user: User) => void;
  onClose: () => void;
}) {
  const { error, success } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserProfileUpdate>({
    full_name: user.full_name,
    email: user.email,
    avatar_color: user.avatar_color,
    department: user.department,
    job_title: user.job_title,
    location: user.location,
    phone: user.phone,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateCurrentUser({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        department: form.department?.trim() || null,
        job_title: form.job_title?.trim() || null,
        location: form.location?.trim() || null,
        phone: form.phone?.trim() || null,
      });
      setUser(updated);
      success("Profile updated");
      onClose();
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Edit profile" onClose={onClose}>
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        {profileFields.map(({ key, label, maxLength }) => (
          <Input
            key={key}
            id={`profile-${key}`}
            label={label}
            type={key === "email" ? "email" : "text"}
            value={form[key] ?? ""}
            maxLength={maxLength}
            required={key === "full_name" || key === "email"}
            onChange={(event) =>
              setForm((current) => ({ ...current, [key]: event.target.value }))
            }
          />
        ))}
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-zoom-text">Avatar color</span>
          <span className="flex min-h-11 items-center gap-3 rounded-md border border-zoom-border px-3">
            <input
              type="color"
              value={form.avatar_color}
              onChange={(event) =>
                setForm((current) => ({ ...current, avatar_color: event.target.value }))
              }
              aria-label="Avatar color"
              className="size-8 cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="text-sm text-zoom-muted">{form.avatar_color}</span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProfileAvatar({ name, color }: { name: string; color: string }) {
  return <Avatar name={name} color={color} size="lg" className="size-24 text-3xl" />;
}
