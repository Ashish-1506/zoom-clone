"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui";
import { usePolling } from "@/hooks/usePolling";
import { CHAT_POLL_INTERVAL_SECONDS } from "@/lib/constants";
import { listChat, sendChat } from "@/lib/api";
import type { ChatMessage, Participant } from "@/lib/types";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatRecipientSelector } from "./ChatRecipientSelector";

interface ChatPanelProps {
  code: string;
  currentParticipant: Participant;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
  onLastMessageIdChange: (messageId: number) => void;
}

export function ChatPanel({
  code,
  currentParticipant,
  onClose,
  onUnreadChange,
  onLastMessageIdChange,
}: ChatPanelProps) {
  const { error } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef(0);

  const addMessages = useCallback(
    (incoming: ChatMessage[]) => {
      const unseen = incoming.filter((message) => message.id > lastMessageIdRef.current);
      if (unseen.length === 0) return;
      const lastMessage = unseen[unseen.length - 1];
      lastMessageIdRef.current = lastMessage.id;
      onLastMessageIdChange(lastMessage.id);
      setMessages((current) => [...current, ...unseen]);
      onUnreadChange(0);
    },
    [onLastMessageIdChange, onUnreadChange],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await listChat(code, lastMessageIdRef.current);
      addMessages(next);
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to load chat.");
    }
  }, [addMessages, code, error]);

  useEffect(() => {
    let active = true;
    void listChat(code)
      .then((initialMessages) => {
        if (!active) return;
        if (initialMessages.length > 0) {
          const latestId = initialMessages[initialMessages.length - 1].id;
          if (latestId > lastMessageIdRef.current) {
            lastMessageIdRef.current = latestId;
            onLastMessageIdChange(latestId);
          }
        }
        setMessages((current) => {
          const unique = new Map(current.map((message) => [message.id, message]));
          initialMessages.forEach((message) => unique.set(message.id, message));
          return [...unique.values()].sort((left, right) => left.id - right.id);
        });
      })
      .catch((caughtError: unknown) => {
        if (active) {
          error(caughtError instanceof Error ? caughtError.message : "Unable to load chat.");
        }
      });
    return () => {
      active = false;
    };
  }, [code, error, onLastMessageIdChange]);

  usePolling(refresh, CHAT_POLL_INTERVAL_SECONDS);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const message = await sendChat(code, currentParticipant.id, trimmed);
      addMessages([message]);
      setContent("");
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <aside
      aria-label="Meeting chat"
      className="absolute inset-0 z-20 flex w-full max-w-none flex-col border-l border-zoom-border bg-white text-zoom-text shadow-2xl md:inset-y-12 md:left-auto md:w-[340px]"
    >
      <div className="flex min-h-14 items-center justify-between border-b border-zoom-border px-4">
        <h2 className="text-base font-bold">Chat</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          title="Close chat"
          className="flex min-h-11 min-w-11 items-center justify-center rounded hover:bg-zoom-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue"
        >
          <X className="size-5" />
        </button>
      </div>

      <ChatRecipientSelector />

      <ChatMessageList
        messages={messages}
        currentParticipant={currentParticipant}
        endRef={endRef}
      />
      <ChatComposer
        content={content}
        sending={sending}
        onContentChange={setContent}
        onSubmit={() => void submit()}
      />
    </aside>
  );
}
