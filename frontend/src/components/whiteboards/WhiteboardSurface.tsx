"use client";

import { useState } from "react";

import {
  parseWhiteboardShapes,
  type WhiteboardShape,
  type WhiteboardTool,
} from "@/lib/whiteboard";
import { useToast } from "@/components/ui";

import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { WhiteboardToolbar } from "./WhiteboardToolbar";

export function WhiteboardSurface({
  dataJson,
  onChange,
}: {
  dataJson: string;
  onChange: (dataJson: string) => void;
}) {
  const [tool, setTool] = useState<WhiteboardTool>("select");
  const [color, setColor] = useState("#0B5CFF");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<WhiteboardShape[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardShape[][]>([]);
  const { error } = useToast();
  const shapes = parseWhiteboardShapes(dataJson);

  const commit = (next: WhiteboardShape[]) => {
    setUndoStack((current) => [...current, shapes]);
    setRedoStack([]);
    onChange(JSON.stringify(next));
  };
  const undo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, shapes]);
    onChange(JSON.stringify(previous));
  };
  const redo = () => {
    const next = redoStack.at(-1);
    if (!next) return;
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, shapes]);
    onChange(JSON.stringify(next));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <WhiteboardToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
        onClear={() => commit([])}
        zoom={zoom}
        setZoom={setZoom}
        shapes={shapes}
        onError={error}
      />
      <WhiteboardCanvas
        shapes={shapes}
        onChange={commit}
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        zoom={zoom}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
    </div>
  );
}
