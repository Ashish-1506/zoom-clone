"use client";

// Zoom Phone is intentionally a UI simulation for this assignment; it never places real telephone calls.

import {
  ArrowDownLeft,
  ArrowUpRight,
  CirclePause,
  Delete,
  History,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  Play,
  Search,
  UserPlus,
  Users,
  Voicemail as VoicemailIcon,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Avatar, Button, Modal, Spinner, useToast } from "@/components/ui";
import {
  createCallLog,
  createPhoneContact,
  listCallLogs,
  listPhoneContacts,
  listVoicemails,
  markVoicemailListened,
} from "@/lib/api";
import type { CallLog, PhoneContact, Voicemail } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "keypad" | "history" | "voicemail" | "contacts";
type ActiveCall = { number: string; name: string | null; status: "calling" | "connected"; startedAt: number | null };

const DIAL_KEYS = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
] as const;

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function timeLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function PhonePage() {
  const { error, success } = useToast();
  const [tab, setTab] = useState<Tab>("keypad");
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState("");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [callKeypad, setCallKeypad] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "" });

  const loadPhone = useCallback(async () => {
    setLoading(true);
    try {
      const [nextLogs, nextVoicemails, nextContacts] = await Promise.all([listCallLogs(), listVoicemails(), listPhoneContacts()]);
      setLogs(nextLogs);
      setVoicemails(nextVoicemails);
      setContacts(nextContacts);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not load Zoom Phone.");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPhone(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPhone]);

  useEffect(() => {
    if (!activeCall || activeCall.status !== "calling") return;
    const timer = window.setTimeout(() => setActiveCall((current) => current ? { ...current, status: "connected", startedAt: Date.now() } : null), 2000);
    return () => window.clearTimeout(timer);
  }, [activeCall]);

  useEffect(() => {
    if (!activeCall?.startedAt) return;
    const update = () => setElapsed(Math.floor((Date.now() - activeCall.startedAt!) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeCall?.startedAt]);

  useEffect(() => {
    if (playingId === null) return;
    const voicemail = voicemails.find((item) => item.id === playingId);
    if (!voicemail) return;
    const timer = window.setInterval(() => {
      setPlayProgress((current) => {
        if (current + 1 >= voicemail.duration_seconds) {
          window.clearInterval(timer);
          setPlayingId(null);
          return 0;
        }
        return current + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playingId, voicemails]);

  const contactForNumber = (candidate: string) => {
    const compact = candidate.replace(/\D/g, "");
    return contacts.find((contact) => contact.phone.replace(/\D/g, "") === compact) ?? null;
  };
  const displayContact = contactForNumber(number);
  const filteredContacts = useMemo(() => contacts.filter((contact) => `${contact.name} ${contact.phone} ${contact.email ?? ""}`.toLowerCase().includes(contactSearch.toLowerCase())), [contactSearch, contacts]);

  const beginCall = (phoneNumber = number, name: string | null = displayContact?.name ?? null) => {
    if (!phoneNumber.trim()) return;
    setActiveCall({ number: phoneNumber, name, status: "calling", startedAt: null });
    setElapsed(0);
    setMuted(false);
    setHeld(false);
    setCallKeypad(false);
  };

  const endCall = async () => {
    if (!activeCall) return;
    try {
      const log = await createCallLog({ contact_name: activeCall.name, phone_number: activeCall.number, direction: "out", duration_seconds: elapsed });
      setLogs((current) => [log, ...current]);
      success("Call added to history");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not save call history.");
    } finally {
      setActiveCall(null);
      setNumber("");
    }
  };

  const toggleVoicemail = async (voicemail: Voicemail) => {
    if (playingId === voicemail.id) {
      setPlayingId(null);
      return;
    }
    try {
      if (!voicemail.is_listened) {
        const updated = await markVoicemailListened(voicemail.id);
        setVoicemails((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
      setPlayProgress(0);
      setPlayingId(voicemail.id);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not play voicemail.");
    }
  };

  const addContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    try {
      const contact = await createPhoneContact({ name: newContact.name, phone: newContact.phone, email: newContact.email || null });
      setContacts((current) => [...current, contact].sort((left, right) => left.name.localeCompare(right.name)));
      setNewContact({ name: "", phone: "", email: "" });
      setAddContactOpen(false);
      success("Contact added");
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not add contact.");
    }
  };

  if (activeCall) return <CallScreen call={activeCall} elapsed={elapsed} muted={muted} held={held} keypadOpen={callKeypad} onMute={() => setMuted((value) => !value)} onHold={() => setHeld((value) => !value)} onKeypad={() => setCallKeypad((value) => !value)} onEnd={() => void endCall()} />;
  if (loading) return <div className="flex min-h-[560px] items-center justify-center"><Spinner /></div>;

  return <section className="mx-auto max-w-5xl"><div className="mb-6"><p className="text-sm font-bold text-zoom-blue">Communication</p><h1 className="mt-1 text-3xl font-black tracking-tight text-zoom-text">Zoom Phone</h1><p className="mt-1 text-sm text-zoom-muted">A simulated softphone for this demo — no real calls are placed.</p></div><div className="overflow-hidden rounded-xl border border-zoom-border bg-white shadow-sm"><div className="flex overflow-x-auto border-b border-zoom-border px-2">{([ ["keypad", "Keypad", PhoneCall], ["history", "Call history", History], ["voicemail", "Voicemail", VoicemailIcon], ["contacts", "Contacts", Users] ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={cn("flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold", tab === id ? "border-zoom-blue text-zoom-blue" : "border-transparent text-zoom-muted hover:text-zoom-text")}><Icon className="size-4" />{label}{id === "voicemail" && voicemails.some((item) => !item.is_listened) ? <span className="size-2 rounded-full bg-zoom-blue" /> : null}</button>)}</div><div className="min-h-[510px]">{tab === "keypad" && <Keypad number={number} contact={displayContact} onChange={setNumber} onCall={() => beginCall()} />}{tab === "history" && <HistoryTab logs={logs} onCall={(log) => beginCall(log.phone_number, log.contact_name)} />}{tab === "voicemail" && <VoicemailTab voicemails={voicemails} playingId={playingId} progress={playProgress} onPlay={(voicemail) => void toggleVoicemail(voicemail)} />}{tab === "contacts" && <ContactsTab contacts={filteredContacts} search={contactSearch} onSearch={setContactSearch} onCall={(contact) => beginCall(contact.phone, contact.name)} onAdd={() => setAddContactOpen(true)} />}</div></div><Modal open={addContactOpen} title="Add contact" onClose={() => setAddContactOpen(false)}><div className="space-y-4"><PhoneInput label="Name" value={newContact.name} onChange={(value) => setNewContact((current) => ({ ...current, name: value }))} /><PhoneInput label="Phone number" value={newContact.phone} onChange={(value) => setNewContact((current) => ({ ...current, phone: value }))} /><PhoneInput label="Email (optional)" value={newContact.email} onChange={(value) => setNewContact((current) => ({ ...current, email: value }))} type="email" /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAddContactOpen(false)}>Cancel</Button><Button disabled={!newContact.name.trim() || !newContact.phone.trim()} onClick={() => void addContact()}>Add contact</Button></div></div></Modal></section>;
}

function Keypad({ number, contact, onChange, onCall }: { number: string; contact: PhoneContact | null; onChange: (value: string) => void; onCall: () => void }) {
  return <div className="mx-auto flex max-w-sm flex-col items-center px-5 py-8"><div className="w-full rounded-lg bg-zoom-bg px-4 py-3 text-center"><p className="h-7 truncate text-xl font-black tracking-wide text-zoom-text">{number || "Enter a number"}</p><p className="mt-1 h-4 text-xs text-zoom-muted">{contact?.name ?? (number ? "Unknown number" : "")}</p></div><div className="mt-6 grid w-full grid-cols-3 gap-3">{DIAL_KEYS.map(([digit, letters]) => <button key={digit} type="button" onClick={() => onChange(number + digit)} className="flex aspect-square flex-col items-center justify-center rounded-full bg-zoom-bg text-zoom-text hover:bg-zoom-blue-light"><span className="text-2xl font-bold">{digit}</span><span className="h-3 text-[9px] font-black tracking-[0.16em]">{letters}</span></button>)}</div><div className="mt-5 flex w-full items-center justify-center gap-10"><span className="size-12" /><button type="button" disabled={!number} onClick={onCall} className="flex size-14 items-center justify-center rounded-full bg-zoom-green text-white shadow-lg hover:brightness-95" aria-label="Call number"><PhoneCall className="size-6" /></button><button type="button" onClick={() => onChange(number.slice(0, -1))} disabled={!number} className="flex size-12 items-center justify-center rounded-full text-zoom-muted hover:bg-zoom-bg" aria-label="Backspace"><Delete className="size-5" /></button></div></div>;
}

function HistoryTab({ logs, onCall }: { logs: CallLog[]; onCall: (log: CallLog) => void }) {
  return <div className="divide-y divide-zoom-border">{logs.map((log) => { const Icon = log.direction === "out" ? ArrowUpRight : log.direction === "in" ? ArrowDownLeft : X; return <div key={log.id} className="flex items-center gap-3 px-5 py-4 sm:px-7"><span className={cn("flex size-10 items-center justify-center rounded-full", log.direction === "missed" ? "bg-red-50 text-zoom-red" : "bg-zoom-blue-light text-zoom-blue")}><Icon className="size-5" /></span><div className="min-w-0 flex-1"><p className={cn("truncate font-bold", log.direction === "missed" ? "text-zoom-red" : "text-zoom-text")}>{log.contact_name ?? log.phone_number}</p><p className="mt-0.5 text-xs text-zoom-muted">{log.direction === "out" ? "Outgoing" : log.direction === "in" ? "Incoming" : "Missed"} · {log.phone_number}{log.duration_seconds ? ` · ${formatDuration(log.duration_seconds)}` : ""}</p></div><time className="hidden text-xs text-zoom-muted sm:block">{timeLabel(log.created_at)}</time><button type="button" onClick={() => onCall(log)} className="flex size-10 items-center justify-center rounded-full text-zoom-green hover:bg-green-50" aria-label={`Call ${log.contact_name ?? log.phone_number}`}><PhoneCall className="size-5" /></button></div>; })}{logs.length === 0 && <Empty icon={History} text="No call history yet" />}</div>;
}

function VoicemailTab({ voicemails, playingId, progress, onPlay }: { voicemails: Voicemail[]; playingId: number | null; progress: number; onPlay: (voicemail: Voicemail) => void }) {
  return <div className="divide-y divide-zoom-border">{voicemails.map((voicemail) => { const playing = playingId === voicemail.id; return <article key={voicemail.id} className={cn("px-5 py-5 sm:px-7", !voicemail.is_listened && "bg-zoom-blue-light/30")}><div className="flex items-start gap-3"><Avatar name={voicemail.caller_name} size="md" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-zoom-text">{voicemail.caller_name}{!voicemail.is_listened && <span className="ml-2 inline-block size-2 rounded-full bg-zoom-blue" />}</p><p className="text-xs text-zoom-muted">{voicemail.phone_number} · {timeLabel(voicemail.created_at)}</p></div><span className="text-xs text-zoom-muted">{formatDuration(voicemail.duration_seconds)}</span></div><div className="mt-3 flex items-center gap-3"><button type="button" onClick={() => onPlay(voicemail)} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zoom-blue text-white" aria-label={playing ? "Pause voicemail" : "Play voicemail"}>{playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}</button><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zoom-border"><div className="h-full bg-zoom-blue transition-[width]" style={{ width: `${playing ? (progress / voicemail.duration_seconds) * 100 : 0}%` }} /></div></div><p className="mt-3 rounded-md bg-zoom-bg p-3 text-sm leading-6 text-zoom-text"><span className="font-bold">Transcript: </span>{voicemail.transcript}</p></div></div></article>; })}{voicemails.length === 0 && <Empty icon={VoicemailIcon} text="No voicemails" />}</div>;
}

function ContactsTab({ contacts, search, onSearch, onCall, onAdd }: { contacts: PhoneContact[]; search: string; onSearch: (value: string) => void; onCall: (contact: PhoneContact) => void; onAdd: () => void }) {
  return <div><div className="flex flex-wrap gap-3 border-b border-zoom-border p-4 sm:px-7"><label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zoom-muted" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search contacts" className="min-h-10 w-full rounded-md border border-zoom-border py-2 pl-9 pr-3 text-sm" /></label><Button size="sm" onClick={onAdd}><UserPlus className="size-4" /> Add contact</Button></div><div className="divide-y divide-zoom-border">{contacts.map((contact) => <div key={contact.id} className="flex items-center gap-3 px-5 py-4 sm:px-7"><Avatar name={contact.name} size="md" /><div className="min-w-0 flex-1"><p className="truncate font-bold text-zoom-text">{contact.name}</p><p className="truncate text-xs text-zoom-muted">{contact.phone}{contact.email ? ` · ${contact.email}` : ""}</p></div><button type="button" onClick={() => onCall(contact)} className="flex size-10 items-center justify-center rounded-full bg-zoom-green text-white hover:brightness-95" aria-label={`Call ${contact.name}`}><PhoneCall className="size-5" /></button></div>)}{contacts.length === 0 && <Empty icon={Users} text="No matching contacts" />}</div></div>;
}

function CallScreen({ call, elapsed, muted, held, keypadOpen, onMute, onHold, onKeypad, onEnd }: { call: ActiveCall; elapsed: number; muted: boolean; held: boolean; keypadOpen: boolean; onMute: () => void; onHold: () => void; onKeypad: () => void; onEnd: () => void }) {
  return <main className="flex min-h-[calc(100dvh-7rem)] items-center justify-center rounded-xl bg-gradient-to-br from-[#153969] to-[#0b5cff] p-5 text-white"><div className="w-full max-w-sm text-center"><div className="mx-auto flex size-24 items-center justify-center rounded-full bg-white/15 text-4xl font-black">{(call.name ?? call.number).slice(0, 1).toUpperCase()}</div><h1 className="mt-5 text-2xl font-black">{call.name ?? call.number}</h1><p className="mt-1 text-white/75">{call.name ? call.number : "Zoom Phone"}</p><p className="mt-5 text-sm font-bold">{call.status === "calling" ? "Calling…" : held ? "On hold" : formatDuration(elapsed)}</p>{keypadOpen && <div className="mx-auto mt-5 grid max-w-[220px] grid-cols-3 gap-2 rounded-xl bg-black/20 p-3">{DIAL_KEYS.map(([digit]) => <span key={digit} className="rounded bg-white/10 py-2 font-bold">{digit}</span>)}</div>}<div className="mt-10 grid grid-cols-3 gap-x-5 gap-y-7"><CallAction icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} active={muted} onClick={onMute} /><CallAction icon={CirclePause} label="Keypad" active={keypadOpen} onClick={onKeypad} /><CallAction icon={Pause} label={held ? "Resume" : "Hold"} active={held} onClick={onHold} /></div><button type="button" onClick={onEnd} className="mt-10 inline-flex size-16 items-center justify-center rounded-full bg-zoom-red shadow-lg hover:brightness-95" aria-label="End call"><PhoneCall className="size-7 rotate-[135deg]" /></button><p className="mt-2 text-xs font-bold">End</p></div></main>;
}

function CallAction({ icon: Icon, label, active, onClick }: { icon: typeof Mic; label: string; active?: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 text-xs font-bold"><span className={cn("flex size-12 items-center justify-center rounded-full bg-white/15", active && "bg-white text-zoom-blue")}><Icon className="size-5" /></span>{label}</button>; }
function Empty({ icon: Icon, text }: { icon: typeof History; text: string }) { return <div className="flex min-h-64 flex-col items-center justify-center text-zoom-muted"><Icon className="mb-3 size-7" /><p className="font-bold">{text}</p></div>; }
function PhoneInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm font-bold text-zoom-text">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-zoom-border px-3 text-sm" /></label>; }
