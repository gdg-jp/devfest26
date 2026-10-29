import type { ResolvedTenant } from "../../../../tenants";
import type { Language } from "../../../../i18n";
import { HERO, LANES, OVERVIEW, localized } from "../../_content";

/**
 * What every key visual prints, read once: the day split for setting at
 * different sizes, the venue with its walk from the station, and the words
 * from `HERO`. The candidates only differ in how they lay these out.
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
    fee: event.fee,
    host: event.host,
    tagline: site.tagline,
    /** The name as the lockup spells it (see `Wordmark`), then the theme's
        two halves: what `HeroWave` types. */
    words: ["DevFest Tokyo", LANES.meet.title, LANES.beyond.title],
    text,
    /** The catch, a line per entry and a run per line: `em` is underlined. */
    catchLines: text("catch")
      .split("\n")
      .map((line) =>
        line.split("*").map((run, i) => ({ run, em: i % 2 === 1 })),
      ),
  };
}

export type HeroFacts = ReturnType<typeof heroFacts>;
