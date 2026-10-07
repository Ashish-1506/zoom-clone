import { Suspense } from "react";
import type { Metadata } from "next";

import JoinPageClient from "./JoinPageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Join meeting | ${APP_NAME}`,
};

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><span>Loading meeting...</span></main>}>
      <JoinPageClient />
    </Suspense>
  );
}
