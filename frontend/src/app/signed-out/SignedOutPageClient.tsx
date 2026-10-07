"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { clearAuthToken } from "@/lib/api";

export default function SignedOutPageClient() {
  const router = useRouter();
  const returnToDefaultUser = () => {
    clearAuthToken();
    router.replace("/");
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-zoom-bg p-5">
      <section className="w-full max-w-md rounded-xl border border-zoom-border bg-white p-8 text-center shadow-sm">
        <Link href="/" className="text-[25px] font-black tracking-[-1.5px] text-zoom-blue">
          zoom
        </Link>
        <h1 className="mt-7 text-2xl font-black text-zoom-text">You’re signed out</h1>
        <p className="mt-2 text-sm text-zoom-muted">
          Sign back in to continue as the default user.
        </p>
        <Button className="mt-6 w-full" onClick={returnToDefaultUser}>Sign back in</Button>
      </section>
    </main>
  );
}
