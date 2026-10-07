"use client";

import { FilePlus2, Presentation } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, EmptyState, Modal, Skeleton, useToast } from "@/components/ui";
import { createWhiteboard, deleteWhiteboard, listWhiteboards } from "@/lib/api";
import type { Whiteboard } from "@/lib/types";
import { WhiteboardCard } from "./WhiteboardCard";

export function WhiteboardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Whiteboard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { error } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setBoards(await listWhiteboards());
    } catch (caughtError: unknown) {
      setLoadError(caughtError instanceof Error ? caughtError.message : "Could not load whiteboards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const board = await createWhiteboard("Untitled whiteboard");
      router.push(`/whiteboards/${board.id}`);
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Could not create a whiteboard.");
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteWhiteboard(deleteTarget.id);
      setBoards((current) => current.filter((board) => board.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Could not delete this whiteboard.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zoom-blue">Workspace</p>
          <h1 className="mt-1 text-3xl font-black text-zoom-text">Whiteboards</h1>
          <p className="mt-2 text-sm text-zoom-muted">Capture ideas together on an infinite canvas.</p>
        </div>
        <Button loading={creating} onClick={() => void create()}>
          <FilePlus2 className="size-4" /> New whiteboard
        </Button>
      </div>
      {loadError ? (
        <div className="rounded-lg border border-zoom-border bg-white p-8 text-center">
          <p role="alert" className="text-sm text-zoom-red">{loadError}</p>
          <Button className="mt-4" variant="secondary" onClick={() => void load()}>Retry</Button>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-64 rounded-xl" />)}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={<Presentation className="size-6" />}
          title="Start with a blank whiteboard"
          text="Brainstorm, sketch, and organize your ideas in one shared space."
          action={<Button onClick={() => void create()}>Create whiteboard</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <WhiteboardCard key={board.id} board={board} onDelete={() => setDeleteTarget(board)} />
          ))}
        </div>
      )}
      <Modal open={Boolean(deleteTarget)} title="Delete whiteboard?" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-zoom-muted">This whiteboard and its contents will be deleted.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={() => void remove()}>Delete</Button>
        </div>
      </Modal>
    </section>
  );
}
