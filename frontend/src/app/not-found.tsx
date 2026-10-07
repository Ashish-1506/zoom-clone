import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Page not found | ${APP_NAME}`,
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zoom-bg px-6">
      <section className="w-full max-w-md rounded-xl border border-zoom-border bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-zoom-blue">{APP_NAME}</p>
        <h1 className="mt-4 text-4xl font-black text-zoom-text">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-zoom-muted">The page you requested does not exist or may have moved.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-zoom-blue px-5 text-sm font-bold text-white transition hover:bg-zoom-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
