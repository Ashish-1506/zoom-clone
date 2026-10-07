"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ContactRound,
  Home,
  MessageSquare,
  Phone,
  Presentation,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/", icon: Home },
  { label: "Meetings", href: "/meetings", icon: CalendarDays },
  { label: "Team Chat", href: "/team-chat", icon: MessageSquare },
  { label: "Phone", href: "/phone", icon: Phone },
  { label: "Whiteboards", href: "/whiteboards", icon: Presentation },
  { label: "Scheduler", href: "/scheduler", icon: CalendarClock },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 border-t border-zoom-border bg-white px-1 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:w-[190px] md:shrink-0 md:flex-col md:border-0 md:bg-transparent md:px-3 md:py-5">
      <div className="flex w-full items-center justify-around md:flex-col md:gap-2">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          const itemClass = cn(
            "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-bold text-zoom-muted transition md:w-16 md:flex-none md:py-2",
            isActive && "bg-zoom-blue-light text-zoom-blue",
            !isActive && "hover:bg-white hover:text-zoom-text",
          );

          return (
            <Link key={label} href={href} className={itemClass} aria-current={isActive ? "page" : undefined}>
              <Icon className="size-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto hidden w-full flex-col gap-2 px-2 md:flex">
        <Link
          href="/profile"
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-xs font-bold text-zoom-muted hover:bg-white hover:text-zoom-text",
            pathname === "/profile" && "bg-zoom-blue-light text-zoom-blue",
          )}
        >
          <ContactRound className="size-4 shrink-0" /> Profile
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-xs font-bold text-zoom-muted hover:bg-white hover:text-zoom-text",
            pathname === "/settings" && "bg-zoom-blue-light text-zoom-blue",
          )}
        >
          <Settings className="size-4 shrink-0" /> Settings
        </Link>
      </div>
    </nav>
  );
}
