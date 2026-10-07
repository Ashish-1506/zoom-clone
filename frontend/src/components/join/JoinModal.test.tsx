import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JoinModal } from "./JoinModal";
import { validateMeeting } from "@/lib/api";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({
  validateMeeting: vi.fn(),
}));

describe("JoinModal", () => {
  beforeEach(() => {
    vi.mocked(validateMeeting).mockReset();
    push.mockReset();
  });

  it("requires both an ID and a display name", () => {
    render(<JoinModal open defaultName="" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Meeting ID or personal link name"), {
      target: { value: "12345678901" },
    });
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  it("shows an error for an unknown meeting ID", async () => {
    vi.mocked(validateMeeting).mockResolvedValue({ exists: false } as Awaited<ReturnType<typeof validateMeeting>>);
    render(<JoinModal open defaultName="Casey" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Meeting ID or personal link name"), {
      target: { value: "12345678901" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This meeting ID is not valid");
  });

  it("navigates to the validated pre-join route", async () => {
    const onClose = vi.fn();
    vi.mocked(validateMeeting).mockResolvedValue({
      exists: true,
      status: "scheduled",
    } as Awaited<ReturnType<typeof validateMeeting>>);
    render(<JoinModal open defaultName="Casey Guest" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Meeting ID or personal link name"), {
      target: { value: "123 4567 8901" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/j/12345678901?name=Casey%20Guest"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
