import { defineCollection, reference } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { z } from "astro/zod";
import {
  LOCAL_TENANT,
  noCities,
  portalSelected,
  selectedCities,
} from "./tenants/selection";
import { sanityEnabled } from "./lib/sanity/env";
import { sanityLoader } from "./loaders/sanity";
import * as Q from "./lib/sanity/queries";
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
} from "./lib/sanity/entries";

/**
 * Content has two possible sources and one set of schemas.
 *
 * By default everything an organiser edits lives in `src/content/<tenant>/`:
 * structured fields in frontmatter, prose in the Markdown body. Set
 * `SANITY_PROJECT_ID` and the same collections are filled from Sanity instead —
 * only the loader changes. The schemas below, and every component reading them,
 * are identical either way.
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

type ToEntry = Parameters<typeof sanityLoader>[0]["toEntry"];

/**
 * The loader for one city-scoped collection: the CMS when it is configured,
 * a single city's own directory when it is not. The name is both the Sanity
 * label and the directory, so the two sources can never drift apart.
 *
 * A build that produces no city — `TARGETS=portal`, which is how CI builds the
 * front page — still *registers* every collection, because these definitions
 * are where `getCollection` gets its types and one shape across every target
 * is what keeps them honest. Actually loading a city there would resolve its
 * speaker photos and emit every one of them into the front page's output for
 * nothing.
 */
const city = (name: string, query: string, toEntry: ToEntry): Loader =>
  noCities
    ? nothing
    : sanityEnabled
      ? sanityLoader({ label: name, query, tenants: selectedCities, toEntry })
      : glob({
          base: `./src/content/${LOCAL_TENANT}/${name}`,
          pattern: "**/*.md",
        });

/**
 * The mirror of `city`, for content that belongs to the front page rather than
 * to any city: loaded when the front page is one of this build's targets and
 * nowhere else. No `$tenants` is bound, because there is no city to scope to.
 */
const frontPage = (name: string, query: string, toEntry: ToEntry): Loader =>
  !portalSelected
    ? nothing
    : sanityEnabled
      ? sanityLoader({ label: name, query, toEntry })
      : glob({ base: `./src/content/portal/${name}`, pattern: "**/*.md" });

/** A Sanity asset, already cropped and sized by its CDN. See src/lib/photo.ts. */
const remotePhoto = z.object({
  src: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  remote: z.literal(true),
});

/**
 * The URL segment for an entry that gets a page of its own.
 *
 * Optional because from Markdown the entry id is already the file name, which
 * is a perfectly good segment. Sanity ids are opaque uuids, so a Studio
 * document has to say what it wants to be called. See `slugOf` in
 * `src/data/program.ts`.
 */
const slug = z.string().optional();

/**
 * Which city an entry belongs to.
 *
 * Always present from Sanity, where it is projected off the `event` reference.
 * Never present in Markdown frontmatter — a Markdown build produces one city,
 * so the default is that city and not one of the forty content files has to
 * say so. See `LOCAL_TENANT` in `src/tenants/selection.ts`.
 */
const tenant = z.string().default(LOCAL_TENANT);

const speakerFields = {
  tenant,
  name: z.string(),
  /** Job title / affiliation. Shown under the name. */
  role: z.string(),
  /** Single character shown when there is no photo. */
  initial: z.string().max(2).optional(),
  slug,
};

const speakers = defineCollection({
  loader: city("speakers", Q.SPEAKERS, speakerEntry),
  schema: ({ image }) =>
    z.object({
      ...speakerFields,
      /**
       * Either shape, so the collection keeps one statically-known type
       * whichever source is active. From Markdown it is a path to a
       * neighbouring file (`./llion-jones.jpg`) that must resolve or the build
       * fails; from Sanity it is a CDN URL the loader already built.
       */
      photo: z.union([remotePhoto, image()]).optional(),
    }),
});

