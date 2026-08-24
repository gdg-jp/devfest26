import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { activeTenant } from "./tenants/active";
import { sanityEnabled } from "./lib/sanity/env";
import { sanityLoader } from "./loaders/sanity";
import * as Q from "./lib/sanity/queries";
import {
  aboutEntry,
  meetupEntry,
  partnerEntry,
  sessionEntry,
  speakerEntry,
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
 * Scoping to a city works differently in each source, and both are deliberate:
 * the Markdown loaders read a per-city directory, so one city's content cannot
 * physically appear in another's build; the Sanity queries filter on the
 * `event` reference, which is the only handle a shared dataset gives us.
 */

const dir = (collection: string) =>
  `./src/content/${activeTenant}/${collection}`;

const sanity = (
  label: string,
  query: string,
  toEntry: Parameters<typeof sanityLoader>[0]["toEntry"],
) => sanityLoader({ label, query, tenant: activeTenant, toEntry });

/** A Sanity asset, already cropped and sized by its CDN. See src/lib/photo.ts. */
const remotePhoto = z.object({
  src: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  remote: z.literal(true),
});

const speakerFields = {
  name: z.string(),
  /** Job title / affiliation. Shown under the name. */
  role: z.string(),
  /** Single character shown when there is no photo. */
  initial: z.string().max(2).optional(),
};

const speakers = defineCollection({
  loader: sanityEnabled
    ? sanity("speakers", Q.SPEAKERS, speakerEntry)
    : glob({ base: dir("speakers"), pattern: "**/*.md" }),
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

const sessions = defineCollection({
  loader: sanityEnabled
    ? sanity("sessions", Q.SESSIONS, sessionEntry)
    : glob({ base: dir("sessions"), pattern: "**/*.md" }),
  schema: z.object({
    track: z.enum(["a", "b", "c", "unscheduled"]),
    /** Position within the track. */
    order: z.number().int().positive(),
    /** Omit while the talk is still TBD. */
    title: z.string().optional(),
    speakers: z.array(reference("speakers")).min(1),
  }),
});

const meetups = defineCollection({
  loader: sanityEnabled
    ? sanity("meetups", Q.MEETUPS, meetupEntry)
    : glob({ base: dir("meetups"), pattern: "**/*.md" }),
  schema: z.object({
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
  loader: sanityEnabled
    ? sanity("partners", Q.PARTNERS, partnerEntry)
    : glob({ base: dir("partners"), pattern: "**/*.md" }),
  schema: z.object({
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
  loader: sanityEnabled
    ? sanity("about", Q.ABOUT, aboutEntry)
    : glob({ base: dir("about"), pattern: "**/*.md" }),
  schema: z.object({
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

export const collections = { speakers, sessions, meetups, partners, about };
