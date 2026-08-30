import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import {
  LOCAL_TENANT,
  noCities,
  portalSelected,
  selectedCities,
} from "./tenants/selection";
import { sanityEnabled } from "./lib/sanity/env";
import { previewMode } from "./preview/mode";
import { sanityLoader } from "./loaders/sanity";
import * as schema from "./data/schemas";
import type { CollectionName } from "./data/schemas";
import { sources } from "./lib/sanity/sources";

/**
 * Content has two possible sources and one set of schemas.
 *
 * By default everything an organiser edits lives in `src/content/<tenant>/`:
 * structured fields in frontmatter, prose in the Markdown body. Set
 * `SANITY_PROJECT_ID` and the same collections are filled from Sanity instead —
 * only the loader changes. The schemas in `src/data/schemas.ts`, and every
 * component reading them, are identical either way.
 *
 * One build now holds several cities at once, so every city-scoped entry
 * carries a `tenant` field and nothing reads a collection without filtering on
 * it — `byTenant` in `src/data/collections.ts` is the only way in. From Sanity
 * that field comes off the `event` reference; from Markdown it falls back to
 * the one city a Markdown build produces, which is why none of the forty-odd
 * content files had to be touched.
 *
 * Scoping still happens twice, and both are deliberate. The query fetches only
 * the cities this build was asked for, so a job building one city never sees
 * another's documents at all; the `tenant` field separates the ones it did
 * fetch. See `src/lib/sanity/queries.ts`.
 *
 * Every collection is defined here whether or not this build loads it, so
 * `getCollection` has one set of types across every target — see `city` and
 * `frontPage` below.
 */

/**
 * Wraps a loader for a collection a city may correctly never use.
 *
 * `getCollection` warns about a collection the store has never heard of,
 * assuming an empty one means a broken config. That is fair for most of these
 * — an empty `partners` only means a city has not signed any yet — but talks
 * are empty for the entire lifetime of a city that runs one presentation per
 * session, and telling its organisers to go looking for an error every build
 * is telling them the wrong thing. Registering the collection empty says what
 * is true: it exists, and there is nothing in it.
 */
const optional = (loader: Loader): Loader => ({
  ...loader,
  load: async (context) => {
    await loader.load(context);
    if (context.store.keys().length > 0) return;

    // Setting then deleting is what leaves the collection behind: `set`
    // creates it, and `delete` only removes the entry.
    const marker = "__registers_the_collection__";
    context.store.set({ id: marker, data: {} });
    context.store.delete(marker);
  },
});

/** Registers a collection and leaves it empty. */
const nothing = optional({
  name: "empty",
  load: async ({ store }) => {
    store.clear();
  },
});

/**
 * The loader for one city-scoped collection: the CMS when it is configured,
 * a single city's own directory when it is not. Which query and which mapper
 * that means is `src/lib/sanity/sources.ts`, because the draft preview runs
 * the same pairs at request time and two hand-written lists of them would one
 * day disagree. The name there is both the Sanity label and the directory, so
 * the two *sources* cannot drift apart either.
 *
 * A build that produces no city — `TARGETS=portal`, which is how CI builds the
 * front page — still *registers* every collection, because these definitions
 * are where `getCollection` gets its types and one shape across every target
 * is what keeps them honest. Actually loading a city there would resolve its
 * speaker photos and emit every one of them into the front page's output for
 * nothing.
 *
 * The draft preview registers everything empty too, and for a stronger reason
 * than tidiness. It renders per request from a snapshot taken then, so a store
 * filled at build time would be a second, older copy of the same content —
 * and any read that had not been moved onto the request-time path would
 * silently serve it. Empty means a missed read shows nothing, which is
 * noticeable; stale means it shows yesterday, which is not.
 */
const city = (key: CollectionName): Loader => {
  const { name, query, toEntry } = sources[key];

  return noCities || previewMode
    ? nothing
    : sanityEnabled()
      ? sanityLoader({ label: name, query, tenants: selectedCities, toEntry })
      : glob({
          base: `./src/content/${LOCAL_TENANT}/${name}`,
          pattern: "**/*.md",
        });
};

/**
 * The mirror of `city`, for content that belongs to the front page rather than
 * to any city: loaded when the front page is one of this build's targets and
 * nowhere else. No `$tenants` is bound, because there is no city to scope to.
 */
const frontPage = (key: CollectionName): Loader => {
  const { name, query, toEntry } = sources[key];

  return !portalSelected || previewMode
    ? nothing
    : sanityEnabled()
      ? sanityLoader({ label: name, query, toEntry })
      : glob({ base: `./src/content/portal/${name}`, pattern: "**/*.md" });
};

const speakers = defineCollection({
  loader: city("speakers"),
  schema: schema.speakers,
});

const tracks = defineCollection({
  loader: city("tracks"),
  schema: schema.tracks,
});

const sessions = defineCollection({
  loader: city("sessions"),
  schema: schema.sessions,
});

const talks = defineCollection({
  loader: optional(city("talks")),
  schema: schema.talks,
});

const meetups = defineCollection({
  loader: city("meetups"),
  schema: schema.meetups,
});

const partners = defineCollection({
  loader: city("partners"),
  schema: schema.partners,
});

const about = defineCollection({
  loader: city("about"),
  schema: schema.about,
});

const photos = defineCollection({
  loader: city("photos"),
  schema: schema.photos,
});

/**
 * `optional` because a front page listing only this codebase's own cities is a
 * perfectly good front page.
 */
const externalEvents = defineCollection({
  loader: optional(frontPage("externalEvents")),
  schema: schema.externalEvents,
});

export const collections = {
  speakers,
  tracks,
  sessions,
  talks,
  meetups,
  partners,
  about,
  photos,
  externalEvents,
};
