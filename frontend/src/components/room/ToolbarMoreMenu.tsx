interface ToolbarMoreMenuProps {
  onShareScreen: () => void;
  onWhiteboard: () => void;
  onRecordToggle: () => void;
  isRecording: boolean;
  onReactions: () => void;
  onClose: () => void;
}

export function ToolbarMoreMenu({
  onShareScreen,
  onWhiteboard,
  onRecordToggle,
  isRecording,
  onReactions,
  onClose,
}: ToolbarMoreMenuProps) {
  const selectAction = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="absolute bottom-full right-0 mb-2 w-44 rounded-lg bg-white p-1 text-zoom-text shadow-xl">
      <button
        type="button"
        className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        onClick={() => selectAction(onShareScreen)}
      >
        Share Screen
      </button>
      <button
        type="button"
        className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        onClick={() => selectAction(onWhiteboard)}
      >
        Whiteboard
      </button>
      <button
        type="button"
        className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        onClick={() => selectAction(onRecordToggle)}
      >
        {isRecording ? "Stop recording" : "Record"}
      </button>
      <button
        type="button"
        className="min-h-11 w-full rounded px-3 text-left text-sm hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        onClick={() => selectAction(onReactions)}
      >
        Reactions
      </button>
    </div>
  );
}
