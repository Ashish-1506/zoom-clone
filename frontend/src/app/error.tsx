"use client";

import { useEffect } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    document.title = `Something went wrong | ${APP_NAME}`;
  }, []);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-zoom-bg px-6">
          <section role="alert" className="w-full max-w-md rounded-xl border border-zoom-border bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-zoom-blue">{APP_NAME}</p>
            <h1 className="mt-4 text-2xl font-black text-zoom-text">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-zoom-muted">We could not load this page. Try again or return to Home.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-md bg-zoom-blue px-5 text-sm font-bold text-white transition hover:bg-zoom-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2">
                Try again
              </button>
              <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-zoom-blue-light px-5 text-sm font-bold text-zoom-blue transition hover:bg-[#d9e6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2">
                Home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
