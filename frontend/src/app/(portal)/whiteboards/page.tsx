import type { Metadata } from "next";

import { WhiteboardsPage } from "@/components/whiteboards/WhiteboardsPage";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Whiteboards | ${APP_NAME}`,
};

export default function WhiteboardsRoute() {
  return <WhiteboardsPage />;
}
