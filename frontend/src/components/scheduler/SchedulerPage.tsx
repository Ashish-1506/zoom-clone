"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Link2, Plus } from "lucide-react";

import { Button, EmptyState, Skeleton, useToast } from "@/components/ui";
import {
  createSchedulerLink,
  deleteSchedulerLink,
  listSchedulerBookings,
  listSchedulerLinks,
  updateSchedulerLink,
  type SchedulerLinkInput,
} from "@/lib/api";
import type { SchedulerBooking, SchedulerLink } from "@/lib/types";
import { SchedulerBookings } from "./SchedulerBookings";
import { SchedulerLinkCard } from "./SchedulerLinkCard";
import { SchedulerLinkModal } from "./SchedulerLinkModal";

type SchedulerTab = "links" | "bookings";

export function SchedulerPage() {
  const [tab, setTab] = useState<SchedulerTab>("links");
  const [links, setLinks] = useState<SchedulerLink[]>([]);
  const [bookings, setBookings] = useState<SchedulerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<SchedulerLink | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextLinks, nextBookings] = await Promise.all([
        listSchedulerLinks(),
        listSchedulerBookings(),
      ]);
      setLinks(nextLinks);
      setBookings(nextBookings);
    } catch (caughtError: unknown) {
      setLoadError(caughtError instanceof Error ? caughtError.message : "Unable to load Scheduler.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Scheduler | Zoom Workplace";
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const linkTitles = useMemo(
    () => new Map(links.map((link) => [link.id, link.title])),
    [links],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (link: SchedulerLink) => {
    setEditing(link);
    setModalOpen(true);
  };

  const saveLink = async (data: SchedulerLinkInput) => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = editing
        ? await updateSchedulerLink(editing.id, data)
        : await createSchedulerLink(data);
      setLinks((current) => editing
        ? current.map((link) => link.id === saved.id ? saved : link)
        : [saved, ...current]);
      setModalOpen(false);
      setEditing(null);
      success(editing ? "Scheduling link updated" : "Scheduling link created");
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to save scheduling link.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLink = async (link: SchedulerLink) => {
    try {
      const updated = await updateSchedulerLink(link.id, { is_active: !link.is_active });
      setLinks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to update scheduling link.");
    }
  };

  const removeLink = async (link: SchedulerLink) => {
    if (!window.confirm(`Delete "${link.title}" and its booking history?`)) return;
    try {
      await deleteSchedulerLink(link.id);
      setLinks((current) => current.filter((item) => item.id !== link.id));
      setBookings((current) => current.filter((booking) => booking.link_id !== link.id));
      success("Scheduling link deleted");
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to delete scheduling link.");
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zoom-blue">Workspace</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zoom-text">Scheduler</h1>
          <p className="mt-2 text-sm text-zoom-muted">Share your availability and let guests book time with you.</p>
        </div>
        {tab === "links" && <Button onClick={openCreate}><Plus className="size-4" />Create scheduling link</Button>}
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-zoom-border" role="tablist" aria-label="Scheduler sections">
        <button type="button" role="tab" aria-selected={tab === "links"} onClick={() => setTab("links")} className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${tab === "links" ? "border-zoom-blue text-zoom-blue" : "border-transparent text-zoom-muted hover:text-zoom-text"}`}>
          <Link2 className="size-4" />Scheduling links
        </button>
        <button type="button" role="tab" aria-selected={tab === "bookings"} onClick={() => setTab("bookings")} className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${tab === "bookings" ? "border-zoom-blue text-zoom-blue" : "border-transparent text-zoom-muted hover:text-zoom-text"}`}>
          <CalendarDays className="size-4" />Bookings
          <span className="rounded-full bg-zoom-bg px-2 py-0.5 text-xs">{bookings.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading Scheduler">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-zoom-border bg-white p-8 text-center">
          <p role="alert" className="text-sm text-zoom-red">{loadError}</p>
          <Button className="mt-4" onClick={() => void load()}>Retry</Button>
        </div>
      ) : tab === "links" ? (
        links.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {links.map((link) => (
              <SchedulerLinkCard
                key={link.id}
                link={link}
                onEdit={() => openEdit(link)}
                onToggle={() => void toggleLink(link)}
                onDelete={() => void removeLink(link)}
                onCopied={() => success("Booking link copied")}
                onCopyError={() => error("Unable to copy booking link")}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Link2 className="size-6" />}
            title="Create your first scheduling link"
            text="Guests can choose an available time and receive a Zoom meeting link."
            action={<Button onClick={openCreate}>Create scheduling link</Button>}
          />
        )
      ) : (
        <SchedulerBookings bookings={bookings} linkTitles={linkTitles} />
      )}

      <SchedulerLinkModal
        open={modalOpen}
        link={editing}
        saving={saving}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={saveLink}
      />
    </section>
  );
}
