import { z } from "astro/zod";
import { sanityClient } from "../lib/sanity/client";
import { EVENT } from "../lib/sanity/queries";
import type { TenantConfig } from "./types";

/**
 * The tenant config, read from the single `event` document for this city.
 *
 * This is tier 2 — everything a city's own pages need, and nothing the front
 * page does. It is validated here rather than trusted: a Studio editor can save
 * a document with half its fields blank, and without this the site would build
 * and publish a page reading "undefined", the failure mode the local TS configs
 * make impossible by being type-checked.
 *
 * Throwing is the point. In CI it fails that one city's job, which is the
 * signal the publish step reads as "leave that city's published pages where
 * they are" — see `.github/workflows/build.yml`. The city keeps its card on the
 * front page throughout, because a card only needs tier 1 (see
 * `src/tenants/discovery.ts`) and tier 1 still passes.
 */

const nonEmpty = z.string().min(1);
const tone = z.enum(["blue", "green", "yellow", "red"]);

/** Sanity returns null for a field nobody filled in; the config wants absence. */
const blank = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

const eventDoc = z.object({
  tenant: nonEmpty,
  theme: tone,
  isPublic: z.boolean().nullish(),

  lang: nonEmpty.default("ja"),
  locale: nonEmpty.default("ja_JP"),
  title: nonEmpty,
  subtitle: z.string().nullish().transform(blank),
  titleEn: nonEmpty,
  subtitleEn: z.string().nullish().transform(blank),
  description: nonEmpty,

  taglineLead: nonEmpty,
  taglineAccent: nonEmpty,

  startsAt: nonEmpty,
  endsAt: nonEmpty,

  socialLabel: z.string().nullish(),
  socialStart: z.string().nullish(),
  socialEnd: z.string().nullish(),

  venue: z.object({
    name: nonEmpty,
    area: nonEmpty,
    cityEn: nonEmpty,
    city: nonEmpty,
    region: nonEmpty,
    addressLocality: z.string().nullish(),
    addressRegion: z.string().nullish(),
    streetAddress: z.string().nullish(),
    postalCode: z.string().nullish(),
  }),

  format: nonEmpty,
  formatShort: nonEmpty,
  fee: nonEmpty,
  host: nonEmpty,
  coHosts: nonEmpty,

  stats: z
    .array(z.object({ value: nonEmpty, label: nonEmpty, tone }))
    .length(4),

  links: z.object({
    register: z.url(),
    community: z.url(),
    connpass: z.url(),
    cocJa: z.url(),
    cocEn: z.url(),
  }),

  nav: z.array(z.object({ href: nonEmpty, label: nonEmpty })).min(1),
  footerNav: z.array(z.object({ href: nonEmpty, label: nonEmpty })).min(1),

  /*
    Empty is a legitimate answer, unlike most of this file: a city that has not
    yet decided when its doors open has no fixtures, and the timetable is drawn
    from its sessions alone or not at all. `null` because that is what Sanity
    returns for an array nobody has touched.
  */
  fixtures: z
    .array(
      z.object({
        start: nonEmpty,
        end: nonEmpty,
        label: nonEmpty,
        note: z.string().nullish().transform(blank),
        tracks: z.array(nonEmpty).nullish().transform(blank),
      }),
    )
    .nullish()
    .transform((rows) => rows ?? []),
});

export async function tenantFromSanity(slug: string): Promise<TenantConfig> {
  return parseEvent(await sanityClient().fetch(EVENT, { tenant: slug }), slug);
}

/**
 * The validation half, apart from the fetch.
 *
 * The draft preview already holds every `event` document — it read them in the
 * same round trip as everything else on the page — so it needs this without the
 * query in front of it. See `src/preview/drafts.ts`.
 */
export function parseEvent(raw: unknown, slug: string): TenantConfig {
  if (!raw) {
    throw new Error(
      `No published "event" document with slug "${slug}" in Sanity. ` +
        "Create one in the Studio, or unset SANITY_PROJECT_ID to build from src/content/.",
    );
  }

  const parsed = eventDoc.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `The "event" document for "${slug}" is incomplete:\n${problems}`,
    );
  }

  const d = parsed.data;

  return {
    tenant: d.tenant,
    theme: d.theme,
    isPublic: d.isPublic ?? true,
    lang: d.lang,
    locale: d.locale,
    title: d.title,
    subtitle: d.subtitle,
    titleEn: d.titleEn,
    subtitleEn: d.subtitleEn,
    description: d.description,

    tagline: { lead: d.taglineLead, accent: d.taglineAccent },

    event: {
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      social:
        d.socialLabel && d.socialStart && d.socialEnd
          ? { label: d.socialLabel, start: d.socialStart, end: d.socialEnd }
          : undefined,
      venue: {
        name: d.venue.name,
        area: d.venue.area,
        cityEn: d.venue.cityEn,
        city: d.venue.city,
        region: d.venue.region,
        addressLocality: blank(d.venue.addressLocality),
        addressRegion: blank(d.venue.addressRegion),
        streetAddress: blank(d.venue.streetAddress),
        postalCode: blank(d.venue.postalCode),
      },
      format: d.format,
      formatShort: d.formatShort,
      fee: d.fee,
      host: d.host,
      coHosts: d.coHosts,
    },

    stats: d.stats,
    links: d.links,
    nav: d.nav,
    footerNav: d.footerNav,

    fixtures: d.fixtures,
  };
}
