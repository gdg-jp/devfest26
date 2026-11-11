import type { ResolvedTenant } from "../../../../tenants";
import type { Language } from "../../../../i18n";
import { HERO, OVERVIEW, localized } from "../../_content";

/**
 * What the key visual prints, read once: the day split for setting at
 * different sizes, the venue with its walk from the station, and the words
 * from `HERO`. The fields only the other candidates read are kept with them,
 * in `design/tokyo-hero/candidates/hero-extras.ts`.
 */
export function heroFacts(site: ResolvedTenant, lang: Language) {
  const { event } = site;
  const [year, month, day] = event.isoDate.split("-");
  const text = (key: keyof typeof HERO) => localized(HERO[key], lang);

  return {
    year,
    month,
    day,
    dow: event.dayOfWeek,
    startsAt: event.startsAt,
    start: event.startTime,
    end: event.endTime,
    venue: event.venue.name,
    station: localized(OVERVIEW.station, lang),
    walk: localized(OVERVIEW.walk, lang),
    host: event.host,
    text,
  };
}

export type HeroFacts = ReturnType<typeof heroFacts>;
