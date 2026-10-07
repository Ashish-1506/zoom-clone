import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Participant } from "@/lib/types";
import { VideoGrid } from "./VideoGrid";

function participant(id: number, displayName: string): Participant {
  return {
    id,
    meeting_id: 1,
    user_id: null,
    display_name: displayName,
    role: id === 1 ? "host" : "participant",
    is_muted: false,
    is_video_on: false,
    is_removed: false,
    hand_raised: false,
    hand_raised_at: null,
    last_reaction: null,
    last_reaction_at: null,
    joined_at: "2026-10-07T00:00:00Z",
    left_at: null,
  };
}

describe("VideoGrid screen sharing", () => {
  it("shows a remote presentation as the main view and keeps participant videos in a strip", () => {
    const host = participant(1, "Morgan Host");
    const presenter = participant(2, "Riley Presenter");
    const remoteScreen = {} as MediaStream;

    const { container } = render(
      <VideoGrid
        participants={[host, presenter]}
        localParticipantId={host.id}
        localStream={null}
        remoteStreams={new Map()}
        remoteScreenStreams={new Map([[presenter.id, remoteScreen]])}
        activeScreenSharerId={presenter.id}
        screenStream={null}
        view="gallery"
      />,
    );

    expect(screen.getByLabelText("Riley Presenter shared screen")).toBeVisible();
    expect(screen.getByText("Riley Presenter is sharing")).toBeVisible();
    expect(screen.getByLabelText("Morgan Host")).toBeVisible();
    expect(screen.getByLabelText("Riley Presenter")).toBeVisible();
    expect(container.querySelector("section")).toHaveClass("md:flex-row");
  });

  it("keeps a local stop-share control while displaying the local presentation", () => {
    const host = participant(1, "Morgan Host");
    const screenStream = {} as MediaStream;

    render(
      <VideoGrid
        participants={[host]}
        localParticipantId={host.id}
        localStream={null}
        remoteStreams={new Map()}
        screenStream={screenStream}
        onStopScreenShare={() => undefined}
        view="gallery"
      />,
    );

    expect(screen.getByLabelText("Morgan Host shared screen")).toBeVisible();
    expect(screen.getByRole("button", { name: "Stop share" })).toBeVisible();
  });

  it("does not mistake a reserved but idle screen track for an active presentation", () => {
    const host = participant(1, "Morgan Host");
    const idleRemoteScreen = {} as MediaStream;
    const { container } = render(
      <VideoGrid
        participants={[host]}
        localParticipantId={host.id}
        localStream={null}
        remoteStreams={new Map()}
        remoteScreenStreams={new Map([[2, idleRemoteScreen]])}
        activeScreenSharerId={null}
        view="gallery"
      />,
    );

    expect(container.querySelector("section")).not.toBeInTheDocument();
    expect(screen.queryByText("A participant is sharing")).not.toBeInTheDocument();
  });
});
