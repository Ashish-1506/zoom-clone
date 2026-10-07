"use client";

import { useEffect, useRef, useState } from "react";

import { isScreenShareTransceiver, syncPeerMediaTracks } from "@/lib/webrtc";

interface SignalingMessage {
  type:
    | "offer"
    | "answer"
    | "ice"
    | "peer-joined"
    | "peer-left"
    | "screen-share-start"
    | "screen-share-stop"
    | "screen-share-started"
    | "screen-share-stopped"
    | "screen-share-rejected";
  from: number;
  to?: number;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

interface UseWebRTCOptions {
  code: string;
  participantId: number | null;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  onError?: (message: string) => void;
  onShareRejected?: () => void;
}

export interface UseWebRTCResult {
  remoteStreams: Map<number, MediaStream>;
  remoteScreenStreams: Map<number, MediaStream>;
  activeScreenSharerId: number | null;
}

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  const stunUrl = process.env.NEXT_PUBLIC_STUN_SERVER_URL;
  const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  if (stunUrl) servers.push({ urls: stunUrl });
  if (turnUrl) {
    const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    if (!username || !credential) {
      throw new Error("TURN server URL requires TURN username and credential.");
    }
    servers.push({ urls: turnUrl, username, credential });
  }
  return servers;
}

export function useWebRTC({
  code,
  participantId,
  localStream,
  screenStream,
  onError,
  onShareRejected,
}: UseWebRTCOptions): UseWebRTCResult {
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(
    new Map(),
  );
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<
    Map<number, MediaStream>
  >(new Map());
  const [activeScreenSharerId, setActiveScreenSharerId] = useState<number | null>(
    null,
  );
  const socketRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const remoteScreenStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const pendingCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(
    new Map(),
  );
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);
  const onErrorRef = useRef(onError);
  const onShareRejectedRef = useRef(onShareRejected);

  useEffect(() => {
    onErrorRef.current = onError;
    onShareRejectedRef.current = onShareRejected;
  }, [onError, onShareRejected]);

  useEffect(() => {
    localStreamRef.current = localStream;
    peersRef.current.forEach((peer) => {
      void syncPeerMediaTracks(peer, localStream, screenStreamRef.current).catch(
        () => onErrorRef.current?.("Unable to send your camera or microphone."),
      );
    });
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
    peersRef.current.forEach((peer) => {
      void syncPeerMediaTracks(peer, localStreamRef.current, screenStream).catch(
        () => onErrorRef.current?.("Unable to send your shared screen."),
      );
    });
    if (socketRef.current?.readyState === WebSocket.OPEN && participantId) {
      socketRef.current.send(
        JSON.stringify({
          type: screenStream ? "screen-share-start" : "screen-share-stop",
          from: participantId,
        } satisfies SignalingMessage),
      );
      setActiveScreenSharerId(screenStream ? participantId : null);
    }
  }, [participantId, screenStream]);

  useEffect(() => {
    if (!participantId || typeof window === "undefined") return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      onErrorRef.current?.("The meeting signaling URL is not configured.");
      return;
    }
    const configuredUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? apiUrl.replace(/^http/, "ws");
    const url = configuredUrl.replace(/\/$/, "");
    let iceServers: RTCIceServer[];
    try {
      iceServers = getIceServers();
    } catch (caughtError) {
      onErrorRef.current?.(
        caughtError instanceof Error
          ? caughtError.message
          : "The TURN server configuration is invalid.",
      );
      return;
    }
    const socket = new WebSocket(
      `${url}/ws/meetings/${encodeURIComponent(code)}?participant_id=${participantId}`,
    );
    socketRef.current = socket;

    const send = (message: SignalingMessage) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    };

    const removePeer = (remoteId: number) => {
      peersRef.current.get(remoteId)?.close();
      peersRef.current.delete(remoteId);
      remoteStreamsRef.current.delete(remoteId);
      remoteScreenStreamsRef.current.delete(remoteId);
      pendingCandidatesRef.current.delete(remoteId);
      setRemoteStreams(new Map(remoteStreamsRef.current));
      setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
      setActiveScreenSharerId((activeId) =>
        activeId === remoteId ? null : activeId,
      );
    };

    const createPeer = (remoteId: number) => {
      const existing = peersRef.current.get(remoteId);
      if (existing) return existing;
      const peer = new RTCPeerConnection({ iceServers });
      peersRef.current.set(remoteId, peer);
      peer.addTransceiver("audio", { direction: "sendrecv" });
      peer.addTransceiver("video", { direction: "sendrecv" });
      peer.addTransceiver("video", { direction: "sendrecv" });
      void syncPeerMediaTracks(
        peer,
        localStreamRef.current,
        screenStreamRef.current,
      ).catch(() => {
        onErrorRef.current?.("Unable to attach local meeting media.");
      });

      peer.ontrack = (event) => {
        const isPresentation = isScreenShareTransceiver(peer, event.transceiver);
        const streams = isPresentation
          ? remoteScreenStreamsRef.current
          : remoteStreamsRef.current;
        const stream = streams.get(remoteId) ?? event.streams[0] ?? new MediaStream();
        if (!stream.getTracks().some((track) => track.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        streams.set(remoteId, stream);
        if (isPresentation) {
          setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
        } else {
          setRemoteStreams(new Map(remoteStreamsRef.current));
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: "ice",
            from: participantId,
            to: remoteId,
            payload: event.candidate.toJSON(),
          });
        }
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          onErrorRef.current?.(
            "Could not connect to a participant. This network may require a TURN server.",
          );
        } else if (peer.connectionState === "closed") {
          removePeer(remoteId);
        }
      };
      return peer;
    };

    const flushCandidates = async (remoteId: number, peer: RTCPeerConnection) => {
      const candidates = pendingCandidatesRef.current.get(remoteId) ?? [];
      pendingCandidatesRef.current.delete(remoteId);
      for (const candidate of candidates) {
        await peer.addIceCandidate(candidate);
      }
    };

    socket.onopen = () => {
      const isSharingScreen = Boolean(screenStreamRef.current);
      send({
        type: isSharingScreen ? "screen-share-start" : "screen-share-stop",
        from: participantId,
      });
      setActiveScreenSharerId(isSharingScreen ? participantId : null);
    };

    socket.onmessage = (event) => {
      let message: SignalingMessage;
      try {
        message = JSON.parse(event.data) as SignalingMessage;
      } catch {
        onErrorRef.current?.("Received an invalid meeting signaling message.");
        return;
      }
      if (message.from === participantId) return;
      if (message.type === "screen-share-started") {
        setActiveScreenSharerId(message.from);
        return;
      }
      if (message.type === "screen-share-stopped") {
        setActiveScreenSharerId((activeId) =>
          activeId === message.from ? null : activeId,
        );
        remoteScreenStreamsRef.current.delete(message.from);
        setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
        return;
      }
      if (message.type === "screen-share-rejected") {
        onShareRejectedRef.current?.();
        onErrorRef.current?.("Someone else is already sharing their screen.");
        return;
      }
      if (message.type === "peer-left") {
        removePeer(message.from);
        return;
      }
      if (message.type === "peer-joined") {
        const peer = createPeer(message.from);
        if (participantId < message.from) {
          void peer
            .createOffer()
            .then(async (offer) => {
              await peer.setLocalDescription(offer);
              send({
                type: "offer",
                from: participantId,
                to: message.from,
                payload: offer,
              });
            })
            .catch(() =>
              onErrorRef.current?.("Unable to start the participant connection."),
            );
        }
        return;
      }
      if (message.to !== participantId || !message.payload) return;
      const peer = createPeer(message.from);
      if (message.type === "offer") {
        void peer
          .setRemoteDescription(message.payload as RTCSessionDescriptionInit)
          .then(async () => {
            await flushCandidates(message.from, peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            send({
              type: "answer",
              from: participantId,
              to: message.from,
              payload: answer,
            });
          })
          .catch(() =>
            onErrorRef.current?.("Unable to accept the participant connection."),
          );
      } else if (message.type === "answer") {
        void peer
          .setRemoteDescription(message.payload as RTCSessionDescriptionInit)
          .then(() => flushCandidates(message.from, peer))
          .catch(() =>
            onErrorRef.current?.("Unable to finish the participant connection."),
          );
      } else if (message.type === "ice") {
        const candidate = message.payload as RTCIceCandidateInit;
        if (peer.remoteDescription) {
          void peer.addIceCandidate(candidate).catch(() => {
            onErrorRef.current?.(
              "Unable to establish the participant network connection.",
            );
          });
        } else {
          const pending = pendingCandidatesRef.current.get(message.from) ?? [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(message.from, pending);
        }
      }
    };

    socket.onerror = () => {
      onErrorRef.current?.(
        "Meeting signaling could not connect. Check the backend WebSocket URL.",
      );
    };
    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
    };

    const peers = peersRef.current;
    const remoteStreams = remoteStreamsRef.current;
    const remoteScreenStreams = remoteScreenStreamsRef.current;
    const pendingCandidates = pendingCandidatesRef.current;
    return () => {
      socket.close();
      peers.forEach((peer) => peer.close());
      peers.clear();
      remoteStreams.clear();
      remoteScreenStreams.clear();
      pendingCandidates.clear();
      setRemoteStreams(new Map());
      setRemoteScreenStreams(new Map());
      setActiveScreenSharerId(null);
    };
  }, [code, participantId]);

  return { remoteStreams, remoteScreenStreams, activeScreenSharerId };
}
