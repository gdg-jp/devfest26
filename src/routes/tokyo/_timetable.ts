import { getProgram, type ProgramSession } from "../../data/program";
import type { Track } from "../../data/tracks";
import { reject } from "../../preview/problems";
import { DAY, SESSION_TAGS, TRACK_CODES, type DayItem } from "./_content";
import { minutes } from "./_components/track";

/**
 * Tokyo's day, laid out the way GDG Tokyo's own timetable on connpass is: the
 * four category tracks side by side, what everyone attends (the opening, the
 * keynotes, the closing) across all of them, and the demo floor in a strip
 * down the right-hand side.
 *
 * The shared `src/data/timetable.ts` gives every track — General Sessions
 * included — a column of its own. Tokyo's General Sessions are what the whole
 * venue attends, so here they run across the tracks instead; that is the one
 * reason this is not that.
 *
 * Rows are cut wherever anything starts or ends, as there: a 45-minute talk
 * and a 105-minute workshop differ by how many rows they span. The track
 * headings sit in a row of their own, just above the first track session.
 */

export interface TimetableSlot {
  key: string;
  start: string;
  end: string;
  /** `track` sits in one column, `all` across them, `side` in the strip. */
  span: "track" | "all" | "side";
  /** 0-based, for a `track` slot. */
  column?: number;
  /** A Studio session, or one of `DAY`'s rows. */
  session?: ProgramSession;
  day?: DayItem;
  /** `A-1`, for a session on a coded track. */
  code?: string;
  english: boolean;
  signUp: boolean;
  /** Grid lines, 1-based, header row included. */
  rowStart: number;
  rowEnd: number;
}

export interface TokyoTimetable {
  tracks: Track[];
  /** The row the track headings sit in. */
  headRow: number;
  /** Each row's start (and the last row's end), by grid line. */
  lines: { time: string; line: number }[];
  /** `grid-template-rows`. */
  rows: string[];
  slots: TimetableSlot[];
}

export async function tokyoTimetable(
  tenant: string,
): Promise<TokyoTimetable | undefined> {
  const program = await getProgram(tenant);

  const columns = program.filter(({ track }) => TRACK_CODES[track.id]);
  const columnOf = new Map(columns.map(({ track }, i) => [track.id, i]));

  type Draft = Omit<TimetableSlot, "rowStart" | "rowEnd">;
  const drafts: Draft[] = [];

  for (const { track, sessions } of program) {
    const column = columnOf.get(track.id);
    const code = TRACK_CODES[track.id]?.code;
    let n = 0;
    for (const session of sessions) {
      if (!session.start) continue;
      n += 1;
      const tags = SESSION_TAGS[session.slug] ?? {};
      drafts.push({
        key: `session:${session.slug}`,
        start: session.start,
        end: session.end ?? "",
        span: column === undefined ? "all" : "track",
        column,
        session,
        code: code && `${code}-${n}`,
        english: Boolean(tags.english),
        signUp: Boolean(tags.signUp),
      });
    }
  }

  for (const [i, day] of DAY.entries()) {
    drafts.push({
      key: `day:${i}`,
      start: day.start,
      end: day.end,
      span: day.span,
      day,
      english: false,
      signUp: false,
    });
  }

  if (!drafts.some((slot) => slot.span === "track")) return undefined;

  // A session that leaves its end out runs to the next thing in its column —
  // another session there, or something across every column.
  for (const slot of drafts) {
    if (slot.end) continue;
    const next = drafts
      .filter(
        (other) =>
          other.span === "all" ||
          (slot.span === "track" &&
            other.span === "track" &&
            other.column === slot.column),
      )
      .map((other) => other.start)
      .filter((time) => time > slot.start)
      .sort()[0];
    if (!next) {
      reject(
        "timetable",
        `Session "${slot.key}" has no "end" and nothing follows it.`,
      );
    }
    slot.end = next ?? slot.start;
  }

  const placed = drafts.filter((slot) => slot.end > slot.start);

  // Something across every column cannot share its minutes with anything else
  // in the columns — most often a keynote added to the Studio while its row
  // is still in `DAY`.
  for (const wide of placed.filter((slot) => slot.span === "all")) {
    const clash = placed.find(
      (other) =>
        other !== wide &&
        other.span !== "side" &&
        other.start < wide.end &&
        wide.start < other.end,
    );
    if (clash) {
      reject(
        "timetable",
        `"${wide.key}" (${wide.start}–${wide.end}) runs across every track, ` +
          `but "${clash.key}" (${clash.start}–${clash.end}) is on at the same time.`,
      );
    }
  }

  const times = [
    ...new Set(placed.flatMap((slot) => [slot.start, slot.end])),
  ].sort();

  // The headings go in just before the first track session.
  const firstTrack = placed
    .filter((slot) => slot.span === "track")
    .map((slot) => slot.start)
    .sort()[0];
  const headAt = times.indexOf(firstTrack);
  const lineOf = new Map(
    times.map((time, i) => [time, i + 1 + (i >= headAt ? 1 : 0)]),
  );
  const headRow = headAt + 1;

  const rows: string[] = [];
  for (let i = 0; i < times.length - 1; i += 1) {
    if (i === headAt) rows.push("auto");
    const span = minutes(times[i + 1]) - minutes(times[i]);
    // A floor, not a scale: the cards set the height. Capped so a long
    // evening (the after-party) does not open a gap under its one line.
    rows.push(
      `minmax(${Math.min(48, Math.max(8, Math.round(span * 1.2)))}px, auto)`,
    );
  }

  const slots = placed.map((slot) => {
    const rowStart = lineOf.get(slot.start) ?? 1;
    return { ...slot, rowStart, rowEnd: lineOf.get(slot.end) ?? rowStart + 1 };
  });

  return {
    tracks: columns.map(({ track }) => track),
    headRow,
    lines: times.map((time) => ({ time, line: lineOf.get(time) ?? 1 })),
    rows,
    slots,
  };
}
