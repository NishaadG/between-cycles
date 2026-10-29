import { describe, expect, it } from "vitest";
import { reminderCalendar } from "./reminders";

describe("reminderCalendar", () => {
  const ics = reminderCalendar({ everyDays: 3, count: 30, hour: 9, url: "https://example.org/scan" });
  it("is a single recurring event", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("RRULE:FREQ=DAILY;INTERVAL=3;COUNT=30");
  });
  it("uses CRLF line endings", () => {
    expect(ics.split("\r\n").length).toBeGreaterThan(10);
  });
  it("links back to the check-in", () => expect(ics).toContain("URL:https://example.org/scan"));
});
