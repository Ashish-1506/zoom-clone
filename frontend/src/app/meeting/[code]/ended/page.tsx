import type { Metadata } from "next";

import MeetingEndedPageClient from "./MeetingEndedPageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Meeting ended | ${APP_NAME}`,
};

export default function MeetingEndedPage() {
  return <MeetingEndedPageClient />;
}
