import { describe, expect, it, vi } from "vitest";

import { syncPeerMediaTracks } from "./webrtc";

function fakeTrack(kind: string): MediaStreamTrack {
  return { kind } as MediaStreamTrack;
}

function fakeStream(
  audioTracks: MediaStreamTrack[] = [],
  videoTracks: MediaStreamTrack[] = [],
): MediaStream {
  return {
    getAudioTracks: () => audioTracks,
    getVideoTracks: () => videoTracks,
  } as unknown as MediaStream;
}

describe("WebRTC media tracks", () => {
  it("routes microphone, camera, and shared screen to separate senders", async () => {
    const senders = Array.from({ length: 3 }, () => {
      const replaceTrack = vi.fn(async (): Promise<void> => undefined);
      return { replaceTrack };
    });
    const peer = {
      getTransceivers: () =>
        senders.map((sender, index) => ({
          receiver: {
            track: { kind: index === 0 ? "audio" : "video" },
          },
          sender,
        })),
    };
    const microphone = fakeTrack("audio");
    const camera = fakeTrack("video");
    const screen = fakeTrack("video");

    await syncPeerMediaTracks(
      peer,
      fakeStream([microphone], [camera]),
      fakeStream([], [screen]),
    );

    expect(senders[0].replaceTrack).toHaveBeenCalledWith(microphone);
    expect(senders[1].replaceTrack).toHaveBeenCalledWith(camera);
    expect(senders[2].replaceTrack).toHaveBeenCalledWith(screen);
  });

  it("detaches the presentation track when screen sharing stops", async () => {
    const sentTracks: Array<MediaStreamTrack | null> = [];
    const peer = {
      getTransceivers: () =>
        [0, 1, 2].map((index) => ({
          receiver: {
            track: { kind: index === 0 ? "audio" : "video" },
          },
          sender: {
            replaceTrack: async (track: MediaStreamTrack | null) => {
              sentTracks.push(track);
            },
          },
        })),
    };

    await syncPeerMediaTracks(peer, fakeStream(), null);

    expect(sentTracks).toEqual([null, null, null]);
  });

  it("reports an invalid peer connection instead of silently skipping tracks", async () => {
    await expect(
      syncPeerMediaTracks({ getTransceivers: () => [] }, null, null),
    ).rejects.toThrow("missing a reserved media transceiver");
  });
});
