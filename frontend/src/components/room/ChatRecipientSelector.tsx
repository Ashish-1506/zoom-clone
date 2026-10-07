export function ChatRecipientSelector() {
  return (
    <div className="border-b border-zoom-border px-4 py-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="shrink-0 text-zoom-muted">To:</span>
        <select
          aria-label="Message recipient"
          value="everyone"
          disabled
          className="min-h-9 rounded border-0 bg-transparent font-semibold text-zoom-text disabled:opacity-100"
        >
          <option value="everyone">Everyone</option>
        </select>
      </label>
    </div>
  );
}
