import { getCollection } from "astro:content";
import type { Theme } from "../data/themes";
import { tenantHome } from "../lib/url";
import { eventDates } from "../tenants/eventDates";
import { discoverCities } from "../tenants/discovery";

/**
 * Every DevFest the front page lists, from two kinds of source.
 *
 * A **city** is one this repository publishes — it has a page here, at
 * `/kansai`, and everything on its card already exists in its `event`
 * document. Nothing is written twice: publish a city in the Studio and it
 * appears, with no matrix to edit and no id to register.
 *
 * An **external event** is one the front page only points at: another
 * chapter's DevFest, a past edition, anything whose page lives elsewhere.
 * Those are the entries an organiser writes by hand.
 *
 * Both follow the same two-source rule as the rest of the content: from Sanity
 * when `SANITY_PROJECT_ID` is set, from the repository when it is not. See
 * `src/content.config.ts`.
 *
 * **Every city is listed, including the ones this build is not producing.**
 * The front page is built by a job of its own, and a city's job may have
 * failed — in which case that city's pages are still published, from the last
 * build that succeeded. A card that vanished whenever a build was scoped or a
 * city's data was mid-edit would point at nothing while `/kansai` was sitting
 * there answering. Cards come from `src/tenants/discovery.ts`, which validates
 * only what a card prints.
 */

export interface PortalEvent {
  /** Stable key. For a city, also its path segment. */
  slug: string;
  title: string;
  /** 関西 — the heading the card is filed under. */
  region: string;
  /** Sort key. */
  startsAt: string;
  /** 2026-10-18, for <time datetime>. */
  isoDate: string;
  /** 2026年10月18日（日）, or a two-day range. */
  dateLabel: string;
  city?: string;
  venue?: string;
  theme: Theme;
  href: string;
  /** True when the page it leads to is not part of this site. */
  external: boolean;
  note?: string;
}

export interface PortalEvents {
  /** Soonest first — what someone came to the page to find. */
  upcoming: PortalEvent[];
  /** Most recent first. Over as of this build; see `getPortalEvents`. */
  past: PortalEvent[];
}

/**
 * 2026年10月18日（日）, and both ends of it when an event runs over two days.
 *
 * `eventDates` derives its labels from the start, so a range asks it twice.
 * Only the date halves are used here — the front page is a list of events, not
 * a running order.
 */
function dateLabel(startsAt: string, endsAt: string) {
  const from = eventDates(startsAt, startsAt);
  const to = eventDates(endsAt, endsAt);
  const start = `${from.dateLabel}（${from.dayOfWeek}）`;

  return {
    isoDate: from.isoDate,
    label:
      from.isoDate === to.isoDate
        ? start
        : `${start} – ${to.monthDay}（${to.dayOfWeek}）`,
  };
}

async function cities(): Promise<PortalEvent[]> {
  return (await discoverCities()).map((doc) => {
    const { isoDate, label } = dateLabel(doc.startsAt, doc.endsAt);

    return {
      slug: doc.slug,
      title: doc.title,
      region: doc.venue.region,
      startsAt: doc.startsAt,
      isoDate,
      dateLabel: label,
      city: doc.venue.city,
      venue: doc.venue.name,
      theme: doc.theme,
      href: tenantHome(doc.slug),
      external: false,
    };
  });
}

async function external(): Promise<PortalEvent[]> {
  const entries = await getCollection("externalEvents");

  return entries.map((entry) => {
    const d = entry.data;
    const startsAt = d.startsAt.toISOString();
    const { isoDate, label } = dateLabel(
      startsAt,
      (d.endsAt ?? d.startsAt).toISOString(),
    );

    return {
      slug: d.slug ?? entry.id,
      title: d.title,
      region: d.region,
      startsAt,
      isoDate,
      dateLabel: label,
      city: d.city,
      venue: d.venue,
      theme: d.theme,
      href: d.url,
      external: true,
      note: d.note,
    };
  });
}

/**
 * Everything the front page lists, split at today.
 *
 * "Today" is the build time: this is a static site, so an event moves from
 * upcoming to past on the next rebuild rather than on the night itself. The
 * CMS webhook rebuilds on every publish, and nothing here is time-critical to
 * the hour.
 */
export async function getPortalEvents(): Promise<PortalEvents> {
  const all = [...(await cities()), ...(await external())];

  const now = Date.now();
  const at = (event: PortalEvent) => new Date(event.startsAt).getTime();
  const isPast = (event: PortalEvent) => at(event) < now;

  assertUniqueSlugs(all);

  return {
    upcoming: all.filter((e) => !isPast(e)).sort((a, b) => at(a) - at(b)),
    past: all.filter(isPast).sort((a, b) => at(b) - at(a)),
  };
}

/**
 * Two events under one key would be indistinguishable in the list and in any
 * anchor pointing into it. Cities and external events come from different
 * places, so nothing else catches a collision between the two.
 */
function assertUniqueSlugs(events: PortalEvent[]) {
  const seen = new Set<string>();
  for (const { slug } of events) {
    if (seen.has(slug))
      throw new Error(
        `Two front-page events share the slug "${slug}". Give one of them its own.`,
      );
    seen.add(slug);
  }
}
