// Check-in reminders as a calendar file: works on every phone and calendar
// app, needs no account, server or notification permission.

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

export function reminderCalendar({
  everyDays,
  count,
  hour,
  url,
}: {
  everyDays: number;
  count: number;
  hour: number;
  url: string;
}): string {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 10 * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Between Cycles//Check-in reminders//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:checkin-${start.getTime()}@between-cycles`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `RRULE:FREQ=DAILY;INTERVAL=${everyDays};COUNT=${count}`,
    "SUMMARY:Skin check-in (Between Cycles)",
    `DESCRIPTION:Same spot, same light. Two minutes. ${url}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Skin check-in",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadReminders(everyDays: number, hour: number) {
  const ics = reminderCalendar({ everyDays, count: 30, hour, url: `${location.origin}/scan?kind=checkin` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "between-cycles-checkins.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}
