"use client";

import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui";
import type { SchedulerLink } from "@/lib/types";

interface SchedulerLinkCardProps {
  link: SchedulerLink;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onCopied: () => void;
  onCopyError: () => void;
}

export function SchedulerLinkCard({
  link,
  onEdit,
  onToggle,
  onDelete,
  onCopied,
  onCopyError,
}: SchedulerLinkCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/book/${link.slug}`);
      onCopied();
    } catch {
      onCopyError();
    }
  };

  return (
    <article className="rounded-xl border border-zoom-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-zoom-text">{link.title}</h2>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${link.is_active ? "bg-green-50 text-zoom-green" : "bg-zoom-bg text-zoom-muted"}`}>
              {link.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-zoom-muted">{link.description || "No description added."}</p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={`More actions for ${link.title}`}
            title="More actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-md text-zoom-muted hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
          >
            <MoreHorizontal className="size-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-10 w-44 rounded-lg border border-zoom-border bg-white p-1 shadow-lg">
              <MenuButton onClick={() => { setMenuOpen(false); onEdit(); }}>Edit link</MenuButton>
              <MenuButton onClick={() => { setMenuOpen(false); onToggle(); }}>{link.is_active ? "Deactivate" : "Activate"}</MenuButton>
              <MenuButton danger onClick={() => { setMenuOpen(false); onDelete(); }}>Delete</MenuButton>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-zoom-muted">
        {link.duration_minutes} min · {link.available_days.length} days/week · {link.start_hour}:00–{link.end_hour}:00 {link.timezone}
      </p>
      <div className="mt-4 flex items-center gap-2 border-t border-zoom-border pt-4">
        <p className="min-w-0 flex-1 truncate text-xs text-zoom-muted" title={`/book/${link.slug}`}>/book/{link.slug}</p>
        <Button size="sm" variant="secondary" onClick={() => void copyLink()}><Copy className="size-4" />Copy link</Button>
        <a
          href={`/book/${link.slug}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${link.title} booking page`}
          title="Open booking page"
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-zoom-muted hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>
    </article>
  );
}

function MenuButton({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-10 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${danger ? "text-zoom-red" : "text-zoom-text"}`}>
      {children}
    </button>
  );
}
