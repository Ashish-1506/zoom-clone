"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionTiles,
  ClockCard,
  RecentList,
  UpcomingList,
  type NewMeetingOption,
} from "@/components/home";
import { useToast } from "@/components/ui";
import { JoinModal } from "@/components/join";
import { useCurrentUser } from "@/components/layout";
import { useMeetings } from "@/hooks/useMeetings";
import { useMeetingSession } from "@/hooks/useMeetingSession";
import { createInstantMeeting, joinMeeting } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import type { Meeting } from "@/lib/types";

export default function HomePageClient() {
  useEffect(() => {
    document.title = `Home | ${APP_NAME}`;
  }, []);
  const router = useRouter();
  const { error } = useToast();
  const { user } = useCurrentUser();
  const { writeSession } = useMeetingSession();
  const [creating, setCreating] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const upcoming = useMeetings("upcoming");
  const recent = useMeetings("recent");

  const handleNewMeeting = async (option: NewMeetingOption) => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const meeting = await createInstantMeeting(
        undefined,
        option === "personal-meeting-id",
      );
      const participant = await joinMeeting(
        meeting.meeting_code,
        { display_name: user.full_name, passcode: meeting.passcode },
        user.id,
      );
      writeSession(meeting.meeting_code, participant, option !== "video-off");
      router.push(`/meeting/${meeting.meeting_code}`);
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to start meeting.");
    } finally {
      setCreating(false);
    }
  };

  const startMeeting = async (meeting: Meeting) => {
    if (!user) return;
    try {
      const participant = await joinMeeting(
        meeting.meeting_code,
        { display_name: user.full_name, passcode: meeting.passcode },
        user.id,
      );
      writeSession(meeting.meeting_code, participant, false);
      router.push(`/meeting/${meeting.meeting_code}`);
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to start meeting.");
    }
  };

  return (
    <section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] lg:items-start">
        <div>
          <p className="text-sm font-bold text-zoom-blue">Welcome back</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zoom-text">Home</h1>
          <div className="mt-6 max-w-[360px]">
            <ActionTiles
              onNewMeeting={handleNewMeeting}
              creating={creating}
              onJoin={() => setJoinOpen(true)}
              onSchedule={() => router.push("/schedule")}
            />
          </div>
        </div>
        <div>
          <ClockCard />
          <UpcomingList
            meetings={upcoming.data}
            loading={upcoming.loading}
            error={upcoming.error}
            onRetry={upcoming.refetch}
            onStart={(meeting) => void startMeeting(meeting)}
          />
        </div>
      </div>
      <RecentList
        meetings={recent.data}
        loading={recent.loading}
        error={recent.error}
        onRetry={recent.refetch}
      />
      <JoinModal
        open={joinOpen}
        defaultName={user?.full_name ?? ""}
        onClose={() => setJoinOpen(false)}
      />
    </section>
  );
}
