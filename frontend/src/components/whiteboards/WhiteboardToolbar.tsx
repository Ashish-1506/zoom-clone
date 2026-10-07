"use client";

import {
  ArrowUpRight,
  Circle,
  Download,
  Eraser,
  Highlighter,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  RectangleHorizontal,
  StickyNote,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { downloadWhiteboardPng, type WhiteboardShape, type WhiteboardTool } from "@/lib/whiteboard";
import { Button } from "@/components/ui";

const tools: { id: WhiteboardTool; label: string; Icon: typeof Pencil }[] = [
  { id: "select", label: "Select", Icon: MousePointer2 },
  { id: "pen", label: "Pen", Icon: Pencil },
  { id: "highlighter", label: "Highlighter", Icon: Highlighter },
  { id: "eraser", label: "Eraser", Icon: Eraser },
  { id: "line", label: "Line", Icon: Minus },
  { id: "rectangle", label: "Rectangle", Icon: RectangleHorizontal },
  { id: "ellipse", label: "Ellipse", Icon: Circle },
  { id: "arrow", label: "Arrow", Icon: ArrowUpRight },
  { id: "text", label: "Text", Icon: Type },
  { id: "sticky", label: "Sticky note", Icon: StickyNote },
];

interface WhiteboardToolbarProps {
  tool: WhiteboardTool;
  setTool: (tool: WhiteboardTool) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  shapes: WhiteboardShape[];
  onError: (message: string) => void;
}

export function WhiteboardToolbar(props: WhiteboardToolbarProps) {
  return (
    <aside className="z-10 flex w-full shrink-0 flex-wrap items-center gap-2 border-b border-zoom-border bg-white p-2 shadow-sm lg:w-[76px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex flex-wrap gap-1 lg:flex-col">
        {tools.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={props.tool === id}
            title={label}
            onClick={() => props.setTool(id)}
            className={`flex size-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${
              props.tool === id ? "bg-zoom-blue-light text-zoom-blue" : "text-zoom-muted hover:bg-zoom-bg"
            }`}
          >
            <Icon className="size-5" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 lg:flex-col">
        <label title="Choose color" className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-zoom-border">
          <input
            aria-label="Choose color"
            type="color"
            value={props.color}
            onChange={(event) => props.setColor(event.target.value)}
            className="size-7 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        <label title="Stroke width" className="flex h-10 items-center lg:h-20 lg:[writing-mode:vertical-lr]">
          <input
            aria-label="Stroke width"
            type="range"
            min={1}
            max={18}
            value={props.strokeWidth}
            onChange={(event) => props.setStrokeWidth(Number(event.target.value))}
            className="w-20 accent-zoom-blue lg:w-16"
          />
        </label>
      </div>
      <div className="ml-auto flex gap-1 lg:ml-0 lg:flex-col">
        <ToolAction label="Undo" disabled={!props.canUndo} onClick={props.onUndo}><Undo2 /></ToolAction>
        <ToolAction label="Redo" disabled={!props.canRedo} onClick={props.onRedo}><Redo2 /></ToolAction>
        <ToolAction label="Clear" disabled={props.shapes.length === 0} onClick={props.onClear}><Eraser /></ToolAction>
        <ToolAction label="Zoom out" disabled={props.zoom <= 0.5} onClick={() => props.setZoom(Math.max(0.5, props.zoom - 0.1))}><ZoomOut /></ToolAction>
        <span className="flex min-w-10 items-center justify-center text-xs text-zoom-muted">{Math.round(props.zoom * 100)}%</span>
        <ToolAction label="Zoom in" disabled={props.zoom >= 2} onClick={() => props.setZoom(Math.min(2, props.zoom + 0.1))}><ZoomIn /></ToolAction>
      </div>
      <Button
        variant="secondary"
        size="sm"
        aria-label="Download as PNG"
        title="Download as PNG"
        className="ml-auto lg:ml-0 lg:mt-auto lg:w-full"
        onClick={() => void downloadWhiteboardPng(props.shapes).catch(() => props.onError("Could not export this whiteboard as a PNG."))}
      >
        <Download className="size-4 lg:hidden" />
        <span className="lg:hidden">PNG</span>
        <span className="hidden text-[10px] lg:inline">Download PNG</span>
      </Button>
    </aside>
  );
}

function ToolAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-md text-zoom-muted hover:bg-zoom-bg hover:text-zoom-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
