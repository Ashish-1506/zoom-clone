import type { Metadata } from "next";

import ProfilePage from "@/components/profile/ProfilePage";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Profile | ${APP_NAME}`,
};

export default function ProfileRoute() {
  return <ProfilePage />;
}
