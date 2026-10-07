"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (/^\/whiteboards\/\d+$/.test(pathname)) return <>{children}</>;
  return (
    <div className="min-h-screen bg-white text-zoom-text dark:bg-[#18191b]">
      <Navbar />
      <div className="flex min-h-[calc(100vh-3.5rem)] bg-zoom-bg dark:bg-[#202124]">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-8">
          <div className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
