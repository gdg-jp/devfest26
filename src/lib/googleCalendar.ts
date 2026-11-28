/**
 * A link that opens Google Calendar's "new event" form already filled in.
 *
 * Times are the wall-clock "HH:MM" the programme is written in, on the
 * event's own `isoDate`; `ctz` tells Calendar they are Tokyo time, so a
 * visitor in another zone still gets the slot at the right moment.
 */
export interface CalendarEvent {
  title: string;
  /** "YYYY-MM-DD" */
  isoDate: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM"; an event without one ends when it starts. */
  end?: string;
  details?: string;
  location?: string;
}

const stamp = (isoDate: string, hhmm: string) =>
  `${isoDate.replaceAll("-", "")}T${hhmm.replace(":", "")}00`;

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.isoDate, event.start)}/${stamp(
      event.isoDate,
      event.end ?? event.start,
    )}`,
    ctz: "Asia/Tokyo",
  });
  if (event.details) params.set("details", event.details);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
