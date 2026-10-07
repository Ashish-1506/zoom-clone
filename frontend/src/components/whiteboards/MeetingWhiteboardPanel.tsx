"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { usePolling } from "@/hooks/usePolling";
import { getMeetingWhiteboard, saveMeetingWhiteboard } from "@/lib/api";
import { WhiteboardSurface } from "./WhiteboardSurface";

export function MeetingWhiteboardPanel({
  code,
  participantId,
  onClose,
}: {
  code: string;
  participantId: number;
  onClose: () => void;
}) {
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [dataJson, setDataJson] = useState("[]");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);
  const dirty = useRef(false);
  const currentTimestamp = useRef("");

  const refresh = useCallback(async () => {
    try {
      const latest = await getMeetingWhiteboard(code, participantId);
      if (!dirty.current && latest.updated_at > currentTimestamp.current) {
        currentTimestamp.current = latest.updated_at;
        setDataJson(latest.data_json);
        setBoardLoaded(true);
      } else if (!boardLoaded) {
        currentTimestamp.current = latest.updated_at;
        setDataJson(latest.data_json);
        setBoardLoaded(true);
      }
      setError("");
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load the shared whiteboard.");
    }
  }, [boardLoaded, code, participantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  usePolling(refresh, 2);

  useEffect(() => {
    if (revision.current === 0) return;
    const timer = window.setTimeout(() => {
      dirty.current = true;
      setSaving(true);
      void saveMeetingWhiteboard(code, participantId, dataJson)
        .then((updated) => {
          currentTimestamp.current = updated.updated_at;
          setBoardLoaded(true);
          dirty.current = false;
          setSaving(false);
          setError("");
        })
        .catch((caughtError: unknown) => {
          setSaving(false);
          setError(caughtError instanceof Error ? caughtError.message : "Unable to save changes.");
        });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [code, dataJson, participantId]);

  return (
    <section className="fixed inset-0 z-[80] flex flex-col bg-white text-zoom-text" aria-label="Meeting whiteboard">
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-zoom-border px-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold sm:text-base">Meeting whiteboard</h2>
          <p role="status" className="flex items-center gap-1 text-xs text-zoom-muted">
            {saving ? <><LoaderCircle className="size-3 animate-spin" /> Saving…</> : <><Check className="size-3 text-zoom-green" /> Shared with everyone</>}
          </p>
        </div>
        {error && <p role="alert" className="max-w-[40vw] truncate text-xs text-zoom-red">{error}</p>}
        <button type="button" aria-label="Close whiteboard" title="Close whiteboard" onClick={onClose} className="flex size-10 items-center justify-center rounded-md hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <X className="size-5" />
        </button>
      </header>
      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-zoom-red">
          <span className="truncate">{error}</span>
          <button type="button" onClick={() => void refresh()} className="min-h-10 shrink-0 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
            Retry
          </button>
        </div>
      )}
      <WhiteboardSurface
        dataJson={dataJson}
        onChange={(value) => {
          dirty.current = true;
          revision.current += 1;
          setDataJson(value);
        }}
      />
    </section>
  );
}