/**
 * How many tracks a DevFest runs, what they are called and what colour they
 * are is a local decision, so tracks are content rather than code: a city adds
 * one by adding a file (or a Studio document), not by widening a union type.
 *
 * The entry id is the handle a session points at — `a.md` is what makes
 * `track: a` resolve — so a city is free to name its tracks `main` and
 * `workshop` instead, as long as its sessions agree.
 */
const tracks = defineCollection({
  loader: city("tracks", Q.TRACKS, trackEntry),
  schema: z.object({
    tenant,
    /** Display order, on the page and in the track headers. */
    order: z.number().int().positive(),
    label: z.string(),
    /** One line under the label, describing what the track is for. */
    sub: z.string(),
    /** Solid fill for the track header pill. */
    color: z.string(),
    /** Readable version of `color` for small text on white. */
    textColor: z.string(),
    /** Header needs dark text (yellow fails white). */
    darkInk: z.boolean().optional(),
    /** Not yet a real track — rendered dashed and outlined, and left out of
        the "n トラック" count in the timetable. */
    pending: z.boolean().optional(),
    /** Printed above each card in place of the session number. A holding pen
        has no running order to show, so it labels its cards some other way. */
    cardLabel: z.string().optional(),
  }),
});

/**
 * A session is a slot in a track. What fills the slot is a local decision:
 * Kansai runs one presentation per session, while Tokyo — like I/O Extended —
 * runs several, so the two levels have to be tellable apart.
 *
 * They are the same collection either way. A city with one presentation per
 * slot writes its speakers and its abstract here and no `talks` at all; a city
 * with several writes `talks` pointing back at the session, and this entry
 * carries what the slot as a whole is called. `src/data/program.ts` normalises
 * the two into one shape, so the difference between cities is whether content
 * exists rather than a flag anyone has to set.
 */
const sessions = defineCollection({
  loader: city("sessions", Q.SESSIONS, sessionEntry),
  schema: z.object({
    tenant,
    track: reference("tracks"),
    /** Position within the track. */
    order: z.number().int().positive(),
    /** Omit while the session is still TBD. */
    title: z.string().optional(),
    /** The people on stage for the whole slot. Omit only when the session's
        own talks name them instead — a session that names neither fails the
        build rather than publishing an empty card. */
    speakers: z.array(reference("speakers")).min(1).optional(),
    slug,
    /** "13:00". The timetable stays hand-written per city, so these are just
        for the session's own page and may be left out entirely. */
    start: z.string().optional(),
    end: z.string().optional(),
  }),
});

/**
 * One presentation inside a session — the level I/O Extended calls a talk.
 *
 * A city only writes these if it needs them. Leave the directory empty and
 * every session is its own single talk, which is exactly how a one-talk-per-
 * slot city reads today; no `/talks/` page is published at all.
 */
const talks = defineCollection({
  loader: optional(city("talks", Q.TALKS, talkEntry)),
  schema: z.object({
    tenant,
    session: reference("sessions"),
    /** Position within the session. */
    order: z.number().int().positive(),
    /** Omit to inherit the session's title — a slot holding a single talk
        rarely has a second name for it. */
    title: z.string().optional(),
    speakers: z.array(reference("speakers")).min(1),
    slug,
    start: z.string().optional(),
  }),
});

