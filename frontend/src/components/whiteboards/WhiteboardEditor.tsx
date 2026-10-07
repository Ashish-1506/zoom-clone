"use client";

import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getWhiteboard, updateWhiteboard } from "@/lib/api";
import { Button, Skeleton, useToast } from "@/components/ui";

import { WhiteboardSurface } from "./WhiteboardSurface";

type SaveState = "saved" | "saving" | "error";

export function WhiteboardEditor({ boardId }: { boardId: number }) {
  const [title, setTitle] = useState("");
  const [dataJson, setDataJson] = useState("[]");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const queue = useRef(Promise.resolve());
  const { error } = useToast();

  const load = useCallback(async () => {
    setLoadError("");
    setLoaded(false);
    try {
      const result = await getWhiteboard(boardId);
      setTitle(result.title);
      setDataJson(result.data_json);
      setLoaded(true);
    } catch (caughtError: unknown) {
      setLoadError(caughtError instanceof Error ? caughtError.message : "Could not load this whiteboard.");
    }
  }, [boardId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!loaded || revision === 0) return;
    const timer = window.setTimeout(() => {
      if (!title.trim()) {
        setSaveState("error");
        return;
      }
      setSaveState("saving");
      const nextTitle = title.trim();
      const nextData = dataJson;
      queue.current = queue.current
        .catch(() => undefined)
        .then(() => updateWhiteboard(boardId, { title: nextTitle, data_json: nextData }))
        .then(() => setSaveState("saved"))
        .catch((caughtError: unknown) => {
          setSaveState("error");
          error(caughtError instanceof Error ? caughtError.message : "Could not save this whiteboard.");
        });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [boardId, dataJson, error, loaded, revision, title]);

  if (!loaded) {
    return loadError ? (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zoom-bg p-6">
        <p role="alert" className="text-sm text-zoom-red">{loadError}</p>
        <Button onClick={() => void load()}>Retry</Button>
        <Link href="/whiteboards" className="text-sm font-bold text-zoom-blue">Back to whiteboards</Link>
      </div>
    ) : <Skeleton className="h-screen w-full" />;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white">
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-zoom-border px-3 sm:px-5">
        <Link href="/whiteboards" aria-label="Back to whiteboards" title="Back to whiteboards" className="flex size-10 items-center justify-center rounded-md text-zoom-muted hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <ArrowLeft className="size-5" />
        </Link>
        <input
          aria-label="Whiteboard title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setRevision((value) => value + 1);
            setSaveState("saving");
          }}
          maxLength={120}
          className="min-w-0 flex-1 rounded px-2 py-2 text-base font-bold text-zoom-text outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue sm:text-lg"
        />
        <span role="status" className="hidden items-center gap-1 text-xs text-zoom-muted sm:flex">
          {saveState === "saving" ? <><LoaderCircle className="size-3.5 animate-spin" /> Saving…</> : null}
          {saveState === "saved" ? <><Check className="size-3.5 text-zoom-green" /> Saved</> : null}
          {saveState === "error" ? <span className="text-zoom-red">Not saved</span> : null}
        </span>
      </header>
      <WhiteboardSurface
        dataJson={dataJson}
        onChange={(next) => {
          setDataJson(next);
          setRevision((value) => value + 1);
          setSaveState("saving");
        }}
      />
    </main>
  );
}
