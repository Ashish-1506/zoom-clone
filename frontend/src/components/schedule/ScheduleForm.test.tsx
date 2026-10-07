import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduleForm } from "./ScheduleForm";
import { scheduleMeeting } from "@/lib/api";

const { push, success, showError } = vi.hoisted(() => ({
  push: vi.fn(),
  success: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({
  scheduleMeeting: vi.fn(),
  updateMeeting: vi.fn(),
}));
vi.mock("@/components/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui")>();
  return {
    ...actual,
    useToast: () => ({ success, error: showError }),
  };
});

describe("ScheduleForm validation", () => {
  beforeEach(() => {
    push.mockReset();
    success.mockReset();
    showError.mockReset();
    vi.mocked(scheduleMeeting).mockReset();
  });

  it("rejects dates in the past before submitting", () => {
    render(<ScheduleForm userName="Casey" />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "10:00" } });
    const form = screen.getByRole("button", { name: "Save" }).closest("form");
    if (!form) throw new Error("Schedule form was not rendered.");
    fireEvent.submit(form);

    expect(screen.getByText("Choose a future date and time.")).toBeInTheDocument();
    expect(scheduleMeeting).not.toHaveBeenCalled();
  });

  it("enforces the five-minute minimum duration", () => {
    render(<ScheduleForm userName="Casey" />);
    fireEvent.change(screen.getByLabelText("Duration hours"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Duration minutes"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Duration must be at least 5 minutes.")).toBeInTheDocument();
    expect(scheduleMeeting).not.toHaveBeenCalled();
  });
});
