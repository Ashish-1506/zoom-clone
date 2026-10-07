import type { Metadata } from "next";

import { PhonePage } from "@/components/phone/PhonePage";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Phone | ${APP_NAME}`,
};

export default function PhoneRoute() {
  return <PhonePage />;
}
