import type { SanityEntry } from "../../loaders/sanity";
import type { CollectionName } from "../../data/schemas";
import * as Q from "./queries";
import {
  aboutEntry,
  externalEventEntry,
  meetupEntry,
  partnerEntry,
  photoSetEntry,
  sessionEntry,
  speakerEntry,
  talkEntry,
  trackEntry,
} from "./entries";

/**
 * Where each collection's documents come from, in one table.
 *
 * The query and the mapper used to be paired at the call site in
 * `src/content.config.ts`, which was fine while that was the only caller. It is
 * not any more: the draft preview runs the same pairs at request time
 * (`src/preview/drafts.ts`), and a second hand-written list of them is a list
 * that will one day disagree with the first — a preview quietly fetching last
 * month's projection is exactly the bug this deployment exists to rule out.
 *
 * `name` is both the Sanity label and the Markdown directory, which is what
 * keeps those two from drifting apart in turn.
 */
export interface Source {
  /** Appears in build logs, and is the directory under `src/content/<city>/`. */
  name: string;
  query: string;
  toEntry: (doc: never) => SanityEntry;
  /**
   * Whether the query carries the `$tenants` filter. False for the one
   * collection that belongs to the front page rather than to a city — see
   * `everyCity` in `./queries.ts`, which the preview uses on the rest.
   */
  scoped: boolean;
}

export const sources: Record<CollectionName, Source> = {
  speakers: {
    name: "speakers",
    query: Q.SPEAKERS,
    toEntry: speakerEntry,
    scoped: true,
  },
  tracks: {
    name: "tracks",
    query: Q.TRACKS,
    toEntry: trackEntry,
    scoped: true,
  },
  sessions: {
    name: "sessions",
    query: Q.SESSIONS,
    toEntry: sessionEntry,
    scoped: true,
  },
  talks: { name: "talks", query: Q.TALKS, toEntry: talkEntry, scoped: true },
  meetups: {
    name: "meetups",
    query: Q.MEETUPS,
    toEntry: meetupEntry,
    scoped: true,
  },
  partners: {
    name: "partners",
    query: Q.PARTNERS,
    toEntry: partnerEntry,
    scoped: true,
  },
  about: { name: "about", query: Q.ABOUT, toEntry: aboutEntry, scoped: true },
  photos: {
    name: "photos",
    query: Q.PHOTOS,
    toEntry: photoSetEntry,
    scoped: true,
  },
  externalEvents: {
    name: "external-events",
    query: Q.EXTERNAL_EVENTS,
    toEntry: externalEventEntry,
    scoped: false,
  },
};
