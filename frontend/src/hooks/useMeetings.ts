"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listMeetings } from "@/lib/api";
import type { Meeting } from "@/lib/types";

export interface UseMeetingsResult {
  data: Meeting[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMeetings(type: "upcoming" | "recent"): UseMeetingsResult {
  const [data, setData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const meetings = await listMeetings(type);
      if (mountedRef.current) {
        setData(meetings);
      }
    } catch (caughtError) {
      if (mountedRef.current) {
        setError(
          caughtError instanceof Error ? caughtError : new Error("Request failed."),
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [type]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => void refetch());
    return () => {
      mountedRef.current = false;
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}
