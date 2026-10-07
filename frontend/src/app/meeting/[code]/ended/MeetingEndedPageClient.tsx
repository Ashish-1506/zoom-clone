"use client";

import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui";

export default function MeetingEndedPageClient() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-room-bg p-6 text-center text-white">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">You left the meeting</h1>
        <p className="mt-2 text-sm text-white/65">Meeting {code} has ended for you.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => router.push(`/j/${encodeURIComponent(code)}`)}>Rejoin</Button>
          <Button variant="secondary" onClick={() => router.push("/")}>Back to home</Button>
        </div>
      </div>
    </main>
  );
}
