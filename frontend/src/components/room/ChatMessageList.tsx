import type { RefObject } from "react";

import type { ChatMessage, Participant } from "@/lib/types";
import { formatTime } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentParticipant: Participant;
  endRef: RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({
  messages,
  currentParticipant,
  endRef,
}: ChatMessageListProps) {
  return (
    <div
      className="flex-1 space-y-4 overflow-y-auto p-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((message) => {
        if (message.type === "system") {
          return (
            <p key={message.id} className="text-center text-xs text-zoom-muted">
              {message.content}
            </p>
          );
        }
        const own = message.participant_id === currentParticipant.id;
        return (
          <div
            key={message.id}
            className={`flex flex-col ${own ? "items-end" : "items-start"}`}
          >
            <div
              className={`mb-1 flex items-baseline gap-2 text-xs ${
                own ? "flex-row-reverse" : ""
              }`}
            >
              <span className="font-bold text-zoom-text">
                {own ? "You" : message.sender_name}
              </span>
              <time className="text-[11px] text-zoom-muted">
                {formatTime(message.sent_at)}
              </time>
            </div>
            <p
              className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                own
                  ? "rounded-br-sm bg-zoom-blue text-white"
                  : "rounded-bl-sm bg-zoom-bg text-zoom-text"
              }`}
            >
              {message.content}
            </p>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
