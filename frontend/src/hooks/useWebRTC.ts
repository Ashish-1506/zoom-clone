"use client";

import { useEffect, useRef, useState } from "react";
interface SignalingMessage {
  type: "offer" | "answer" | "ice" | "peer-joined" | "peer-left";
  from: number;
  to?: number;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

interface UseWebRTCOptions {
  code: string;
  participantId: number | null;
  localStream: MediaStream | null;
}

export function useWebRTC({
  code,
  participantId,
  localStream,
}: UseWebRTCOptions): Map<number, MediaStream> {
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(
    new Map(),
  );
  const socketRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);

  useEffect(() => {
    localStreamRef.current = localStream;
    peersRef.current.forEach((peer) => {
      const senders = peer.getSenders();
      localStream?.getTracks().forEach((track) => {
        if (!senders.some((sender) => sender.track?.id === track.id)) {
          peer.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  useEffect(() => {
    if (!participantId || typeof window === "undefined") return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    const configuredUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? apiUrl.replace(/^http/, "ws");
    const url = configuredUrl.replace(/\/$/, "");
    const socket = new WebSocket(
      `${url}/ws/meetings/${encodeURIComponent(code)}?participant_id=${participantId}`,
    );
    socketRef.current = socket;

    const removePeer = (remoteId: number) => {
      peersRef.current.get(remoteId)?.close();
      peersRef.current.delete(remoteId);
      setRemoteStreams((current) => {
        const next = new Map(current);
        next.delete(remoteId);
        return next;
      });
    };

    const createPeer = (remoteId: number) => {
      const existing = peersRef.current.get(remoteId);
      if (existing) return existing;
      const peer = new RTCPeerConnection({
        iceServers: process.env.NEXT_PUBLIC_STUN_SERVER_URL
          ? [{ urls: process.env.NEXT_PUBLIC_STUN_SERVER_URL }]
          : [],
      });
      peersRef.current.set(remoteId, peer);
      localStreamRef.current?.getTracks().forEach((track) => {
        const stream = localStreamRef.current;
        if (stream) peer.addTrack(track, stream);
      });
      peer.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setRemoteStreams((current) => new Map(current).set(remoteId, stream));
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "ice",
              from: participantId,
              to: remoteId,
              payload: event.candidate.toJSON(),
            } satisfies SignalingMessage),
          );
        }
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
          removePeer(remoteId);
        }
      };
      return peer;
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as SignalingMessage;
      if (message.from === participantId) return;
      if (message.type === "peer-left") {
        removePeer(message.from);
        return;
      }
      if (message.type === "peer-joined") {
        const peer = createPeer(message.from);
        if (participantId < message.from) {
          void peer.createOffer().then(async (offer) => {
            await peer.setLocalDescription(offer);
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "offer",
                from: participantId,
                to: message.from,
                payload: offer,
              } satisfies SignalingMessage));
            }
          });
        }
        return;
      }
      if (!message.to || message.to !== participantId || !message.payload) return;
      const peer = createPeer(message.from);
      if (message.type === "offer") {
        void peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit).then(async () => {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: "answer",
              from: participantId,
              to: message.from,
              payload: answer,
            } satisfies SignalingMessage));
          }
        });
      } else if (message.type === "answer") {
        void peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
      } else if (message.type === "ice") {
        void peer.addIceCandidate(message.payload as RTCIceCandidateInit);
      }
    };

    socket.onerror = () => {
      // Avatar tiles remain visible when signaling is unavailable.
    };
    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
    };

    const peers = peersRef.current;
    return () => {
      socket.close();
      peers.forEach((peer) => peer.close());
      peers.clear();
      setRemoteStreams(new Map());
    };
  }, [code, participantId]);

  return remoteStreams;
}
