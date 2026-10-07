"use client";

import { useParams } from "next/navigation";

import { MeetingRoomStage } from "@/components/room/MeetingRoomStage";
import { useMeetingRoomController } from "@/hooks/useMeetingRoomController";

export default function MeetingRoomPageClient() {
  const { code } = useParams<{ code: string }>();
  const room = useMeetingRoomController(code);

  if (room.status === "loading") {
    return <main className="min-h-screen bg-room-bg" aria-label="Loading meeting" />;
  }

  if (room.status === "removed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-room-bg p-6 text-center text-white">
        <div>
          <h1 className="text-xl font-bold">
            You have been removed from this meeting by the host
          </h1>
          <button
            type="button"
            className="mt-5 min-h-11 rounded bg-white px-4 py-2 text-sm font-bold text-zoom-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
            onClick={room.onBackToHome}
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  return <MeetingRoomStage {...room.stageProps} />;
}
