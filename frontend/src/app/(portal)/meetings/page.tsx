import type { Metadata } from "next";

import MeetingsPageClient from "./MeetingsPageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Meetings | ${APP_NAME}`,
};

export default function MeetingsPage() {
  return <MeetingsPageClient />;
}
