"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import { getShapePath, type Point, type WhiteboardShape } from "@/lib/whiteboard";

export function WhiteboardShapeView({
  shape,
  selected,
  onSelect,
  selectable,
  arrowMarkerId = "board-arrow",
}: {
  shape: WhiteboardShape;
  selected: boolean;
  onSelect: (event: ReactPointerEvent<SVGElement>) => void;
  selectable: boolean;
  arrowMarkerId?: string;
}) {
  const events = selectable
    ? {
        onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
          event.stopPropagation();
          onSelect(event);
        },
      }
    : {};
  const outline = selected ? "#0B5CFF" : shape.color;
  if (shape.type === "path") {
    return <path {...events} d={getShapePath(shape)} fill="none" stroke={outline} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={shape.opacity ?? 1} />;
  }
  if (shape.type === "line" || shape.type === "arrow") {
    return <line {...events} x1={shape.x} y1={shape.y} x2={shape.x + shape.width} y2={shape.y + shape.height} stroke={outline} strokeWidth={shape.strokeWidth} markerEnd={shape.type === "arrow" ? `url(#${arrowMarkerId})` : undefined} />;
  }
  if (shape.type === "rectangle") {
    return <rect {...events} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill="transparent" stroke={outline} strokeWidth={shape.strokeWidth} />;
  }
  if (shape.type === "ellipse") {
    return <ellipse {...events} cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={Math.abs(shape.width / 2)} ry={Math.abs(shape.height / 2)} fill="transparent" stroke={outline} strokeWidth={shape.strokeWidth} />;
  }
  if (shape.type === "sticky") {
    return <g {...events}><rect x={shape.x} y={shape.y} width="190" height="140" rx="8" fill={shape.color} /><foreignObject x={shape.x + 10} y={shape.y + 10} width="170" height="120"><div className="whitespace-pre-wrap break-words text-sm text-gray-900">{shape.text}</div></foreignObject></g>;
  }
  return <text {...events} x={shape.x} y={shape.y} fill={outline} fontSize="22" fontFamily="Arial">{shape.text}</text>;
}

export function normalizeWhiteboardShape(shape: WhiteboardShape): WhiteboardShape {
  if (shape.type === "path" || "text" in shape) return shape;
  if (shape.type === "line" || shape.type === "arrow") return shape;
  return {
    ...shape,
    x: shape.width < 0 ? shape.x + shape.width : shape.x,
    y: shape.height < 0 ? shape.y + shape.height : shape.y,
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
  };
}

export function isNearWhiteboardShape(shape: WhiteboardShape, point: Point): boolean {
  if (shape.type === "path") {
    return shape.points.some((sample) => Math.hypot(sample.x - point.x, sample.y - point.y) < 28);
  }
  const x = "text" in shape ? shape.x : shape.x + shape.width / 2;
  const y = "text" in shape ? shape.y : shape.y + shape.height / 2;
  return Math.hypot(x - point.x, y - point.y) < 40;
}
