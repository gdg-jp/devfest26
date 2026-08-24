import { z } from "astro/zod";
import { sanityClient } from "../lib/sanity/client";
import { EVENT } from "../lib/sanity/queries";
import type { TenantConfig } from "./types";

/**
 * The tenant config, read from the single `event` document for this city.
 *
 * It is validated here rather than trusted. A Studio editor can save a document
 * with half its fields blank, and without this the site would build and publish
 * a page reading "undefined" — the failure mode the local TS configs make
 * impossible by being type-checked. A build that cannot produce a complete
 * config should stop.
 */

const nonEmpty = z.string().min(1);
const tone = z.enum(["blue", "green", "yellow", "red"]);

const eventDoc = z.object({
  tenant: nonEmpty,
  theme: tone,

  lang: nonEmpty.default("ja"),
  locale: nonEmpty.default("ja_JP"),
  title: nonEmpty,
  titleEn: nonEmpty,
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

  tracks: z
    .array(
      z.object({
        id: z.enum(["a", "b", "c", "unscheduled"]),
        label: nonEmpty,
        sub: nonEmpty,
        color: nonEmpty,
        textColor: nonEmpty,
        darkInk: z.boolean().nullish(),
        pending: z.boolean().nullish(),
      }),
    )
    .min(1),

  timetable: z.array(
    z.object({
      start: nonEmpty,
      end: nonEmpty,
      lines: z
        .array(z.object({ label: nonEmpty, note: z.string(), rail: nonEmpty }))
        .min(1),
    }),
  ),
});

/** Sanity returns null for a blank field; the config wants it absent. */
const clean = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

export async function tenantFromSanity(slug: string): Promise<TenantConfig> {
  const raw = await sanityClient().fetch(EVENT, { tenant: slug });

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
    tenant: d.tenant as TenantConfig["tenant"],
    theme: d.theme,
    lang: d.lang,
    locale: d.locale,
    title: d.title,
    titleEn: d.titleEn,
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
        addressLocality: clean(d.venue.addressLocality),
        addressRegion: clean(d.venue.addressRegion),
        streetAddress: clean(d.venue.streetAddress),
        postalCode: clean(d.venue.postalCode),
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

    tracks: d.tracks.map((t) => ({
      ...t,
      darkInk: clean(t.darkInk),
      pending: clean(t.pending),
    })),
    timetable: d.timetable,
  };
}