const meetups = defineCollection({
  loader: city("meetups", Q.MEETUPS, meetupEntry),
  schema: z.object({
    tenant,
    /** Meetup number — also the sort key. */
    no: z.number().int().positive(),
    title: z.string(),
    subtitle: z.string().optional(),
    status: z.enum(["open", "closed", "done", "planned"]),
    /** Omit on a `planned` meetup whose date is not set. */
    date: z.coerce.date().optional(),
    doorsAt: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    venue: z.string().optional(),
    capacity: z.string().optional(),
    fee: z.string().optional(),
    url: z.url().optional(),
    /** Label for the CTA when the meetup has a URL. */
    cta: z.string().optional(),
    program: z
      .array(
        z.object({
          at: z.string(),
          what: z.string(),
          who: z.string().optional(),
          /** Counts toward the "LT n 本" summary on the disclosure. */
          talk: z.boolean().optional(),
          /** Breaks and interludes render muted. */
          break: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

const partners = defineCollection({
  loader: city("partners", Q.PARTNERS, partnerEntry),
  schema: z.object({
    tenant,
    name: z.string(),
    url: z.url(),
    handle: z.string(),
    order: z.number().int().positive(),
    rail: z.enum(["blue", "green", "yellow", "red"]),
  }),
});

/**
 * One entry per city (`about.md`, or a single `aboutPage` document). This is
 * the only long-form prose that is genuinely editorial rather than boilerplate
 * — a city's own pitch for its own year. A city without one does not render
 * the section.
 */
const about = defineCollection({
  loader: city("about", Q.ABOUT, aboutEntry),
  schema: z.object({
    tenant,
    /** Opening line, set larger than the body. */
    lead: z.string(),
    /** Bracketed aside under the body. Plain text. */
    callout: z.string().optional(),
    /** Side panel. Items may use **bold** for the highlighted phrase. */
    audience: z
      .object({
        eyebrow: z.string().optional(),
        heading: z.string(),
        items: z.array(z.string()).min(1),
      })
      .optional(),
  }),
});

/**
 * One entry per city, and every field optional: photos arrive as an event is
 * photographed, not before it. A city with no set — or a set with no backdrop
 * — simply renders no photo, the same way About and Partners disappear when
 * they are empty.
 *
 * Placement is deliberately absent. Where a prop sits in the gutter is a
 * layout decision, so the list is ordered and each section picks an index.
 */
const photos = defineCollection({
  loader: city("photos", Q.PHOTOS, photoSetEntry),
  schema: ({ image }) => {
    /*
      Backdrops are named, not numbered, because each surface treats its photo
      differently — see the blend modes in Register.astro and Countdown.astro.
      The gutter props stay an ordered list: those are interchangeable, and
      sections claim them by position.
    */
    const backdrop = z.object({
      image: z.union([remotePhoto, image()]),
      /** Photographer, shown once in the footer colophon. */
      credit: z.string().optional(),
    });

    return z.object({
      tenant,
      /** Under the closing call to action, printed into the tenant colour. */
      registerBackdrop: backdrop.optional(),
      /** Behind the countdown band, under the opaque digit cards. */
      countdownBackdrop: backdrop.optional(),
      /** Gutter props, in the order sections claim them. */
      props: z
        .array(z.object({ image: z.union([remotePhoto, image()]) }))
        .optional(),
    });
  },
});

/**
 * DevFests the portal lists but does not host: another chapter's event, a past
 * edition, anything whose page lives somewhere else.
 *
 * The one collection that is not city-scoped. It belongs to the root page
 * rather than to any city, so its Markdown sits in `src/content/portal/`
 * instead of under a city directory, and its query carries no `event` filter.
 * `optional` because a front page listing only this codebase's own cities is a
 * perfectly good front page.
 */
const externalEvents = defineCollection({
  loader: optional(
    frontPage("external-events", Q.EXTERNAL_EVENTS, externalEventEntry),
  ),
  schema: z.object({
    title: z.string(),
    /** 関西 / 東京 / 福岡 — what the card is filed under. */
    region: z.string(),
    /** Full ISO timestamp with offset: 2026-10-18T11:00:00+09:00. */
    startsAt: z.coerce.date(),
    /** Omit for a single-day event. */
    endsAt: z.coerce.date().optional(),
    city: z.string().optional(),
    venue: z.string().optional(),
    /** Picks the card's accent from the four core colours. */
    theme: z.enum(["blue", "green", "yellow", "red"]),
    /** Where the card leads. This event has no page on this site. */
    url: z.url(),
    /** One line under the venue, for what the other fields do not cover. */
    note: z.string().optional(),
    slug,
  }),
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
