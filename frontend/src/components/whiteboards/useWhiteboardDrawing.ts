"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
  type Point,
  type WhiteboardShape,
  type WhiteboardTool,
} from "@/lib/whiteboard";
import {
  isNearWhiteboardShape,
  normalizeWhiteboardShape,
} from "./WhiteboardShapeView";

interface DrawingOptions {
  shapes: WhiteboardShape[];
  onChange: (shapes: WhiteboardShape[]) => void;
  tool: WhiteboardTool;
  color: string;
  strokeWidth: number;
  setSelectedId: (id: string | null) => void;
}

export function useWhiteboardDrawing(options: DrawingOptions) {
  const svgRef = useRef<SVGSVGElement>(null);
  const origin = useRef<Point | null>(null);
  const drag = useRef<{ id: string; origin: Point; shape: WhiteboardShape } | null>(null);
  const [draft, setDraft] = useState<WhiteboardShape | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<WhiteboardShape | null>(null);

  const pointAt = (event: { clientX: number; clientY: number }): Point => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1200,
      y: ((event.clientY - bounds.top) / bounds.height) * 700,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (options.tool === "select") {
      options.setSelectedId(null);
      return;
    }
    const point = pointAt(event);
    if (options.tool === "text" || options.tool === "sticky") {
      const text = window.prompt(options.tool === "sticky" ? "Sticky note text" : "Text");
      if (!text?.trim()) return;
      options.onChange([
        ...options.shapes,
        {
          id: crypto.randomUUID(),
          type: options.tool,
          x: point.x,
          y: point.y,
          text: text.trim(),
          color: options.tool === "sticky" ? "#FDE68A" : options.color,
          strokeWidth: options.strokeWidth,
        },
      ]);
      return;
    }
    if (options.tool === "eraser") {
      const remaining = options.shapes.filter((shape) => !isNearWhiteboardShape(shape, point));
      if (remaining.length !== options.shapes.length) options.onChange(remaining);
      return;
    }

    const type = options.tool === "pen" || options.tool === "highlighter" ? "path" : options.tool;
    origin.current = point;
    if (type === "path") {
      setDraft({
        id: crypto.randomUUID(),
        type,
        points: [point],
        color: options.color,
        strokeWidth: options.tool === "highlighter" ? options.strokeWidth * 4 : options.strokeWidth,
        ...(options.tool === "highlighter" ? { opacity: 0.35 } : {}),
      });
    } else {
      setDraft({
        id: crypto.randomUUID(),
        type,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color: options.color,
        strokeWidth: options.strokeWidth,
      });
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointAt(event);
    if (drag.current) {
      setSelectedPreview(translateShape(drag.current.shape, {
        x: point.x - drag.current.origin.x,
        y: point.y - drag.current.origin.y,
      }));
      return;
    }
    if (!draft) return;
    if (draft.type === "path") {
      setDraft({ ...draft, points: [...draft.points, point] });
    } else if (!("text" in draft) && origin.current) {
      setDraft({
        ...draft,
        x: origin.current.x,
        y: origin.current.y,
        width: point.x - origin.current.x,
        height: point.y - origin.current.y,
      });
    }
  };

  const finishDrawing = () => {
    if (draft) {
      options.onChange([...options.shapes, normalizeWhiteboardShape(draft)]);
      setDraft(null);
      origin.current = null;
    } else if (drag.current && selectedPreview) {
      options.onChange(
        options.shapes.map((shape) =>
          shape.id === drag.current?.id
            ? normalizeWhiteboardShape(selectedPreview)
            : shape,
        ),
      );
    }
    drag.current = null;
    setSelectedPreview(null);
  };

  const onShapePointerDown = (
    shape: WhiteboardShape,
    event: ReactPointerEvent<SVGElement>,
  ) => {
    options.setSelectedId(shape.id);
    drag.current = { id: shape.id, origin: pointAt(event), shape };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return {
    svgRef,
    draft,
    selectedPreview,
    onPointerDown,
    onPointerMove,
    finishDrawing,
    onShapePointerDown,
  };
}

function translateShape(shape: WhiteboardShape, delta: Point): WhiteboardShape {
  if (shape.type === "path") {
    return {
      ...shape,
      points: shape.points.map((point) => ({
        x: point.x + delta.x,
        y: point.y + delta.y,
      })),
    };
  }
  return { ...shape, x: shape.x + delta.x, y: shape.y + delta.y };
}
