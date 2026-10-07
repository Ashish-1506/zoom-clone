import { SettingsPage } from "@/components/settings/SettingsPage";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Settings | ${APP_NAME}`,
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
