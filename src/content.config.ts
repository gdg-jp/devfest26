import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Everything an organiser edits lives in `src/content/`. Structured fields go in
 * frontmatter; prose (abstract, bio, description) is the Markdown body, so it
 * can carry links and emphasis.
 *
 * Swapping any of these `glob()` loaders for a CMS loader (Sanity, Contentful)
 * is the only change needed to move authoring off the repo.
 */

const speakers = defineCollection({
  loader: glob({ base: './src/content/speakers', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    /** Job title / affiliation. Shown under the name. */
    role: z.string(),
    /** Basename in src/assets/speakers/. Omit to fall back to `initial`. */
    photo: z.string().optional(),
    /** Single character shown when there is no photo. */
    initial: z.string().max(2).optional(),
  }),
});

const sessions = defineCollection({
  loader: glob({ base: './src/content/sessions', pattern: '**/*.md' }),
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
  loader: glob({ base: './src/content/meetups', pattern: '**/*.md' }),
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

const partners = defineCollection({
  loader: glob({ base: './src/content/partners', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    url: z.url(),
    handle: z.string(),
    order: z.number().int().positive(),
    rail: z.enum(['blue', 'green', 'yellow', 'red']),
  }),
});

export const collections = { speakers, sessions, meetups, partners };
