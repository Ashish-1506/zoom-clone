import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Log in | ${APP_NAME}`,
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
