"use client";

import { Hash, Lock, Plus, Search } from "lucide-react";

import { Avatar, Button, Modal, Spinner } from "@/components/ui";
import type { TeamChannel, TeamChatUser } from "@/lib/types";
import { channelLabel } from "./teamChatUtils";
import { TeamChatConversation } from "./TeamChatConversation";
import { useTeamChatController } from "./useTeamChatController";

export function TeamChatPage() {
  const model = useTeamChatController();
  const {
    channels, selectedId, user, search, setSearch, unread, publicChannels, directChannels, searchablePeople,
    chooseChannel, startDirectMessage, selected, loading, channelModalOpen, setChannelModalOpen,
    newChannelName, setNewChannelName, newChannelDescription, setNewChannelDescription,
    newChannelPrivate, setNewChannelPrivate, creatingChannel, createChannel,
  } = model;

  if (loading) return <div className="flex min-h-[560px] items-center justify-center"><Spinner /></div>;

  return (
    <section className="-mx-3 -my-5 h-[calc(100dvh-3.5rem)] min-h-[620px] overflow-hidden bg-white sm:-mx-5 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div className="flex h-full">
        <TeamChatSidebar
          channels={channels}
          selectedId={selectedId}
          currentUserId={user?.id}
          search={search}
          unread={unread}
          publicChannels={publicChannels}
          directChannels={directChannels}
          searchablePeople={searchablePeople}
          onSearch={setSearch}
          onChoose={chooseChannel}
          onCreateChannel={() => setChannelModalOpen(true)}
          onStartDirectMessage={startDirectMessage}
        />
        {selected ? (
          <TeamChatConversation model={model} selected={selected} />
        ) : (
          <main className="flex min-w-0 flex-1 items-center justify-center text-zoom-muted">
            Select a conversation to start chatting.
          </main>
        )}
      </div>
      <Modal open={channelModalOpen} title="Create a channel" onClose={() => setChannelModalOpen(false)}>
        <div className="space-y-4">
          <label className="block text-sm font-bold text-zoom-text">
            Channel name
            <input
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              placeholder="e.g. design-review"
              className="mt-1.5 min-h-11 w-full rounded-md border border-zoom-border px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-bold text-zoom-text">
            Description <span className="font-normal text-zoom-muted">(optional)</span>
            <textarea
              value={newChannelDescription}
              onChange={(event) => setNewChannelDescription(event.target.value)}
              rows={3}
              maxLength={280}
              className="mt-1.5 w-full rounded-md border border-zoom-border p-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zoom-text">
            <input type="checkbox" checked={newChannelPrivate} onChange={(event) => setNewChannelPrivate(event.target.checked)} />
            Make this channel private
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setChannelModalOpen(false)}>Cancel</Button>
            <Button disabled={!newChannelName.trim() || creatingChannel} onClick={() => void createChannel()}>
              {creatingChannel ? "Creating…" : "Create channel"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function TeamChatSidebar({
  channels, selectedId, currentUserId, search, unread, publicChannels, directChannels, searchablePeople,
  onSearch, onChoose, onCreateChannel, onStartDirectMessage,
}: {
  channels: TeamChannel[];
  selectedId: number | null;
  currentUserId?: number;
  search: string;
  unread: Record<number, number>;
  publicChannels: TeamChannel[];
  directChannels: TeamChannel[];
  searchablePeople: TeamChatUser[];
  onSearch: (value: string) => void;
  onChoose: (channelId: number) => void;
  onCreateChannel: () => void;
  onStartDirectMessage: (person: TeamChatUser) => void;
}) {
  const starred = channels.filter((channel) => !channel.is_direct).slice(0, 1);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-zoom-border bg-[#fbfcfe] dark:bg-[#242528]">
      <div className="border-b border-zoom-border p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zoom-muted" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search channels and people"
            className="min-h-10 w-full rounded-md border border-zoom-border bg-white py-2 pl-9 pr-3 text-sm text-zoom-text placeholder:text-zoom-muted"
          />
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Team Chat conversations">
        <p className="px-2 pb-1 text-xs font-black uppercase tracking-wide text-zoom-muted">Starred</p>
        {starred.map((channel) => (
          <ConversationButton key={channel.id} channel={channel} active={channel.id === selectedId} currentUserId={currentUserId} unread={unread[channel.id]} onClick={() => onChoose(channel.id)} />
        ))}
        <div className="mt-5 flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-black uppercase tracking-wide text-zoom-muted">Channels</p>
          <button type="button" onClick={onCreateChannel} className="rounded p-1 text-zoom-muted hover:bg-zoom-blue-light hover:text-zoom-blue" aria-label="Create channel" title="Create channel">
            <Plus className="size-4" />
          </button>
        </div>
        {publicChannels.map((channel) => (
          <ConversationButton key={channel.id} channel={channel} active={channel.id === selectedId} currentUserId={currentUserId} unread={unread[channel.id]} onClick={() => onChoose(channel.id)} />
        ))}
        <div className="mt-5 px-2 pb-1"><p className="text-xs font-black uppercase tracking-wide text-zoom-muted">Direct messages</p></div>
        {directChannels.map((channel) => (
          <ConversationButton key={channel.id} channel={channel} active={channel.id === selectedId} currentUserId={currentUserId} unread={unread[channel.id]} onClick={() => onChoose(channel.id)} />
        ))}
        {search.trim() && (
          <>
            <div className="mt-5 px-2 pb-1"><p className="text-xs font-black uppercase tracking-wide text-zoom-muted">People</p></div>
            {searchablePeople.map((person) => (
              <button type="button" key={person.id} onClick={() => void onStartDirectMessage(person)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-zoom-blue-light">
                <span className="relative">
                  <Avatar name={person.full_name} color={person.avatar_color} size="sm" />
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-zoom-green" />
                </span>
                <span className="truncate font-bold text-zoom-text">{person.full_name}</span>
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function ConversationButton({
  channel, active, currentUserId, unread, onClick,
}: {
  channel: TeamChannel;
  active: boolean;
  currentUserId?: number;
  unread?: number;
  onClick: () => void;
}) {
  const isDirect = channel.is_direct;
  const peer = channel.members.find((member) => member.id !== currentUserId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
        active ? "bg-zoom-blue text-white" : "text-zoom-muted hover:bg-zoom-blue-light hover:text-zoom-text"
      }`}
    >
      <span className="relative shrink-0">
        {isDirect ? (
          <Avatar name={peer?.full_name ?? "Direct message"} color={peer?.avatar_color} size="sm" />
        ) : channel.is_private ? <Lock className="size-4" /> : <Hash className="size-4" />}
        {isDirect && (
          <span className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 ${
            active ? "border-zoom-blue" : "border-[#fbfcfe]"
          } bg-zoom-green`} />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold">{channelLabel(channel, currentUserId)}</span>
      {unread ? (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
          active ? "bg-white text-zoom-blue" : "bg-zoom-blue text-white"
        }`}>
          {unread}
        </span>
      ) : null}
    </button>
  );
}
