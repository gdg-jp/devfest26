/**
 * Google Analytics is opt-in, the same way Sanity is.
 *
 * With nothing configured nothing is emitted at all — not a script tag, not a
 * preconnect. That is what keeps local builds and pull request builds out of
 * the numbers without anyone having to remember: the site-wide id is a
 * repository variable, so it reaches the production workflow and nowhere else.
 * See `.github/workflows/build.yml`.
 *
 * A page reports to two properties, not one:
 *
 * - **The roll-up**, `GA_MEASUREMENT_ID`, which every page of every city sends
 *   to. It is the only place the whole site can be seen at once — the total,
 *   and the front page → city page path, which no per-city property can see
 *   because the two halves of it live in different properties.
 * - **The city's own**, from its `event` document in Sanity. A chapter runs its
 *   own DevFest and wants its own numbers; GA4 has no way to give somebody
 *   access to part of a property, so "only Kansai's organisers see Kansai" has
 *   to mean a property of their own. See `src/tenants/types.ts`.
 *
 * Either may be absent. A city with no id of its own still reports to the
 * roll-up, and a build with no roll-up still reports a city to its own
 * property — which is what lets a chapter set theirs up in the Studio without
 * waiting on anybody.
 *
 * Functions rather than constants, for the reason `src/lib/sanity/env.ts` gives
 * at length: the draft preview runs in a Cloudflare Worker, which evaluates its
 * modules once at isolate start, outside any request. Nothing here is read
 * there — the preview is deliberately not measured — but the two modules are
 * read side by side and disagreeing about this would be a trap for whoever adds
 * the third.
 */

/**
 * GA4's own shape. Universal Analytics' `UA-…` and the Tag Manager's `GTM-…`
 * are the two things someone will actually paste in by mistake, and neither
 * one works with `gtag('config', …)`.
 */
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/;

/**
 * The id, or a thrown error naming where the bad one came from.
 *
 * Throwing rather than quietly measuring nothing is the same call
 * `src/i18n/language.ts` makes about an unknown `SITE_LANG`. A property that
 * has silently collected no data for a month is a worse outcome than a red
 * build, because nobody finds out until they go looking for the numbers — and
 * `gtag('config', …)` does exactly nothing with an id of the wrong kind rather
 * than complaining about it.
 *
 * `source` is what the reader has to go and edit, so it is a sentence fragment
 * rather than a variable name: the two callers are an environment variable and
 * a field in the Studio, and only one of them is in this repository.
 */
/**
 * Whether this is a GA4 measurement id.
 *
 * The predicate and not the throwing form below is what a validator wants:
 * `parseEvent` collects every problem with an `event` document into one error
 * naming all of them, and in the draft preview it reports them rather than
 * failing the render at all (`src/preview/problems.ts`). A throw from inside a
 * zod refinement escapes `safeParse` and does neither.
 */
export const isMeasurementId = (raw: string): boolean =>
  MEASUREMENT_ID.test(raw.trim());

export function checkedMeasurementId(raw: string, source: string): string {
  const id = raw.trim();

  if (!isMeasurementId(id)) {
    throw new Error(
      `${source} is "${id}", which is not a GA4 measurement id. ` +
        `Expected the form "G-XXXXXXXXXX" — a Universal Analytics property ` +
        `("UA-…") or a Tag Manager container ("GTM-…") will not work here. ` +
        `Leave it unset to report to nothing.`,
    );
  }

  return id;
}

/**
 * The property the whole site reports to, or `undefined` for a build that
 * reports to no such thing.
 */
export function rollupMeasurementId(): string | undefined {
  const raw = process.env.GA_MEASUREMENT_ID?.trim();
  if (!raw) return undefined;

  return checkedMeasurementId(raw, "GA_MEASUREMENT_ID");
}

/**
 * Every property this page reports to, in the order `gtag('config', …)` is
 * called for them.
 *
 * The roll-up leads, because the first id is also the one in the loader's URL
 * and the site-wide property is the one that is always the same tag across the
 * whole site — but nothing depends on the order beyond that.
 *
 * Deduplicated, and that is not hypothetical tidiness: a chapter setting their
 * field up in the Studio has the site-wide id in front of them in the README,
 * and pasting that one would otherwise send every hit to it twice and double
 * their own numbers.
 *
 * @param cityId The city's own id, from its `event` document. Absent on the
 *   front page, which belongs to no city.
 */
export function measurementIds(cityId?: string): string[] {
  const city =
    cityId && checkedMeasurementId(cityId, "A city's Measurement ID");

  return [...new Set([rollupMeasurementId(), city || undefined])].filter(
    (id): id is string => id !== undefined,
  );
}
