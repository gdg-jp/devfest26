/**
 * The timetable, derived rather than written.
 *
 * The grid is two things laid over one another. The sessions come from the
 * `sessions` collection and place themselves by the times they already carry —
 * nobody types the programme twice, and a session moved in the Studio moves on
 * the timetable in the same edit. Everything that is not a session comes from
 * the city's `fixtures`: the doors opening, the breaks, the photo, the party.
 *
 * Rows are not minutes. The row boundaries are the sorted set of every time
 * anything starts or ends, so a column is only ever divided where something
 * actually changes and a 25-minute talk and a 50-minute one differ by a row
 * rather than by a height. That is what makes the uneven cases fall out for
 * free: a break that starts at 14:25 on two tracks and 14:45 on the others is
 * two fixtures, and the sessions above them span whichever rows they span.
 *
 * The one inference is a session's end. A session that does not state one runs
 * until the next thing on its track begins — which is what "until the next one"
 * already means to whoever wrote the schedule, and one fewer field to keep in
 * step with its neighbour. Fixtures are what guarantee there is always a next
 * thing: the day ends with one.
 */

import type { Fixture } from "../tenants/types";
import { getTracks, trackPastel, type Track } from "./tracks";
import { getProgram, type ProgramSession } from "./program";
import { reject } from "../preview/problems";

/** One block on the grid, already placed. */
export interface TimetableCell {
  key: string;
  kind: "session" | "fixture";
  label: string;
  note: string | undefined;
  href: string | undefined;
  start: string;
  end: string;
  /** CSS grid lines, 1-based. Row 1 is the track header. */
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
  /** The pale fill: this track's pastel. A fixture has none, and is grey. */
  fill: string | undefined;
}

export interface Timetable {
  /** The columns, left to right. A pending track has no column. */
  tracks: Track[];
  /** Every time anything starts or ends, sorted. `n` of these means `n - 1` rows. */
  boundaries: string[];
  cells: TimetableCell[];
  /** Announced, but not placed yet. Listed under the grid rather than dropped. */
  undated: ProgramSession[];
  /**
   * Each dated session's end, stated or inferred, by slug. Exposed so that a
   * session's own page prints the same span the grid drew, rather than going
   * quiet about an end it could have worked out.
   */
  ends: Map<string, string>;
}

