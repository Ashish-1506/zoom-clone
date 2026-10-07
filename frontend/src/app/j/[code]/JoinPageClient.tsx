"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { PreJoinPreview } from "@/components/join";
import { Button, Spinner } from "@/components/ui";
import { getMeeting, validateMeeting } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import type { Meeting, MeetingValidation } from "@/lib/types";

export default function JoinPageClient() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meeting, setMeeting] = useState<MeetingValidation | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = `Join meeting | ${APP_NAME}`;
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => setLoading(true));
    void validateMeeting(code)
      .then(async (result) => {
        if (active) {
          setMeeting(result);
          if (!result.exists) setError("This meeting could not be found.");
          else if (result.status === "ended" || result.status === "cancelled") {
            setError("This meeting has ended.");
          } else {
            const details = await getMeeting(code);
            if (active) setMeetingDetails(details);
          }
        }
      })
      .catch(() => active && setError("We could not load this meeting."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [code]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></main>;
  }

  if (error || !meeting?.exists) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zoom-bg p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-zoom-text">Unable to join meeting</h1>
          <p className="mt-3 text-sm text-zoom-muted">{error || "This meeting could not be found."}</p>
          <Button className="mt-6" onClick={() => router.push("/")}>Back to home</Button>
        </div>
      </main>
    );
  }

  if (!meetingDetails) {
    return <main className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></main>;
  }

  return (
    <PreJoinPreview
      meeting={meetingDetails}
      code={code}
      initialName={searchParams.get("name") || ""}
      passcode={searchParams.get("pwd") || undefined}
    />
  );
}
