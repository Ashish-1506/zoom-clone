"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  DeleteMeetingModal,
  InviteModal,
  ScheduledSuccessModal,
  MeetingTabs,
  PersonalRoom,
  type MeetingTab,
  UpcomingContent,
  PreviousContent,
} from "@/components/meetings";
import { useCurrentUser } from "@/components/layout";
import { Button, useToast } from "@/components/ui";
import { cancelMeeting, createInstantMeeting, joinMeeting } from "@/lib/api";
import { useMeetings } from "@/hooks/useMeetings";
import { useMeetingSession } from "@/hooks/useMeetingSession";
import type { Meeting } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";

export default function MeetingsPageClient() {
  useEffect(() => {
    document.title = `Meetings | ${APP_NAME}`;
  }, []);
  const router = useRouter();
  const { user } = useCurrentUser();
  const { writeSession } = useMeetingSession();
  const { success, error } = useToast();
  const [tab, setTab] = useState<MeetingTab>("upcoming");
  const [inviteMeeting, setInviteMeeting] = useState<Meeting | null>(null);
  const [deleteMeeting, setDeleteMeeting] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scheduledCode, setScheduledCode] = useState<string | null>(null);
  const upcoming = useMeetings("upcoming");
  const previous = useMeetings("recent");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("scheduled");
    queueMicrotask(() => setScheduledCode(code));
  }, []);

  const closeScheduledModal = () => {
    setScheduledCode(null);
    router.replace("/meetings");
  };

  const groupedUpcoming = useMemo(() => {
    const groups = new Map<string, Meeting[]>();
    upcoming.data.forEach((meeting) => {
      if (!meeting.start_time) return;
      const date = new Date(meeting.start_time);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const label = date.toDateString() === today.toDateString()
        ? "Today"
        : date.toDateString() === tomorrow.toDateString()
          ? "Tomorrow"
          : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      groups.set(label, [...(groups.get(label) ?? []), meeting]);
    });
    return [...groups.entries()];
  }, [upcoming.data]);

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

  const startPersonalRoom = async () => {
    if (!user) return;
    try {
      const meeting = await createInstantMeeting(undefined, true);
      const participant = await joinMeeting(
        meeting.meeting_code,
        { display_name: user.full_name, passcode: meeting.passcode },
        user.id,
      );
      writeSession(meeting.meeting_code, participant, false);
      router.push(`/meeting/${meeting.meeting_code}`);
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to start your Personal Room.");
    }
  };

  const deleteSelectedMeeting = async () => {
    if (!deleteMeeting) return;
    setDeleting(true);
    try {
      await cancelMeeting(deleteMeeting.meeting_code);
      success("Meeting deleted");
      setDeleteMeeting(null);
      await upcoming.refetch();
    } catch (caughtError) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to delete meeting.");
    } finally {
      setDeleting(false);
    }
  };

  const content = tab === "personal" ? (
    <PersonalRoom user={user} onStart={() => void startPersonalRoom()} />
  ) : tab === "upcoming" ? (
    <UpcomingContent
      groups={groupedUpcoming}
      loading={upcoming.loading}
      error={upcoming.error}
      onRetry={upcoming.refetch}
      onStart={startMeeting}
      onInvite={setInviteMeeting}
      onDelete={setDeleteMeeting}
      onSchedule={() => router.push("/schedule")}
    />
  ) : (
    <PreviousContent meetings={previous.data} loading={previous.loading} error={previous.error} onRetry={previous.refetch} />
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zoom-blue">Workspace</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zoom-text">Meetings</h1>
        </div>
        <Button onClick={() => router.push("/schedule")}>Schedule a meeting</Button>
      </div>
      <MeetingTabs activeTab={tab} onChange={setTab} />
      <div className="mt-6">{content}</div>
      <InviteModal meeting={inviteMeeting} onClose={() => setInviteMeeting(null)} />
      <DeleteMeetingModal meeting={deleteMeeting} deleting={deleting} onClose={() => setDeleteMeeting(null)} onConfirm={deleteSelectedMeeting} />
      <ScheduledSuccessModal code={scheduledCode} onClose={closeScheduledModal} />
    </section>
  );
}
