"use client";

import { useCallback } from "react";

import type { Participant } from "@/lib/types";

export interface MeetingSession {
  participant: Participant;
  isVideoOn: boolean;
}

function key(code: string): string {
  return `zoom:participant:${code}`;
}

export function useMeetingSession() {
  const readSession = useCallback((code: string): MeetingSession | null => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(key(code));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MeetingSession;
    } catch {
      window.sessionStorage.removeItem(key(code));
      return null;
    }
  }, []);

  const writeSession = useCallback(
    (code: string, participant: Participant, isVideoOn: boolean) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          key(code),
          JSON.stringify({ participant, isVideoOn }),
        );
      }
    },
    [],
  );

  const clearSession = useCallback((code: string) => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(key(code));
  }, []);

  return { readSession, writeSession, clearSession };
}
