/**
 * Sessions and the talks inside them, as a single shape.
 *
 * A session is a slot in a track; a talk is one presentation in that slot.
 * Whether the two levels are distinct is a local decision. Kansai runs one
 * presentation per slot and writes no talks at all; Tokyo puts several in one
 * slot, the way I/O Extended does, and writes both levels.
 *
 * Rather than let every component work out which of the two it is looking at,
 * a session with no talks of its own is normalised here into a session holding
 * exactly one talk — itself. Nothing downstream branches on the city, and
 * nothing has to be configured: the difference is only whether the talk files
 * exist, the same way an empty `partners/` directory removes that section.
 *
 * URLs follow from the same rule. A session always has a page; a talk has one
 * only when it is an entry in its own right, so a city that writes no talks
 * publishes no `/talks/` at all. `ProgramTalk.href` hides which of the two a
 * link lands on.
 *
 * Every rule this file states is a rule a published build dies on: a reference
 * that crosses cities, a slot with nobody on it, two entries claiming one URL.
 * That is deliberate and unchanged. The draft preview is the one caller that
 * cannot afford it — half-written content is what it exists to show — so there
 * the same checks drop the entry and say so instead. See `reject` in
 * `src/preview/problems.ts`.
 */

import type { CollectionEntry } from "astro:content";
import { getTracks, type Track } from "./tracks";
import { byTenant, partitionByTenant } from "./collections";
import { previewMode } from "../preview/mode";
import { reject, report } from "../preview/problems";
import { tenantPath } from "../lib/url";

export type Session = CollectionEntry<"sessions">;
export type Talk = CollectionEntry<"talks">;
export type Speaker = CollectionEntry<"speakers">;

export interface ProgramTalk {
  slug: string;
  href: string;
  /**
   * False when this talk was synthesised from a session that has none of its
   * own. Such a talk *is* its session — same title, same prose, same page — so
   * anything that would otherwise print both checks this first.
   */
  standalone: boolean;
  title: string | undefined;
  start: string | undefined;
  speakers: Speaker[];
  /** Carries the abstract: whose body this is, and what `render()` runs on. */
  entry: Talk | Session;
}

export interface ProgramSession {
  entry: Session;
  track: Track;
  slug: string;
  href: string;
  /** Printed above the card: "Session 03", or what the track calls its cards. */
  label: string;
  /** As written. The end a session leaves out is filled in from what starts
      next on its track — that needs the city's fixtures, so it happens in
      `src/data/timetable.ts` rather than here. */
  start: string | undefined;
  end: string | undefined;
  /** Never empty. Exactly one entry for a city that does not use talks. */
  talks: ProgramTalk[];
}

export interface ProgramTrack {
  track: Track;
  sessions: ProgramSession[];
}

/** One place a speaker appears: which talk, and the session holding it. */
export interface Appearance {
  session: ProgramSession;
  talk: ProgramTalk;
}

export interface SpeakerProgram {
  speaker: Speaker;
  slug: string;
  appearances: Appearance[];
}

interface Ordered {
  data: { order?: number | undefined };
}

interface Sluggable {
  id: string;
  data: { slug?: string | undefined };
}

const byOrder = (a: Ordered, b: Ordered) =>
  (a.data.order ?? 0) - (b.data.order ?? 0);

/**
 * A track's running order, which is just its sessions by the clock.
 *
 * Sessions used to carry an `order` alongside a `start`, which is two
 * statements of one fact and no way to tell which of them is wrong when they
 * disagree. A track is serial, so the start time already *is* the position —
 * and unlike a hand-kept number it does not need every later session renumbered
 * to insert one in the middle.
 *
 * A session with no time yet sorts after everything that has one, by id so that
 * the page does not reshuffle between builds. It keeps its card and its page;
 * it is only absent from the timetable, which is exactly what "時間調整中"
 * means.
 */
