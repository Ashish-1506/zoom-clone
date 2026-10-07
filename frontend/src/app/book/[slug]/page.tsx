import { PublicBookingPage } from "@/components/scheduler/PublicBookingPage";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Book a meeting | ${APP_NAME}`,
};

export default async function PublicBookingRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicBookingPage slug={slug} />;
}
