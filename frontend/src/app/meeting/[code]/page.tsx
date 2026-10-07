import type { Metadata } from "next";

import MeetingRoomPageClient from "./MeetingRoomPageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Meeting room | ${APP_NAME}`,
};

export default function MeetingRoomPage() {
  return <MeetingRoomPageClient />;
}
