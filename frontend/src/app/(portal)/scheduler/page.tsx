import type { Metadata } from "next";

import { SchedulerPage } from "@/components/scheduler/SchedulerPage";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `Scheduler | ${APP_NAME}` };

export default function SchedulerRoute() { return <SchedulerPage />; }
