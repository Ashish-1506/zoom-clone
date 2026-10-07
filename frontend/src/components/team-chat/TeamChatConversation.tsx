"use client";

import {
  CornerUpLeft,
  Hash,
  Lock,
  MoreHorizontal,
  Pencil,
  Send,
  Smile,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

import { Avatar, Button, Spinner } from "@/components/ui";
import type { TeamChannel, TeamMessage } from "@/lib/types";
import { channelLabel, formatDay, formatTime } from "./teamChatUtils";
import type { useTeamChatController } from "./useTeamChatController";

const EMOJIS = ["🙂", "👍", "🎉", "❤️", "👀", "🚀"];
type ChatModel = ReturnType<typeof useTeamChatController>;

export function TeamChatConversation({ model, selected }: { model: ChatModel; selected: TeamChannel }) {
  const { user, messageLoading, listRef, groupedMessages, messages, startMeeting } = model;

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-16 items-center justify-between border-b border-zoom-border px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 truncate text-lg font-black text-zoom-text">
            {selected.is_direct ? (
              <>
                <span className="relative">
                  <Avatar
                    name={channelLabel(selected, user?.id)}
                    color={selected.members.find((member) => member.id !== user?.id)?.avatar_color}
                    size="sm"
                  />
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-zoom-green" />
                </span>
                {channelLabel(selected, user?.id)}
              </>
            ) : (
              <>
                {selected.is_private ? <Lock className="size-4" /> : <Hash className="size-5" />}
                {selected.name}
              </>
            )}
          </h1>
          <p className="mt-0.5 truncate text-xs text-zoom-muted">
            {selected.is_direct ? "Direct message" : `${selected.member_count} members · ${selected.description}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startMeeting()}
          className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-zoom-blue hover:bg-zoom-blue-light"
          title="Start meeting"
        >
          <Video className="size-5" />
          <span className="hidden sm:inline">Start meeting</span>
        </button>
      </header>
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messageLoading ? (
          <div className="flex h-full items-center justify-center"><Spinner /></div>
        ) : (
          groupedMessages.map((day) => (
            <div key={day[0].id}>
              <div className="my-4 flex items-center gap-3 text-xs font-bold text-zoom-muted before:h-px before:flex-1 before:bg-zoom-border after:h-px after:flex-1 after:bg-zoom-border">
                {formatDay(day[0].created_at)}
              </div>
              {day.map((message) => (
                <MessageRow key={message.id} model={model} message={message} isMine={message.sender_id === user?.id} />
              ))}
            </div>
          ))
        )}
        {!messageLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-zoom-muted">
            <Users className="mb-3 size-8" />
            <p className="font-bold">Start the conversation</p>
            <p className="mt-1 text-sm">Send the first message to this chat.</p>
          </div>
        )}
      </div>
      <TeamChatComposer model={model} selected={selected} />
    </main>
  );
}

function TeamChatComposer({ model, selected }: { model: ChatModel; selected: TeamChannel }) {
  const { user, replyTo, setReplyTo, emojiOpen, setEmojiOpen, draft, setDraft, sending, sendMessage } = model;

  return (
    <div className="border-t border-zoom-border p-3 sm:p-4">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded bg-zoom-blue-light px-3 py-2 text-xs text-zoom-text">
          <span className="truncate">
            <CornerUpLeft className="mr-1 inline size-3.5 text-zoom-blue" />
            Replying to <strong>{replyTo.sender.full_name}</strong>: {replyTo.content}
          </span>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="relative flex items-end gap-2 rounded-lg border border-zoom-border bg-white p-2 focus-within:border-zoom-blue focus-within:ring-1 focus-within:ring-zoom-blue">
        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((open) => !open)}
            className="flex size-9 items-center justify-center rounded text-zoom-muted hover:bg-zoom-bg"
            aria-label="Choose emoji"
          >
            <Smile className="size-5" />
          </button>
          {emojiOpen && (
            <div className="absolute bottom-11 left-0 z-10 flex rounded-lg border border-zoom-border bg-white p-1 shadow-lg">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setDraft((value) => value + emoji);
                    setEmojiOpen(false);
                  }}
                  className="rounded p-2 text-lg hover:bg-zoom-bg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={`Message ${selected.is_direct ? channelLabel(selected, user?.id) : `#${selected.name}`}`}
          className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-zoom-muted"
        />
        <button
          type="button"
          disabled={!draft.trim() || sending}
          onClick={() => void sendMessage()}
          className="flex size-9 items-center justify-center rounded bg-zoom-blue text-white hover:bg-zoom-blue-dark"
          aria-label="Send message"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

function MessageRow({ model, message, isMine }: { model: ChatModel; message: TeamMessage; isMine: boolean }) {
  const { editing, setEditing, editDraft, setEditDraft, saveEdit, removeMessage, setReplyTo } = model;
  const isEditing = editing?.id === message.id;

  return (
    <article className="group -mx-2 flex gap-3 rounded-md px-2 py-2 hover:bg-zoom-bg">
      <Avatar name={message.sender.full_name} color={message.sender.avatar_color} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-black text-zoom-text">{message.sender.full_name}</span>
          <time className="text-xs text-zoom-muted">{formatTime(message.created_at)}</time>
          {message.edited_at && <span className="text-xs text-zoom-muted">(edited)</span>}
          <div className="ml-auto hidden rounded border border-zoom-border bg-white shadow-sm group-hover:flex">
            {isMine && (
              <button
                type="button"
                onClick={() => {
                  setEditing(message);
                  setEditDraft(message.content);
                }}
                className="p-1.5 text-zoom-muted hover:text-zoom-blue"
                aria-label="Edit message"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <button type="button" onClick={() => setReplyTo(message)} className="p-1.5 text-zoom-muted hover:text-zoom-blue" aria-label="Reply to message">
              <CornerUpLeft className="size-3.5" />
            </button>
            {isMine && (
              <button type="button" onClick={() => void removeMessage(message)} className="p-1.5 text-zoom-muted hover:text-zoom-red" aria-label="Delete message">
                <Trash2 className="size-3.5" />
              </button>
            )}
            <MoreHorizontal className="m-1.5 size-3.5 text-zoom-muted" />
          </div>
        </div>
        {isEditing ? (
          <div className="mt-1 flex gap-2">
            <input
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveEdit();
                if (event.key === "Escape") setEditing(null);
              }}
              className="min-h-9 flex-1 rounded border border-zoom-blue px-2 text-sm"
              autoFocus
            />
            <Button className="!min-h-9 !px-3 !py-1 text-xs" onClick={() => void saveEdit()}>Save</Button>
            <button type="button" className="text-xs font-bold text-zoom-muted" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-zoom-text">
            {message.reply_to_id ? <span className="mr-1 text-zoom-blue">↪</span> : null}
            {message.content}
          </p>
        )}
      </div>
    </article>
  );
}
