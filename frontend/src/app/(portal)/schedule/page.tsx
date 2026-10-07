import { Suspense } from "react";
import type { Metadata } from "next";

import SchedulePageClient from "./SchedulePageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Schedule | ${APP_NAME}`,
};

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20">Loading scheduler...</div>}>
      <SchedulePageClient />
    </Suspense>
  );
}
