"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/components/layout";
import { ScheduleForm } from "@/components/schedule";
import { Button } from "@/components/ui";
import { getMeeting } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import type { Meeting } from "@/lib/types";

export default function SchedulePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const editCode = searchParams.get("edit");
  const [meeting, setMeeting] = useState<Meeting>();
  const [loading, setLoading] = useState(Boolean(editCode));
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = editCode
      ? `Edit meeting | ${APP_NAME}`
      : `Schedule meeting | ${APP_NAME}`;
  }, [editCode]);

  useEffect(() => {
    if (!editCode) return;
    void getMeeting(editCode)
      .then(setMeeting)
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load meeting.");
      })
      .finally(() => setLoading(false));
  }, [editCode]);

  if (loading || !user) {
    return (
      <div className="space-y-5" aria-label="Loading schedule form">
        <div className="h-8 w-56 animate-pulse rounded bg-zoom-bg" />
        <div className="h-4 w-80 animate-pulse rounded bg-zoom-bg" />
        <div className="rounded-xl border border-zoom-border bg-white p-6">
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-md bg-zoom-bg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-white p-8 text-center"><p className="text-sm text-zoom-red">{error}</p><Button className="mt-4" onClick={() => router.push("/meetings")}>Back to meetings</Button></div>;
  }

  return (
    <section>
      <p className="text-sm font-bold text-zoom-blue">Workspace</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-zoom-text">
        {meeting ? "Edit meeting" : "Schedule meeting"}
      </h1>
      <p className="mt-2 text-sm text-zoom-muted">Set the details for your upcoming Zoom meeting.</p>
      <div className="mt-7">
        <ScheduleForm userName={user.full_name} editMeeting={meeting} />
      </div>
    </section>
  );
}
