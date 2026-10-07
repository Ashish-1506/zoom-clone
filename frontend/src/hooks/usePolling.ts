"use client";

import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => Promise<void> | void,
  intervalSeconds: number,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const intervalMs = Math.max(intervalSeconds, 1) * 1000;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = () => {
      if (!document.hidden) {
        void callbackRef.current();
      }
    };

    const start = () => {
      if (timer === undefined && !document.hidden) {
        timer = setInterval(poll, intervalMs);
      }
    };

    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalSeconds]);
}
