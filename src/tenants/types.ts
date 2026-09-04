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

/**
 * A row of the timetable that no session accounts for: the doors opening, a
 * break, the photo, the party afterwards.
 *
 * The sessions supply everything else — they carry their own times — so what
 * is left here is the schedule nobody would look up: the things that are true
 * of the day rather than of a talk. Writing them as content instead of as a
 * `kind` on `sessions` is what keeps them out of the sessions list, off the
 * speaker pages, and clear of the rule that a session names somebody.
 *
 * This is also the whole of the answer to a break that starts at a different
 * time on each track. `tracks` names the tracks a row covers and omitting it
 * means all of them, so the uneven case is two rows rather than a mechanism:
 *
 *     { start: "14:25", end: "15:00", label: "休憩", tracks: ["b", "c"] }
 *     { start: "14:45", end: "15:00", label: "休憩", tracks: ["a", "d"] }
 */
export interface Fixture {
  /** Wall clock, `"13:00"`. */
  start: string;
  /**
   * Required, unlike a session's. A session may leave its end to be inferred
   * from whatever starts next; something has to state the last boundary of the
   * day, and a fixture — doors closing, the party — is what always does.
   */
  end: string;
  label: string;
  note?: string;
  /** Track entry ids. Omit for every track, which is the usual case. */
  tracks?: readonly string[];
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

  /**
   * Everything on the timetable that is not a session. The sessions themselves
   * are read from the `sessions` collection and placed by their own times.
   */
  fixtures: Fixture[];
}
