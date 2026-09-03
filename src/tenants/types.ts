import type { Theme } from "../data/themes";
import type { TenantId } from "./ids";

/**
 * The shape a city has to fill in.
 *
 * With Sanity on this is what one `event` document has to provide, validated in
 * `fromSanity.ts`. Without it, one file per city in this directory — and
 * nothing outside `src/tenants/` and `src/content/<tenant>/` is city-specific
 * either way.
 */

/**
 * Tracks are not here: they are a content collection, so a city adds one
 * without touching this file. See `src/content.config.ts`.
 */
export interface TimetableRow {
  start: string;
  end: string;
  lines: { label: string; note: string; rail: string }[];
}

export interface NavItem {
  href: string;
  label: string;
}

export interface Stat {
  value: string;
  label: string;
  tone: "blue" | "green" | "yellow" | "red";
}

export interface Venue {
  name: string;
  area: string;
  cityEn: string;
  /** 大阪 — the city, as it reads mid-sentence ("10月18日に大阪で"). */
  city: string;
  /** 関西 — the wider area, for talking about the local community. */
  region: string;
  /** Postal fields are optional: a city announces the venue after the date.
      When `streetAddress` is missing the JSON-LD omits the address entirely
      rather than publishing a half-filled one. */
  addressLocality?: string;
  addressRegion?: string;
  streetAddress?: string;
  postalCode?: string;
}

export interface TenantConfig {
  tenant: TenantId;
  /** One of the four DevFest core colours. See src/data/themes.ts. */
  theme: Theme;
  isPublic?: boolean;

  lang: string;
  locale: string;
  title: string;
  titleEn: string;
  description: string;

  tagline: { lead: string; accent: string };

  event: {
    /** Drives the countdown and every derived date label. */
    startsAt: string;
    endsAt: string;

    /** After-party. Omit for a city that does not run one. */
    social?: { label: string; start: string; end: string };

    venue: Venue;

    format: string;
    formatShort: string;
    fee: string;
    host: string;
    coHosts: string;
  };

  stats: readonly Stat[];

  links: {
    register: string;
    community: string;
    connpass: string;
    cocJa: string;
    cocEn: string;
  };

  nav: readonly NavItem[];
  footerNav: readonly NavItem[];

  timetable: TimetableRow[];
}
