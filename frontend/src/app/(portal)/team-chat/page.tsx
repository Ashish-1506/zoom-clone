import { TeamChatPage } from "@/components/team-chat/TeamChatPage";
import { APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Team Chat | ${APP_NAME}`,
};

export default function TeamChatRoute() {
  return <TeamChatPage />;
}
