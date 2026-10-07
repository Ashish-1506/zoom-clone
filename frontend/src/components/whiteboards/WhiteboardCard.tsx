"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Presentation, Trash2 } from "lucide-react";

import type { Whiteboard } from "@/lib/types";
import { parseWhiteboardShapes, type WhiteboardShape } from "@/lib/whiteboard";

import { WhiteboardShapeView } from "./WhiteboardShapeView";

export function WhiteboardCard({
  board,
  onDelete,
}: {
  board: Whiteboard;
  onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-zoom-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/whiteboards/${board.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zoom-blue">
        <WhiteboardThumbnail board={board} />
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <h2 className="truncate font-bold text-zoom-text">{board.title}</h2>
            <p className="mt-1 text-xs text-zoom-muted">Edited {new Date(board.updated_at).toLocaleString()}</p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-zoom-muted transition group-hover:translate-x-1 group-hover:text-zoom-blue" />
        </div>
      </Link>
      <div className="flex justify-end border-t border-zoom-border px-3 py-2">
        <button
          type="button"
          aria-label={`Delete ${board.title}`}
          title="Delete whiteboard"
          onClick={onDelete}
          className="flex size-10 items-center justify-center rounded-md text-zoom-muted hover:bg-red-50 hover:text-zoom-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}

function WhiteboardThumbnail({ board }: { board: Whiteboard }) {
  if (board.thumbnail) {
    return <Image src={board.thumbnail} alt="" width={800} height={350} unoptimized className="h-44 w-full object-cover" />;
  }
  let shapes: WhiteboardShape[] = [];
  try {
    shapes = parseWhiteboardShapes(board.data_json).slice(0, 80);
  } catch {
    shapes = [];
  }
  return (
    <div className="relative h-44 overflow-hidden bg-white">
      <svg viewBox="0 0 1200 700" aria-label={`${board.title} thumbnail`} role="img" className="size-full">
        <defs>
          <pattern id={`thumbnail-dots-${board.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#e9edf2" />
          </pattern>
          <marker id={`board-arrow-${board.id}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#232333" />
          </marker>
        </defs>
        <rect width="1200" height="700" fill={`url(#thumbnail-dots-${board.id})`} />
        {shapes.map((shape) => (
          <g key={shape.id}>
            <WhiteboardShapeView
              shape={shape}
              selected={false}
              onSelect={() => undefined}
              selectable={false}
              arrowMarkerId={`board-arrow-${board.id}`}
            />
          </g>
        ))}
      </svg>
      {shapes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-zoom-muted">
          <Presentation className="mr-2 size-4" /> Blank canvas
        </div>
      )}
    </div>
  );
}
