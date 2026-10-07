import type { Metadata } from "next";

import HomePageClient from "./HomePageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Home | ${APP_NAME}`,
};

export default function HomePage() {
  return <HomePageClient />;
}
