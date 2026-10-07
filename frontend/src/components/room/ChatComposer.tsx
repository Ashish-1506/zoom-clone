import { Send } from "lucide-react";

import { Button } from "@/components/ui";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/constants";

interface ChatComposerProps {
  content: string;
  sending: boolean;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({
  content,
  sending,
  onContentChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <form
      className="border-t border-zoom-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-end gap-2 rounded-lg border border-zoom-border bg-white p-2 focus-within:border-zoom-blue focus-within:ring-2 focus-within:ring-zoom-blue/20">
        <textarea
          value={content}
          onChange={(event) =>
            onContentChange(event.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          rows={1}
          aria-label="Type message here"
          placeholder="Type message here..."
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-y border-0 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-zoom-muted"
        />
        <Button
          type="submit"
          size="sm"
          aria-label="Send message"
          title="Send message"
          disabled={!content.trim() || sending}
          loading={sending}
        >
          {!sending && <Send className="size-4" />}
        </Button>
      </div>
      <p className="mt-1 text-right text-[10px] text-zoom-muted">
        {content.length}/{MAX_CHAT_MESSAGE_LENGTH}
      </p>
    </form>
  );
}