const byStart = (a: Session, b: Session) => {
  const [x, y] = [a.data.start, b.data.start];
  if (x && y) return x < y ? -1 : x > y ? 1 : 0;
  if (x) return -1;
  if (y) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * One track's sessions, sorted, having said so if two of them collide.
 *
 * A track is one room running one thing at a time, so two sessions on it
 * claiming the same minute is a real mistake — and it is the mistake a
 * hand-written `order` could not catch, because it would happily sort them and
 * put the clash on the page as two consecutive cards.
 */
function runningOrder(track: Track, sessions: Session[]): Session[] {
  const mine = sessions
    .filter((session) => session.data.track.id === track.id)
    .sort(byStart);

  let previous: Session | undefined;
  for (const session of mine) {
    if (session.data.start && previous?.data.start === session.data.start) {
      reject(
        "programme",
        `Sessions "${previous.id}" and "${session.id}" are both on the track ` +
          `"${track.id}" and both start at ${session.data.start}. A track ` +
          `runs one session at a time.`,
      );
    }
    previous = session;
  }

  return mine;
}

/**
 * From Markdown the entry id is the file name, which is already a good URL
 * segment; from Sanity it is an opaque uuid, so a Studio document says what it
 * wants to be called and this prefers that.
 */
export const slugOf = (entry: Sluggable) => entry.data.slug ?? entry.id;

/**
 * A speaker's page.
 *
 * The city comes off the entry rather than from an argument, so the components
 * that print a speaker — down to the row inside a session card — need to know
 * nothing about which city they are rendering.
 */
export const speakerHref = (speaker: Speaker) =>
  tenantPath(speaker.data.tenant, `/speakers/${slugOf(speaker)}`);

/**
 * A "13:00" written on a session or talk, as a schema.org timestamp.
 *
 * Entries carry a wall-clock time because that is what an organiser writes on
 * a running order; the date belongs to the event and is never repeated on each
 * one, so the event's own `isoDate` supplies it.
 */
export const jstTimestamp = (isoDate: string, hhmm: string) =>
  `${isoDate}T${hhmm}:00+09:00`;

/**
 * The whole programme, grouped the way the page prints it: tracks in their own
 * order, sessions in theirs, and a track with nothing in it left out.
 */
export async function getProgram(tenant: string): Promise<ProgramTrack[]> {
  const [tracks, sessionSplit, talkSplit, speakerSplit] = await Promise.all([
    getTracks(tenant),
    partitionByTenant("sessions", tenant),
    partitionByTenant("talks", tenant),
    partitionByTenant("speakers", tenant),
  ]);

  const sessions = sessionSplit.mine;
  const speakers = speakerSplit.mine;

  const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const talkById = new Map(talkSplit.mine.map((talk) => [talk.id, talk]));
  const sessionIds = new Set(sessions.map((session) => session.id));

  /*
    `reference()` resolves by entry id and knows nothing about cities, so a
    session in one city naming a speaker in another is a reference that
    resolves — to the wrong person's page, in the wrong city's build. The
    Markdown directories used to make that impossible by construction; now the
    invariant is stated instead, and violating it stops the build.
  */
  const crossCity = (
    ref: string,
    kind: string,
    foreign: { id: string; data: { tenant: string } }[],
  ) => {
    const elsewhere = foreign.find((entry) => entry.id === ref);
    return elsewhere
      ? `${kind} "${ref}", which belongs to "${elsewhere.data.tenant}" and not ` +
          `to "${tenant}". A reference may not cross cities.`
      : `unknown ${kind} "${ref}"`;
  };

  // Track which session claimed each talk, to enforce exactly-one-session semantics.
  const claimedBy = new Map<string, Session>();

  // 1. Resolve talks from sessions that define their own `talks` array.
  const talksBySession = new Map<string, Talk[]>();
  for (const session of sessions) {
    if (!session.data.talks?.length) continue;

    const seenInSession = new Set<string>();
    const resolved: Talk[] = [];

    for (const ref of session.data.talks) {
      if (seenInSession.has(ref.id)) {
        reject(
          "programme",
          `Session "${session.id}" references talk "${ref.id}" multiple times.`,
        );
        continue;
      }
      seenInSession.add(ref.id);

      const talk = talkById.get(ref.id);
      if (!talk) {
        reject(
          "programme",
          `Session "${session.id}" references ` +
            crossCity(ref.id, "talk", talkSplit.foreign),
        );
        continue;
      }

      const previous = claimedBy.get(talk.id);
      if (previous) {
        reject(
          "programme",
          `Talk "${talk.id}" is referenced by both Session "${previous.id}" and Session "${session.id}". A talk belongs to exactly one session.`,
        );
        continue;
      }

      claimedBy.set(talk.id, session);
      resolved.push(talk);
    }

    talksBySession.set(session.id, resolved);
  }

  // 2. Legacy fallback: talks pointing at sessions via talk.data.session.
  const legacyTalks: Talk[] = [];
  for (const talk of [...talkSplit.mine].sort(byOrder)) {
    if (!talk.data.session) continue;

    // If talk was already claimed by a session via session.talks:
    const claimedSession = claimedBy.get(talk.id);
    if (claimedSession) {
      if (talk.data.session.id !== claimedSession.id) {
        reject(
          "programme",
          `Talk "${talk.id}" is listed in Session "${claimedSession.id}"'s "talks", but its legacy "session" field points to Session "${talk.data.session.id}". Remove the legacy "session" field or resolve the conflict.`,
        );
      }
      // Already claimed; do not process in legacy loop to prevent duplicate rendering.
      continue;
    }

    if (!sessionIds.has(talk.data.session.id)) {
      reject(
        "programme",
        `Talk "${talk.id}" references ` +
          crossCity(talk.data.session.id, "session", sessionSplit.foreign),
      );
      continue;
    }

    // Target session already defined its own `talks` array, but did not include this talk.
    if (talksBySession.has(talk.data.session.id)) {
      reject(
        "programme",
        `Talk "${talk.id}" references Session "${talk.data.session.id}" via legacy "session" field, but Session "${talk.data.session.id}" already defines its own "talks" list. Add "${talk.id}" to the session's "talks" array instead.`,
      );
      continue;
    }

    claimedBy.set(
      talk.id,
      sessions.find((s) => s.id === talk.data.session!.id)!,
    );
    legacyTalks.push(talk);
  }

  const legacyTalksBySession = Map.groupBy(
    legacyTalks,
    (talk) => talk.data.session!.id,
  );

  // 3. Ensure no orphaned talks exist (every talk must belong to exactly one session).
  for (const talk of talkSplit.mine) {
    if (!claimedBy.has(talk.id)) {
      reject(
        "programme",
        `Talk "${talk.id}" belongs to no session. Add it to a session's "talks" list.`,
      );
    }
  }

  const resolveSpeakers = (
    refs: { id: string }[],
    where: string,
  ): Speaker[] => {
    const found: Speaker[] = [];
    for (const ref of refs) {
      const speaker = speakerById.get(ref.id);
      if (speaker) {
        found.push(speaker);
        continue;
      }
      reject(
        "programme",
        `${where} references ` +
          crossCity(ref.id, "speaker", speakerSplit.foreign),
      );
    }
    return found;
  };

  const toProgramSession = (
    session: Session,
    track: Track,
    position: number,
  ): ProgramSession | undefined => {
    const slug = slugOf(session);
    const href = tenantPath(tenant, `/sessions/${slug}`);
    const own =
      talksBySession.get(session.id) ??
      legacyTalksBySession.get(session.id) ??
      [];

    // Speakers on the session are what a one-talk-per-slot city writes; talks
    // are what a many-talk city writes. Neither means nobody is on stage,
    // which is worth failing the build over rather than publishing a card with
    // an empty speaker block.
    if (own.length === 0 && !session.data.speakers?.length) {
      reject(
        "programme",
        `Session "${session.id}" names no speakers and has no talks. ` +
          `Give it "speakers", or add talks to it.`,
      );
      return undefined;
    }

    const talks: ProgramTalk[] = [];

    if (own.length) {
      for (const talk of own) {
        const talkSpeakers = resolveSpeakers(
          talk.data.speakers,
          `Talk "${talk.id}"`,
        );
        // Only reachable in the preview: a build threw on the first bad
        // reference. A talk whose whole cast went missing has nothing to show.
        if (talkSpeakers.length === 0) continue;

        talks.push({
          slug: slugOf(talk),
          href: tenantPath(tenant, `/talks/${slugOf(talk)}`),
          standalone: true,
          title: talk.data.title ?? session.data.title,
          start: talk.data.start,
          speakers: talkSpeakers,
          entry: talk,
        });
      }
    } else {
      const sessionSpeakers = resolveSpeakers(
        session.data.speakers ?? [],
        `Session "${session.id}"`,
      );
      if (sessionSpeakers.length > 0) {
        talks.push({
          slug,
          href,
          standalone: false,
          title: session.data.title,
          start: session.data.start,
          speakers: sessionSpeakers,
          entry: session,
        });
      }
    }

    if (talks.length === 0) return undefined;

    return {
      entry: session,
      track,
      slug,
      href,
      label:
        track.data.cardLabel ?? `Session ${String(position).padStart(2, "0")}`,
      start: session.data.start,
      end: session.data.end,
      talks,
    };
  };

  const program = tracks
    .map((track) => ({
      track,
      sessions: runningOrder(track, sessions).flatMap(
        // Numbered over the sorted track rather than over what survives it, so
        // the preview dropping a broken entry does not renumber the ones after
        // it and make the page disagree with the published build.
        (session, index) => toProgramSession(session, track, index + 1) ?? [],
      ),
    }))
    .filter((group) => group.sessions.length > 0);

  /*
    A session pointing at a track this city does not have has always been left
    off the page in silence — there is no group to put it in. That is fine for
    a build, where the tracks were written first and the omission would be
    noticed; it is not fine for someone watching their own draft fail to
    appear. Preview only: `previewMode` is substituted at build time, so a
    published build does not carry this loop.
  */
  if (previewMode) {
    const trackIds = new Set(tracks.map((track) => track.id));
    for (const session of sessions) {
      if (!trackIds.has(session.data.track.id)) {
        report(
          "programme",
          `Session "${session.id}" is on the track "${session.data.track.id}", ` +
            `which is not one of ${tenant}'s. It is not on the page.`,
        );
      }
    }
  }

  const all = program.flatMap((group) => group.sessions);
  const standalone = all.flatMap((session) =>
    session.talks.filter((talk) => talk.standalone),
  );

  const keptSessions = keepUniqueSlugs("sessions", all);
  const keptTalks = keepUniqueSlugs("talks", standalone);

  // A build reaches this having thrown on any duplicate, so nothing was ever
  // dropped and the programme is already the answer.
  if (
    keptSessions.length === all.length &&
    keptTalks.length === standalone.length
  ) {
    return program;
  }

  return withoutDuplicates(program, new Set(keptSessions), new Set(keptTalks));
}

/**
 * The programme with the entries that lost a slug collision taken out.
 *
 * Rebuilt rather than mutated, and only when something was actually dropped:
 * losing every talk empties the session, and losing every session empties the
 * track, so the two `filter`s above the surface have to run afterwards.
 */
function withoutDuplicates(
  program: ProgramTrack[],
  sessions: Set<ProgramSession>,
  talks: Set<ProgramTalk>,
): ProgramTrack[] {
  return program
    .map((group) => ({
      track: group.track,
      sessions: group.sessions
        .filter((session) => sessions.has(session))
        .map((session) => ({
          ...session,
          talks: session.talks.filter(
            (talk) => !talk.standalone || talks.has(talk),
          ),
        }))
        .filter((session) => session.talks.length > 0),
    }))
    .filter((group) => group.sessions.length > 0);
}

/** Every session, flattened, in the order the page prints them. */
export async function getProgramSessions(
  tenant: string,
): Promise<ProgramSession[]> {
  return (await getProgram(tenant)).flatMap((group) => group.sessions);
}

/**
 * The talks that are entries of their own — the ones with a page. A city that
 * does not use talks returns nothing here, and so publishes no `/talks/` route.
 */
export async function getStandaloneTalks(
  tenant: string,
): Promise<Appearance[]> {
  const sessions = await getProgramSessions(tenant);
  return sessions.flatMap((session) =>
    session.talks
      .filter((talk) => talk.standalone)
      .map((talk) => ({ session, talk })),
  );
}

/**
 * Where each speaker appears, keyed by speaker entry id.
 *
 * A speaker nobody has been scheduled against is simply absent, which keeps
 * `/speakers/` in step with what the programme actually announces.
 */
export async function getAppearances(
  tenant: string,
): Promise<Map<string, Appearance[]>> {
  const sessions = await getProgramSessions(tenant);
  const byId = new Map<string, Appearance[]>();

  for (const session of sessions)
    for (const talk of session.talks)
      for (const speaker of talk.speakers) {
        const found = byId.get(speaker.id);
        if (found) found.push({ session, talk });
        else byId.set(speaker.id, [{ session, talk }]);
      }

  return byId;
}

/**
 * Every speaker who is actually on the programme, with where they appear.
 *
 * Someone with an entry but no session yet has nothing to put on a page, so
 * they do not get one — the same way they do not appear on the home page.
 */
export async function getProgramSpeakers(
  tenant: string,
): Promise<SpeakerProgram[]> {
  const [speakers, appearances] = await Promise.all([
    byTenant("speakers", tenant),
    getAppearances(tenant),
  ]);

  const listed = speakers.flatMap((speaker) => {
    const found = appearances.get(speaker.id);
    return found
      ? [{ speaker, slug: slugOf(speaker), appearances: found }]
      : [];
  });

  return keepUniqueSlugs("speakers", listed);
}

/**
 * Two entries claiming one URL would publish whichever the build wrote last
 * and say nothing about it. Slugs are hand-written on the Sanity path, so this
 * is a real mistake rather than a theoretical one.
 *
 * A build throws on the second one; the preview keeps the first, drops the
 * rest, and says which URL they were fighting over.
 */
function keepUniqueSlugs<T extends { slug: string }>(
  kind: string,
  items: T[],
): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];

  for (const item of items) {
    if (seen.has(item.slug)) {
      reject(
        "programme",
        `Two ${kind} resolve to the same slug "${item.slug}". Give one of them its own "slug".`,
      );
      continue;
    }
    seen.add(item.slug);
    kept.push(item);
  }

  return kept;
}
