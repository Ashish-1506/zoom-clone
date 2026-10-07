"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCurrentUser } from "@/components/layout";
import { useToast } from "@/components/ui";
import { usePolling } from "@/hooks/usePolling";
import {
  createDirectMessage,
  createInstantMeeting,
  createTeamChannel,
  deleteTeamMessage,
  listTeamChannels,
  listTeamChatUsers,
  listTeamMessages,
  sendTeamMessage,
  updateTeamMessage,
} from "@/lib/api";
import type { TeamChannel, TeamChatUser, TeamMessage } from "@/lib/types";
import { channelLabel } from "./teamChatUtils";

export function useTeamChatController() {
  const { user } = useCurrentUser();
  const { error, success } = useToast();
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [people, setPeople] = useState<TeamChatUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const [editing, setEditing] = useState<TeamMessage | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState<Record<number, number>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<number | undefined>(undefined);
  const latestByChannelRef = useRef(new Map<number, number>());
  const selectedIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [nextChannels, nextPeople] = await Promise.all([listTeamChannels(), listTeamChatUsers()]);
      setChannels(nextChannels);
      setPeople(nextPeople);
      setSelectedId((current) => current ?? nextChannels.find((channel) => channel.name === "general")?.id ?? nextChannels[0]?.id ?? null);
      // Establish a polling cursor without marking the seeded conversation history unread.
      await Promise.all(nextChannels.map(async (channel) => {
        const history = await listTeamMessages(channel.id);
        latestByChannelRef.current.set(channel.id, history.at(-1)?.id ?? 0);
      }));
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not load Team Chat.");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  const selected = channels.find((channel) => channel.id === selectedId) ?? null;

  const loadSelectedMessages = useCallback(async (afterId?: number) => {
    if (selectedIdRef.current === null) return;
    const channelId = selectedIdRef.current;
    if (afterId === undefined) setMessageLoading(true);
    try {
      const next = await listTeamMessages(channelId, afterId);
      if (selectedIdRef.current !== channelId) return;
      if (afterId === undefined) {
        setMessages(next);
      } else if (next.length > 0) {
        setMessages((current) => {
          const existing = new Set(current.map((message) => message.id));
          return [...current, ...next.filter((message) => !existing.has(message.id))];
        });
      }
      const latest = next.at(-1)?.id;
      if (latest !== undefined) {
        latestIdRef.current = latest;
        latestByChannelRef.current.set(channelId, latest);
      } else if (afterId === undefined) {
        latestByChannelRef.current.set(channelId, 0);
      }
    } catch (caught) {
      if (afterId === undefined) error(caught instanceof Error ? caught.message : "Could not load messages.");
    } finally {
      if (afterId === undefined) setMessageLoading(false);
    }
  }, [error]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      latestIdRef.current = undefined;
      setMessages([]);
      setReplyTo(null);
      setEditing(null);
      if (selectedId !== null) void loadSelectedMessages();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSelectedMessages, selectedId]);

  usePolling(async () => {
    await Promise.all(channels.map(async (channel) => {
      const afterId = latestByChannelRef.current.get(channel.id);
      if (afterId === undefined) return;
      try {
        const next = await listTeamMessages(channel.id, afterId);
        if (next.length === 0) return;
        latestByChannelRef.current.set(channel.id, next[next.length - 1].id);
        if (selectedIdRef.current === channel.id) {
          latestIdRef.current = next[next.length - 1].id;
          setMessages((current) => {
            const existing = new Set(current.map((message) => message.id));
            return [...current, ...next.filter((message) => !existing.has(message.id))];
          });
        } else {
          const incoming = next.filter((message) => message.sender_id !== user?.id).length;
          if (incoming) setUnread((current) => ({ ...current, [channel.id]: (current[channel.id] ?? 0) + incoming }));
        }
      } catch {
        // A failed background refresh should not interrupt the active conversation.
      }
    }));
  }, 3);

  useEffect(() => {
    if (!messageLoading) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messageLoading, messages.length, selectedId]);

  const filtered = search.trim().toLowerCase();
  const publicChannels = useMemo(
    () => channels.filter((channel) => !channel.is_direct && channel.name.includes(filtered)),
    [channels, filtered],
  );
  const directChannels = useMemo(
    () => channels.filter((channel) => channel.is_direct && channelLabel(channel, user?.id).toLowerCase().includes(filtered)),
    [channels, filtered, user?.id],
  );
  const searchablePeople = useMemo(
    () => people.filter((person) => person.id !== user?.id && (person.full_name.toLowerCase().includes(filtered) || person.email.toLowerCase().includes(filtered))),
    [filtered, people, user?.id],
  );
  const groupedMessages = useMemo(() => {
    const groups = new Map<string, TeamMessage[]>();
    messages.forEach((message) => {
      const key = new Date(message.created_at).toDateString();
      groups.set(key, [...(groups.get(key) ?? []), message]);
    });
    return [...groups.values()];
  }, [messages]);

  const chooseChannel = (channelId: number) => {
    setSelectedId(channelId);
    setUnread((current) => ({ ...current, [channelId]: 0 }));
  };

  const startDirectMessage = async (person: TeamChatUser) => {
    try {
      const channel = await createDirectMessage(person.id);
      setChannels((current) => current.some((item) => item.id === channel.id) ? current : [...current, channel]);
      chooseChannel(channel.id);
      setSearch("");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not open this direct message.");
    }
  };

  const sendMessage = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const sent = await sendTeamMessage(selected.id, draft, replyTo?.id);
      setMessages((current) => [...current, sent]);
      latestIdRef.current = sent.id;
      latestByChannelRef.current.set(selected.id, sent.id);
      setDraft("");
      setReplyTo(null);
      setEmojiOpen(false);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || !editDraft.trim()) return;
    try {
      const saved = await updateTeamMessage(editing.id, editDraft);
      setMessages((current) => current.map((message) => message.id === saved.id ? saved : message));
      setEditing(null);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not edit message.");
    }
  };

  const removeMessage = async (message: TeamMessage) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteTeamMessage(message.id);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      success("Message deleted");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not delete message.");
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    try {
      const channel = await createTeamChannel({ name: newChannelName, description: newChannelDescription, is_private: newChannelPrivate });
      setChannels((current) => [...current, channel]);
      chooseChannel(channel.id);
      setChannelModalOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelPrivate(false);
      success(`Created #${channel.name}`);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not create channel.");
    } finally {
      setCreatingChannel(false);
    }
  };

  const startMeeting = async () => {
    if (!selected) return;
    try {
      const meeting = await createInstantMeeting(`Team Chat: ${channelLabel(selected, user?.id)}`);
      const invite = `I started a meeting — join here: ${meeting.invite_link}`;
      const sent = await sendTeamMessage(selected.id, invite);
      setMessages((current) => [...current, sent]);
      latestIdRef.current = sent.id;
      latestByChannelRef.current.set(selected.id, sent.id);
      success("Meeting invite posted");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not start a meeting.");
    }
  };

  return {
    user, channels, selectedId, messages, loading, messageLoading, search, setSearch, draft, setDraft,
    replyTo, setReplyTo, editing, setEditing, editDraft, setEditDraft, emojiOpen, setEmojiOpen,
    channelModalOpen, setChannelModalOpen, newChannelName, setNewChannelName, newChannelDescription,
    setNewChannelDescription, newChannelPrivate, setNewChannelPrivate, creatingChannel, sending,
    unread, listRef, selected, publicChannels, directChannels, searchablePeople, groupedMessages,
    chooseChannel, startDirectMessage, sendMessage, saveEdit, removeMessage, createChannel, startMeeting,
  };
}
