export const AUDIO_TRANSCEIVER_INDEX = 0;
export const CAMERA_TRANSCEIVER_INDEX = 1;
export const SCREEN_TRANSCEIVER_INDEX = 2;

interface PeerMediaTransceiver {
  receiver: { track: { kind: string } };
  sender: { replaceTrack: (track: MediaStreamTrack | null) => Promise<void> };
}

interface PeerMediaConnection {
  getTransceivers: () => PeerMediaTransceiver[];
}

export async function syncPeerMediaTracks(
  peer: PeerMediaConnection,
  cameraAndMic: MediaStream | null,
  screen: MediaStream | null,
): Promise<void> {
  const transceivers = peer.getTransceivers();
  const audioTransceiver = transceivers[AUDIO_TRANSCEIVER_INDEX];
  const cameraTransceiver = transceivers[CAMERA_TRANSCEIVER_INDEX];
  const screenTransceiver = transceivers[SCREEN_TRANSCEIVER_INDEX];
  if (!audioTransceiver || !cameraTransceiver || !screenTransceiver) {
    throw new Error("Peer connection is missing a reserved media transceiver.");
  }

  const tracks = [
    [
      audioTransceiver,
      cameraAndMic?.getAudioTracks()[0] ?? null,
    ],
    [
      cameraTransceiver,
      cameraAndMic?.getVideoTracks()[0] ?? null,
    ],
    [
      screenTransceiver,
      screen?.getVideoTracks()[0] ?? null,
    ],
  ] as const;

  await Promise.all(
    tracks.map(([transceiver, track]) => transceiver.sender.replaceTrack(track)),
  );
}

export function isScreenShareTransceiver(
  peer: Pick<RTCPeerConnection, "getTransceivers">,
  target: RTCRtpTransceiver,
): boolean {
  return peer.getTransceivers()[SCREEN_TRANSCEIVER_INDEX] === target;
}
