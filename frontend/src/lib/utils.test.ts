import { describe, expect, it } from "vitest";

import { formatDuration, formatMeetingCode, parseMeetingInput } from "./utils";

describe("meeting utilities", () => {
  it("formats an 11-digit meeting code and rejects invalid input", () => {
    expect(formatMeetingCode("12345678901")).toBe("123 4567 8901");
    expect(formatMeetingCode("123-4567-8901")).toBe("123 4567 8901");
    expect(() => formatMeetingCode("1234")).toThrow("exactly 11 digits");
  });

  it("parses plain, spaced, and invite-link meeting input", () => {
    expect(parseMeetingInput("12345678901")).toBe("12345678901");
    expect(parseMeetingInput("123 4567 8901")).toBe("12345678901");
    expect(parseMeetingInput("https://zoom.example.test/j/12345678901?pwd=abc123")).toBe("12345678901");
    expect(parseMeetingInput("not a meeting link")).toBeNull();
  });

  it("formats minute durations", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(() => formatDuration(-1)).toThrow("non-negative");
  });
});
