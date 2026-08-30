import { reference } from "astro:content";
import type { SchemaContext } from "astro/content/config";
import { z } from "astro/zod";
import { LOCAL_TENANT } from "../tenants/selection";

/**
 * What a valid entry looks like, for every collection and both sources.
 *
 * These used to live inline in `src/content.config.ts`, and they are here
 * instead because there are now two places that validate against them. A
 * published build runs them through the content layer, once, on the way into
 * the store. The draft preview has no store — it reads Sanity at request time —
 * so it runs the very same schemas over the very same mapper output on the way
 * out. See `src/preview/drafts.ts`.
 *
 * That is the whole reason for the split: one definition, so that a field the
 * preview accepts is a field production accepts. This module deliberately
 * imports no loader, because everything in it has to be reachable from a
 * Cloudflare Worker, where `glob()` and the filesystem behind it are not.
 */

/**
 * The one piece of context a schema can ask Astro for.
 *
 * Astro's own type, deliberately, and not a narrower structural one: the
 * collection types are inferred from what these functions return, so a looser
 * `image()` would widen `photo` to `unknown` everywhere it is read. The preview
 * supplies its own — see `schemaOf`.
 */
export type Images = SchemaContext;

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

export const speakers = ({ image }: Images) =>
  z.object({
    tenant,
    name: z.string(),
    /** Job title / affiliation. Shown under the name. */
    role: z.string(),
    /** Single character shown when there is no photo. */
    initial: z.string().max(2).optional(),
    slug,
    /**
     * Either shape, so the collection keeps one statically-known type
     * whichever source is active. From Markdown it is a path to a
     * neighbouring file (`./llion-jones.jpg`) that must resolve or the build
     * fails; from Sanity it is a CDN URL the loader already built.
     */
    photo: z.union([remotePhoto, image()]).optional(),
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
export const tracks = z.object({
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
export const sessions = z.object({
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
});

/**
 * One presentation inside a session — the level I/O Extended calls a talk.
 *
 * A city only writes these if it needs them. Leave the directory empty and
 * every session is its own single talk, which is exactly how a one-talk-per-
 * slot city reads today; no `/talks/` page is published at all.
 */
export const talks = z.object({
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
});

export const meetups = z.object({
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
});

export const partners = z.object({
  tenant,
  name: z.string(),
  url: z.url(),
  handle: z.string(),
  order: z.number().int().positive(),
  rail: z.enum(["blue", "green", "yellow", "red"]),
});

/**
 * One entry per city (`about.md`, or a single `aboutPage` document). This is
 * the only long-form prose that is genuinely editorial rather than boilerplate
 * — a city's own pitch for its own year. A city without one does not render
 * the section.
 */
export const about = z.object({
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
export const photos = ({ image }: Images) => {
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
};

/**
 * DevFests the portal lists but does not host: another chapter's event, a past
 * edition, anything whose page lives somewhere else.
 *
 * The one collection that is not city-scoped. It belongs to the root page
 * rather than to any city, so its Markdown sits in `src/content/portal/`
 * instead of under a city directory, and its query carries no `event` filter.
 */
export const externalEvents = z.object({
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
});

/**
 * Every schema by collection name, for the one caller that picks at runtime.
 *
 * `src/content.config.ts` names them individually instead, because there the
 * collection *is* the name and a typo should be a type error rather than a
 * lookup that quietly returns nothing.
 */
const schemas = {
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

export type CollectionName = keyof typeof schemas;

/**
 * `image()` for a caller that has no images to resolve.
 *
 * It matches nothing, which collapses each `z.union([remotePhoto, image()])`
 * to its remote half — the only half a Sanity-backed entry has ever had.
 * Astro's own helper turns a path like `./llion-jones.jpg` into the metadata
 * its build produced for that file, and at request time there is no build, no
 * file and no path: every photo arrived as a URL on Sanity's CDN.
 *
 * Cast because it stands in for a function whose real return type describes
 * that metadata. Nothing is lost — a value that reached it would have failed
 * either way.
 */
const noImages = {
  image: () => z.never(),
} as unknown as SchemaContext;

/**
 * One collection's schema, ready to parse with. Used by the draft preview; see
 * `src/preview/drafts.ts`.
 */
export function schemaOf(name: CollectionName): z.ZodType {
  const schema = schemas[name];
  return typeof schema === "function" ? schema(noImages) : schema;
}
