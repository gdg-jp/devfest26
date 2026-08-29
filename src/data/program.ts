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
 */

import { getCollection, type CollectionEntry } from "astro:content";
import { getTracks, type Track } from "./tracks";
import { site } from "./site";

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
  data: { order: number };
}

interface Sluggable {
  id: string;
  data: { slug?: string | undefined };
}

const byOrder = (a: Ordered, b: Ordered) => a.data.order - b.data.order;

/**
 * From Markdown the entry id is the file name, which is already a good URL
 * segment; from Sanity it is an opaque uuid, so a Studio document says what it
 * wants to be called and this prefers that.
 */
export const slugOf = (entry: Sluggable) => entry.data.slug ?? entry.id;

export const speakerHref = (speaker: Speaker) => `/speakers/${slugOf(speaker)}`;

/**
 * A "13:00" written on a session or talk, as a schema.org timestamp.
 *
 * Entries carry a wall-clock time because that is what an organiser writes on
 * a running order; the date belongs to the event and is never repeated on each
 * one.
 */
export const jstTimestamp = (hhmm: string) =>
  `${site.event.isoDate}T${hhmm}:00+09:00`;

/**
 * The whole programme, grouped the way the page prints it: tracks in their own
 * order, sessions in theirs, and a track with nothing in it left out.
 */
export async function getProgram(): Promise<ProgramTrack[]> {
  const [tracks, sessions, unordered, speakers] = await Promise.all([
    getTracks(),
    getCollection("sessions"),
    getCollection("talks"),
    getCollection("speakers"),
  ]);

  const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const sessionIds = new Set(sessions.map((session) => session.id));

  // Sorted before grouping, so every group comes out in running order.
  const ordered = [...unordered].sort(byOrder);
  for (const talk of ordered) {
    if (!sessionIds.has(talk.data.session.id))
      throw new Error(
        `Talk "${talk.id}" references unknown session "${talk.data.session.id}"`,
      );
  }
  const talksBySession = Map.groupBy(ordered, (talk) => talk.data.session.id);

  const resolveSpeakers = (refs: { id: string }[], where: string): Speaker[] =>
    refs.map((ref) => {
      const speaker = speakerById.get(ref.id);
      if (!speaker)
        throw new Error(`${where} references unknown speaker "${ref.id}"`);
      return speaker;
    });

  const toProgramSession = (session: Session, track: Track): ProgramSession => {
    const slug = slugOf(session);
    const href = `/sessions/${slug}`;
    const own = talksBySession.get(session.id) ?? [];

    // Speakers on the session are what a one-talk-per-slot city writes; talks
    // are what a many-talk city writes. Neither means nobody is on stage,
    // which is worth failing the build over rather than publishing a card with
    // an empty speaker block.
    if (own.length === 0 && !session.data.speakers?.length)
      throw new Error(
        `Session "${session.id}" names no speakers and has no talks. ` +
          `Give it "speakers", or add a talk pointing at it.`,
      );

    const talks: ProgramTalk[] = own.length
      ? own.map((talk) => ({
          slug: slugOf(talk),
          href: `/talks/${slugOf(talk)}`,
          standalone: true,
          title: talk.data.title ?? session.data.title,
          start: talk.data.start,
          speakers: resolveSpeakers(talk.data.speakers, `Talk "${talk.id}"`),
          entry: talk,
        }))
      : [
          {
            slug,
            href,
            standalone: false,
            title: session.data.title,
            start: session.data.start,
            speakers: resolveSpeakers(
              session.data.speakers ?? [],
              `Session "${session.id}"`,
            ),
            entry: session,
          },
        ];

    return {
      entry: session,
      track,
      slug,
      href,
      label:
        track.data.cardLabel ??
        `Session ${String(session.data.order).padStart(2, "0")}`,
      talks,
    };
  };

  const program = tracks
    .map((track) => ({
      track,
      sessions: sessions
        .filter((session) => session.data.track.id === track.id)
        .sort(byOrder)
        .map((session) => toProgramSession(session, track)),
    }))
    .filter((group) => group.sessions.length > 0);

  const all = program.flatMap((group) => group.sessions);
  assertUniqueSlugs("sessions", all);
  assertUniqueSlugs(
    "talks",
    all.flatMap((session) => session.talks.filter((talk) => talk.standalone)),
  );

  return program;
}

/** Every session, flattened, in the order the page prints them. */
export async function getProgramSessions(): Promise<ProgramSession[]> {
  return (await getProgram()).flatMap((group) => group.sessions);
}

/**
 * The talks that are entries of their own — the ones with a page. A city that
 * does not use talks returns nothing here, and so publishes no `/talks/` route.
 */
export async function getStandaloneTalks(): Promise<Appearance[]> {
  const sessions = await getProgramSessions();
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
export async function getAppearances(): Promise<Map<string, Appearance[]>> {
  const sessions = await getProgramSessions();
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
export async function getProgramSpeakers(): Promise<SpeakerProgram[]> {
  const [speakers, appearances] = await Promise.all([
    getCollection("speakers"),
    getAppearances(),
  ]);

  const listed = speakers.flatMap((speaker) => {
    const found = appearances.get(speaker.id);
    return found
      ? [{ speaker, slug: slugOf(speaker), appearances: found }]
      : [];
  });

  assertUniqueSlugs("speakers", listed);
  return listed;
}

/**
 * Two entries claiming one URL would publish whichever the build wrote last
 * and say nothing about it. Slugs are hand-written on the Sanity path, so this
 * is a real mistake rather than a theoretical one.
 */
function assertUniqueSlugs(kind: string, items: { slug: string }[]) {
  const seen = new Set<string>();
  for (const { slug } of items) {
    if (seen.has(slug))
      throw new Error(
        `Two ${kind} resolve to the same slug "${slug}". Give one of them its own "slug".`,
      );
    seen.add(slug);
  }
}
