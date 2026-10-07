"use client";

import type { WhiteboardShape, WhiteboardTool } from "@/lib/whiteboard";

import { WhiteboardShapeView } from "./WhiteboardShapeView";
import { useWhiteboardDrawing } from "./useWhiteboardDrawing";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

interface WhiteboardCanvasProps {
  shapes: WhiteboardShape[];
  onChange: (shapes: WhiteboardShape[]) => void;
  tool: WhiteboardTool;
  color: string;
  strokeWidth: number;
  zoom: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export function WhiteboardCanvas(props: WhiteboardCanvasProps) {
  const {
    svgRef,
    draft,
    selectedPreview,
    onPointerDown,
    onPointerMove,
    finishDrawing,
    onShapePointerDown,
  } = useWhiteboardDrawing(props);
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#f1f3f5] p-3 sm:p-6">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        role="application"
        aria-label="Whiteboard canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        className="mx-auto block max-w-none touch-none bg-white shadow-lg"
        style={{ width: `${CANVAS_WIDTH * props.zoom}px`, height: `${CANVAS_HEIGHT * props.zoom}px` }}
      >
        <defs>
          <pattern id="board-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#e9edf2" />
          </pattern>
          <marker id="board-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill={props.color} />
          </marker>
        </defs>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#board-grid)" />
        {props.shapes.map((original) => {
          const shape = selectedPreview?.id === original.id
            ? selectedPreview
            : draft?.id === original.id
              ? draft
              : original;
          return (
            <WhiteboardShapeView
              key={shape.id}
              shape={shape}
              selected={props.selectedId === shape.id}
              onSelect={(event) => onShapePointerDown(shape, event)}
              selectable={props.tool === "select"}
            />
          );
        })}
        {draft && !props.shapes.some((shape) => shape.id === draft?.id) && (
          <WhiteboardShapeView
            key={draft.id}
            shape={draft}
            selected={false}
            onSelect={() => undefined}
            selectable={false}
          />
        )}
      </svg>
    </div>
  );
}
