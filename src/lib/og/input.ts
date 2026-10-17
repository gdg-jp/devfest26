import { z } from "astro/zod";

/**
 * What a session card is drawn from — the whole of it. Everything the card
 * shows arrives here and nothing is looked up, so a card can be made from the
 * site's own programme (`src/lib/sessionCard.ts`, during a build) or from a
 * JSON file someone wrote by hand (`scripts/og.ts`) with the same result.
 *
 * Kept free of Astro and of Vite: the command line imports it as it is.
 */

/** A Sanity image field, as the Studio stores it. */
const sanityImage = z.object({
  asset: z.object({ _ref: z.string() }),
  crop: z
    .object({
      top: z.number(),
      bottom: z.number(),
      left: z.number(),
      right: z.number(),
    })
    .optional(),
  hotspot: z
    .object({
      x: z.number(),
      y: z.number(),
      height: z.number(),
      width: z.number(),
    })
    .optional(),
});

/**
 * Where a speaker's photo comes from: an image on Sanity, with the project it
 * belongs to so that no environment is needed to fetch it; a URL; or a file.
 * A relative path is resolved by whoever reads the input — the command line
 * resolves it against the JSON file it came from.
 */
export const photoInput = z.union([
  z.object({
    sanity: z.object({
      projectId: z.string(),
      dataset: z.string(),
      image: sanityImage,
    }),
  }),
  z.string().min(1),
]);

export const speakerInput = z.object({
  name: z.string().min(1),
  role: z.string().default(""),
  /** Shown in place of a photo. The name's first character by default. */
  initial: z.string().max(2).optional(),
  photo: photoInput.optional(),
});

export const cardInput = z.object({
  /**
   * What makes this card this card: the session's slug, say. Seeds every
   * choice the card makes for itself — which stickers, where — so that it
   * comes out the same each time it is drawn.
   */
  id: z.string().min(1),
  /** Under the wordmark: "Tokyo 2026". */
  edition: z.string().min(1),
  /**
   * The title as written. Leading bracketed tags — "[ライブデモ] …" — are
   * drawn as badges above it.
   */
  title: z.string().min(1),
  speakers: z.array(speakerInput).min(1),
  /** The language of the few words the card supplies itself ("ほか 2 名"). */
  lang: z.enum(["ja", "en"]).default("ja"),
  /** The city's theme: the pastel behind a speaker with no photo. */
  theme: z.enum(["blue", "green", "yellow", "red"]).default("red"),
});

export type PhotoInput = z.infer<typeof photoInput>;
export type SpeakerInput = z.infer<typeof speakerInput>;
/** A card as written — the JSON a command line is handed. */
export type CardInput = z.input<typeof cardInput>;
/** A card with its defaults filled in, as the drawing reads it. */
export type Card = z.output<typeof cardInput>;
export type SanityImage = z.infer<typeof sanityImage>;
