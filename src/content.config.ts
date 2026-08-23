import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { activeTenant } from './tenants/active';

/**
 * Everything an organiser edits lives in `src/content/<tenant>/`. Structured
 * fields go in frontmatter; prose (abstract, bio, description) is the Markdown
 * body, so it can carry links and emphasis.
 *
 * The schemas are shared across cities; only the directory the loader reads
 * changes. Scoping by directory rather than by a `tenant` field on every entry
 * is deliberate — a filter that someone forgets to apply would leak one city's
 * sessions onto another city's site, and that failure is silent.
 *
 * Swapping any of these `glob()` loaders for a CMS loader (Sanity, Contentful)
 * is the only change needed to move authoring off the repo.
 */

const dir = (collection: string) => `./src/content/${activeTenant}/${collection}`;

const speakers = defineCollection({
  loader: glob({ base: dir('speakers'), pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      /** Job title / affiliation. Shown under the name. */
      role: z.string(),
      /** Path to a neighbouring image file, e.g. `./llion-jones.jpg`.
          A path that does not resolve fails the build rather than rendering a
          hole. Omit to fall back to `initial`. */
      photo: image().optional(),
      /** Single character shown when there is no photo. */
      initial: z.string().max(2).optional(),
    }),
});

const sessions = defineCollection({
  loader: glob({ base: dir('sessions'), pattern: '**/*.md' }),
  schema: z.object({
    track: z.enum(['a', 'b', 'c', 'unscheduled']),
    /** Position within the track. */
    order: z.number().int().positive(),
    /** Omit while the talk is still TBD. */
    title: z.string().optional(),
    speakers: z.array(reference('speakers')).min(1),
  }),
});

const meetups = defineCollection({
  loader: glob({ base: dir('meetups'), pattern: '**/*.md' }),
  schema: z.object({
    /** Meetup number — also the sort key. */
    no: z.number().int().positive(),
    title: z.string(),
    subtitle: z.string().optional(),
    status: z.enum(['open', 'closed', 'done', 'planned']),
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

/**
 * One entry per city (`about.md`). This is the only long-form prose that is
 * genuinely editorial rather than boilerplate — a city's own pitch for its own
 * year — so it lives in Markdown next to the rest of the content instead of in
 * the tenant config. A city without one simply does not render the section.
 */
const about = defineCollection({
  loader: glob({ base: dir('about'), pattern: '**/*.md' }),
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

const partners = defineCollection({
  loader: glob({ base: dir('partners'), pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    url: z.url(),
    handle: z.string(),
    order: z.number().int().positive(),
    rail: z.enum(['blue', 'green', 'yellow', 'red']),
  }),
});

export const collections = { speakers, sessions, meetups, partners, about };
