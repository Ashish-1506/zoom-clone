"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { InviteModal } from "@/components/meetings";
import { Button, Modal, useToast } from "@/components/ui";
import { usePolling } from "@/hooks/usePolling";
import { listParticipants, muteAll, removeParticipant } from "@/lib/api";
import type { Meeting, Participant } from "@/lib/types";
import { ParticipantRow } from "./ParticipantRow";

interface ParticipantsPanelProps {
  code: string;
  meeting: Meeting | null;
  currentParticipant: Participant;
  isHost: boolean;
  onClose: () => void;
  onParticipantsChange: (participants: Participant[]) => void;
  onRemoved: () => void;
  onHostMute: (participant: Participant) => void;
  onLowerHand: (participant: Participant) => void;
}

export function ParticipantsPanel({
  code,
  meeting,
  currentParticipant,
  isHost,
  onClose,
  onParticipantsChange,
  onRemoved,
  onHostMute,
  onLowerHand,
}: ParticipantsPanelProps) {
  const { error, success } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [removeTarget, setRemoveTarget] = useState<Participant | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listParticipants(code);
      setParticipants(next);
      onParticipantsChange(next);
      if (next.some((participant) => participant.id === currentParticipant.id && participant.is_removed)) {
        onRemoved();
      }
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to load participants.");
    }
  }, [code, currentParticipant.id, error, onParticipantsChange, onRemoved]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  usePolling(refresh, 3);

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeParticipant(code, removeTarget.id, currentParticipant.id);
      success(`${removeTarget.display_name} was removed`);
      setRemoveTarget(null);
      setMenuId(null);
      await refresh();
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to remove participant.");
    }
  };

  const handleMuteAll = async () => {
    try {
      await muteAll(code, currentParticipant.id);
      success("All participants have been muted");
      await refresh();
    } catch (caughtError: unknown) {
      error(caughtError instanceof Error ? caughtError.message : "Unable to mute participants.");
    }
  };

  return (
    <>
      <aside className="absolute inset-0 z-20 flex w-full max-w-none animate-in flex-col border-l border-zoom-border bg-white text-zoom-text shadow-2xl md:inset-y-12 md:left-auto md:max-w-xs">
        <div className="flex items-center justify-between border-b border-zoom-border px-4 py-3">
          <h2 className="font-bold">Participants ({participants.length})</h2>
          <button type="button" onClick={onClose} aria-label="Close participants panel" title="Close participants panel" className="min-h-11 min-w-11 rounded p-1 hover:bg-zoom-bg"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {[...participants]
            .sort((left, right) => {
              if (left.hand_raised !== right.hand_raised) return left.hand_raised ? -1 : 1;
              if (!left.hand_raised_at || !right.hand_raised_at) return 0;
              return Date.parse(left.hand_raised_at) - Date.parse(right.hand_raised_at);
            })
            .map((participant) => {
              return (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  currentParticipantId={currentParticipant.id}
                  isHost={isHost}
                  menuOpen={menuId === participant.id}
                  onMute={() => onHostMute(participant)}
                  onToggleMenu={() =>
                    setMenuId(menuId === participant.id ? null : participant.id)
                  }
                  onLowerHand={() => {
                    onLowerHand(participant);
                    setMenuId(null);
                  }}
                  onRemove={() => setRemoveTarget(participant)}
                />
              );
            })}
        </div>
        {isHost && (
          <div className="flex gap-2 border-t border-zoom-border p-3">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => void handleMuteAll()}>Mute All</Button>
            <Button size="sm" className="flex-1" onClick={() => setInviteOpen(true)}>Invite</Button>
          </div>
        )}
      </aside>
      <Modal open={Boolean(removeTarget)} title={`Remove ${removeTarget?.display_name ?? ""} from the meeting?`} onClose={() => setRemoveTarget(null)}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmRemove()}>Remove</Button>
        </div>
      </Modal>
      <InviteModal meeting={inviteOpen ? meeting : null} onClose={() => setInviteOpen(false)} />
    </>
  );
}
