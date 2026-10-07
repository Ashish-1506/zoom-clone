import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign up | ${APP_NAME}`,
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