/** What `getTimetable` needs from a city. */
interface Site {
  tenant: string;
  fixtures: readonly Fixture[];
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Times are compared as strings throughout, which is exact for a zero-padded
 * `HH:MM` and wrong for anything else — `"9:30"` would sort after `"13:00"` and
 * quietly place the block in the wrong half of the day. The schemas already
 * enforce the shape on both content sources; this covers the tenant configs in
 * `src/tenants/`, which are TypeScript and so are only checked for being
 * strings.
 */
function clock(value: string, where: string): boolean {
  if (CLOCK.test(value)) return true;
  reject("timetable", `${where} is "${value}", and a time reads "HH:MM".`);
  return false;
}

/**
 * The whole grid for one city, or `undefined` when there is nothing to draw —
 * no fixtures written and not one session with a time on it yet.
 */
export async function getTimetable(site: Site): Promise<Timetable | undefined> {
  const [allTracks, program] = await Promise.all([
    getTracks(site.tenant),
    getProgram(site.tenant),
  ]);

  // A pending track is a placeholder for a track that may yet exist. It has no
  // column: an empty stripe down the timetable says less than its absence does.
  const tracks = allTracks.filter((track) => !track.data.pending);
  const columnOf = new Map(tracks.map((track, index) => [track.id, index]));

  const sessions = program
    .filter((group) => columnOf.has(group.track.id))
    .flatMap((group) => group.sessions);

  const undated = sessions.filter((session) => !session.start);
  const fixtures = site.fixtures.filter(usableFixture);
  const dated = sessions.filter((session) => datedSession(session));

  if (dated.length === 0 && fixtures.length === 0) return undefined;

  const ends = resolveEnds(dated, fixtures, columnOf);

  const boundaries = [
    ...new Set([
      ...dated.flatMap((session) => [session.start, ends.get(session.slug)]),
      ...fixtures.flatMap((fixture) => [fixture.start, fixture.end]),
    ]),
  ]
    .filter((time): time is string => Boolean(time))
    .sort();

  const rowOf = new Map(boundaries.map((time, index) => [time, index + 2]));

  const cells: TimetableCell[] = [];

  for (const session of dated) {
    const start = session.start;
    const end = ends.get(session.slug);
    const column = columnOf.get(session.track.id);
    if (!start || !end || column === undefined) continue;

    const [rowStart, rowEnd] = [rowOf.get(start), rowOf.get(end)];
    if (rowStart === undefined || rowEnd === undefined) continue;

    cells.push({
      key: `session:${session.slug}`,
      kind: "session",
      label:
        session.entry.data.title ?? session.talks[0]?.title ?? session.label,
      note: speakerLine(session),
      href: session.href,
      start,
      end,
      rowStart,
      rowEnd,
      columnStart: column + 2,
      columnEnd: column + 3,
      fill: trackPastel(session.track),
    });
  }

  for (const [index, fixture] of fixtures.entries()) {
    const [rowStart, rowEnd] = [
      rowOf.get(fixture.start),
      rowOf.get(fixture.end),
    ];
    if (rowStart === undefined || rowEnd === undefined) continue;

    for (const [from, to] of columnRuns(fixture, tracks, columnOf)) {
      cells.push({
        key: `fixture:${index}:${from}`,
        kind: "fixture",
        label: fixture.label,
        note: fixture.note,
        href: undefined,
        start: fixture.start,
        end: fixture.end,
        rowStart,
        rowEnd,
        columnStart: from + 2,
        columnEnd: to + 3,
        fill: undefined,
      });
    }
  }

  /*
    A fixture lying over a session in the same column draws one on top of the
    other and says nothing about which was meant. It is always a mistake, and
    almost always the same one: a placeholder row standing in for a programme,
    left in after the programme arrived.
  */
  for (const fixture of cells) {
    if (fixture.kind !== "fixture") continue;
    const clash = cells.find(
      (cell) =>
        cell.kind === "session" &&
        cell.columnStart < fixture.columnEnd &&
        fixture.columnStart < cell.columnEnd &&
        cell.start < fixture.end &&
        fixture.start < cell.end,
    );
    if (clash) {
      reject(
        "timetable",
        `The fixture "${fixture.label}" (${fixture.start}–${fixture.end}) ` +
          `covers the session "${clash.label}" (${clash.start}–${clash.end}). ` +
          `One slot cannot hold both.`,
      );
    }
  }

  return { tracks, boundaries, cells, undated, ends };
}

/** A fixture whose times are readable and in the right order. */
function usableFixture(fixture: Fixture): boolean {
  const where = `The fixture "${fixture.label}"`;
  if (!clock(fixture.start, `${where} starts at a time that`)) return false;
  if (!clock(fixture.end, `${where} ends at a time that`)) return false;
  if (fixture.end <= fixture.start) {
    reject(
      "timetable",
      `${where} runs from ${fixture.start} to ${fixture.end}, which is backwards.`,
    );
    return false;
  }
  return true;
}

function datedSession(session: ProgramSession): boolean {
  const { start, end } = session;
  if (!start) return false;
  if (!clock(start, `Session "${session.entry.id}" starts at a time that`)) {
    return false;
  }
  if (end && !clock(end, `Session "${session.entry.id}" ends at a time that`)) {
    return false;
  }
  if (end && end <= start) {
    reject(
      "timetable",
      `Session "${session.entry.id}" runs from ${start} to ${end}, which is backwards.`,
    );
    return false;
  }
  return true;
}

/**
 * Every dated session's end, stated or inferred, keyed by slug.
 *
 * The inference is deliberately narrow: the next time *this track* is claimed,
 * by another session on it or by a fixture that covers it. A session left
 * hanging off the end of the day is a mistake worth stopping for rather than
 * guessing at, and the fixture that closes the day is what stops it happening.
 */
function resolveEnds(
  sessions: ProgramSession[],
  fixtures: readonly Fixture[],
  columnOf: Map<string, number>,
): Map<string, string> {
  const ends = new Map<string, string>();

  const boundariesFor = (trackId: string): string[] =>
    [
      ...sessions
        .filter((session) => session.track.id === trackId)
        .map((session) => session.start),
      ...fixtures
        .filter((fixture) => covers(fixture, trackId, columnOf))
        .map((fixture) => fixture.start),
    ].filter((time): time is string => Boolean(time));

  const byTrack = new Map<string, string[]>();

  for (const session of sessions) {
    const start = session.start;
    if (!start) continue;

    if (session.end) {
      ends.set(session.slug, session.end);
      continue;
    }

    let times = byTrack.get(session.track.id);
    if (!times) {
      times = boundariesFor(session.track.id).sort();
      byTrack.set(session.track.id, times);
    }

    const next = times.find((time) => time > start);
    if (!next) {
      reject(
        "timetable",
        `Session "${session.entry.id}" has no "end" and nothing follows it on ` +
          `the track "${session.track.id}", so there is no boundary to run to. ` +
          `Give it an "end", or add a fixture that closes the day.`,
      );
      continue;
    }
    ends.set(session.slug, next);
  }

  // Only reachable once every end is known: an overlap between two stated ends
  // is the one shape the sort above cannot show, and it draws two blocks on top
  // of each other rather than failing.
  for (const session of sessions) {
    const end = ends.get(session.slug);
    if (!end) continue;
    const clash = sessions.find(
      (other) =>
        other !== session &&
        other.track.id === session.track.id &&
        other.start !== undefined &&
        session.start !== undefined &&
        other.start > session.start &&
        other.start < end,
    );
    if (clash) {
      reject(
        "timetable",
        `Session "${session.entry.id}" runs to ${end}, but "${clash.entry.id}" ` +
          `starts at ${String(clash.start)} on the same track.`,
      );
    }
  }

  return ends;
}

function covers(
  fixture: Fixture,
  trackId: string,
  columnOf: Map<string, number>,
): boolean {
  if (!fixture.tracks) return true;
  if (!fixture.tracks.includes(trackId)) return false;
  return columnOf.has(trackId);
}

/**
 * The columns a fixture covers, as runs of adjacent ones.
 *
 * Usually one run across the whole width — a break is a break for everybody.
 * Naming a subset that happens not to be adjacent gives one block per run
 * rather than one block with a hole in it.
 */
function columnRuns(
  fixture: Fixture,
  tracks: Track[],
  columnOf: Map<string, number>,
): [number, number][] {
  if (!fixture.tracks) return tracks.length ? [[0, tracks.length - 1]] : [];

  const unknown = fixture.tracks.filter((id) => !columnOf.has(id));
  if (unknown.length) {
    reject(
      "timetable",
      `The fixture "${fixture.label}" names the track "${unknown[0]}", which ` +
        `is not one of this city's — or is a pending track, which has no column.`,
    );
  }

  const runs: [number, number][] = [];
  for (const [index, track] of tracks.entries()) {
    if (!fixture.tracks.includes(track.id)) continue;
    const last = runs.at(-1);
    if (last && last[1] === index - 1) last[1] = index;
    else runs.push([index, index]);
  }
  return runs;
}

/** Who is on, short enough to sit under a title in a grid cell. */
function speakerLine(session: ProgramSession): string | undefined {
  const names = [
    ...new Set(
      session.talks.flatMap((talk) =>
        talk.speakers.map((speaker) => speaker.data.name),
      ),
    ),
  ];
  if (names.length === 0) return undefined;
  return names.length > 2
    ? `${names.slice(0, 2).join("、")} 他`
    : names.join("、");
}
