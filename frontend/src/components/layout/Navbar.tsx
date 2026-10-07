"use client";

import { ChevronDown, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, Button, Modal, Spinner } from "@/components/ui";
import { useCurrentUser } from "@/components/layout/UserProvider";

export function Navbar() {
  const { user, loading, error, signOut } = useCurrentUser();
  const router = useRouter();
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-zoom-border bg-white">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-[25px] font-black tracking-[-1.5px] text-zoom-blue"
          aria-label="Zoom home"
        >
          zoom
        </Link>

        <label className="hidden min-w-0 max-w-[360px] flex-1 md:block">
          <span className="sr-only">Search</span>
          <span className="flex h-9 items-center gap-2 rounded-full bg-zoom-bg px-3 text-zoom-muted ring-1 ring-transparent focus-within:ring-zoom-blue">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-sm text-zoom-text outline-none placeholder:text-zoom-muted"
            />
          </span>
        </label>
        <Button variant="ghost" size="sm" className="inline-flex min-h-11 min-w-11 p-0 md:hidden" aria-label="Search meetings" title="Search meetings" onClick={() => router.push("/meetings")}>
          <Search className="size-5" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className="inline-flex size-10 items-center justify-center rounded-md text-zoom-text hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
          >
            <Settings className="size-[18px]" aria-hidden="true" />
          </Link>
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2"
              aria-label="Open account menu"
            >
              {loading || !user ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-zoom-bg">
                  {loading ? <Spinner size="sm" /> : <span className="text-xs text-zoom-muted">?</span>}
                </span>
              ) : (
                <Avatar name={user.full_name} color={user.avatar_color} size="sm" />
              )}
              <ChevronDown className="hidden size-4 text-zoom-muted sm:block" aria-hidden="true" />
            </button>
            <div className="invisible absolute right-0 top-full mt-2 w-64 translate-y-1 rounded-lg border border-zoom-border bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {user ? (
                <div className="border-b border-zoom-border px-3 py-2">
                  <p className="truncate text-sm font-bold text-zoom-text">{user.full_name}</p>
                  <p className="truncate text-xs text-zoom-muted">{user.email}</p>
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-zoom-muted">
                  {error ?? "Loading profile..."}
                </p>
              )}
              <Link href="/settings" className="block min-h-11 rounded-md px-3 py-3 text-sm text-zoom-text transition hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
                Settings
              </Link>
              <Link href="/profile" className="block min-h-11 rounded-md px-3 py-3 text-sm text-zoom-text transition hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
                Profile
              </Link>
              <button
                type="button"
                className="min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-zoom-text transition hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
                onClick={() => setSignOutOpen(true)}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={signOutOpen}
        title="Sign out?"
        onClose={() => setSignOutOpen(false)}
      >
        <p className="text-sm text-zoom-muted">
          You can continue afterward as the default user.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSignOutOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setSignOutOpen(false);
              signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </Modal>
    </header>
  );
}
