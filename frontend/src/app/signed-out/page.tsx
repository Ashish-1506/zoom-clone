import type { Metadata } from "next";

import SignedOutPageClient from "./SignedOutPageClient";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Signed out | ${APP_NAME}`,
};

export default function SignedOutPage() {
  return <SignedOutPageClient />;
}
