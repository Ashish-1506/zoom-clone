"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Input, useToast } from "@/components/ui";
import { login, saveAuthToken, signup } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { error } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const isSignup = mode === "signup";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFieldError("");
    if (isSignup && !fullName.trim()) {
      setFieldError("Enter your full name.");
      return;
    }
    if (!email.trim()) {
      setFieldError("Enter your email address.");
      return;
    }
    if (password.length < 8) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = isSignup
        ? await signup(fullName.trim(), email.trim(), password)
        : await login(email.trim(), password);
      saveAuthToken(result.access_token);
      router.push("/");
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to authenticate.";
      setFieldError(message);
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zoom-bg px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-zoom-border bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-[25px] font-black tracking-[-1.5px] text-zoom-blue">zoom</Link>
        <h1 className="mt-8 text-2xl font-black text-zoom-text">{isSignup ? "Create your account" : "Sign in"}</h1>
        <p className="mt-2 text-sm text-zoom-muted">
          {isSignup ? `Start using ${APP_NAME}.` : `Welcome back to ${APP_NAME}.`}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          {isSignup && <Input id="full-name" label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />}
          <Input id="email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          <Input id="password" label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} />
          {fieldError && <p className="text-sm text-zoom-red" role="alert">{fieldError}</p>}
          <Button type="submit" className="w-full" loading={submitting}>{isSignup ? "Create account" : "Sign in"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-zoom-muted">
          {isSignup ? "Already have an account? " : "New to Zoom? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-bold text-zoom-blue hover:text-zoom-blue-dark">{isSignup ? "Sign in" : "Sign up"}</Link>
        </p>
      </section>
    </main>
  );
}
