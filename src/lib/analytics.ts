/**
 * Google Analytics is opt-in, the same way Sanity is.
 *
 * With no `GA_MEASUREMENT_ID` in the environment nothing is emitted at all —
 * not a script tag, not a preconnect. That is what keeps local builds and pull
 * request builds out of the numbers without anyone having to remember: the
 * measurement id is a repository variable, so it reaches the production
 * workflow and nowhere else. See `.github/workflows/build.yml`.
 *
 * A function rather than a constant, for the reason `src/lib/sanity/env.ts`
 * gives at length: the draft preview runs in a Cloudflare Worker, which
 * evaluates its modules once at isolate start, outside any request. Nothing
 * here is read there — the preview is deliberately not measured — but the two
 * modules are read side by side and disagreeing about this would be a trap for
 * whoever adds the third.
 */

/**
 * GA4's own shape. Universal Analytics' `UA-…` and the Tag Manager's `GTM-…`
 * are the two things someone will actually paste in by mistake, and neither
 * one works with `gtag('config', …)`.
 */
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/;

/**
 * The property this build reports to, or `undefined` for a build that reports
 * to nothing.
 *
 * Throws on an id that is set but malformed, rather than quietly measuring
 * nothing — the same call `src/i18n/language.ts` makes about an unknown
 * `SITE_LANG`. A site that has silently collected no data for a month is a
 * worse outcome than a red build, because nobody finds out until they go
 * looking for the numbers.
 */
export function measurementId(): string | undefined {
  const raw = process.env.GA_MEASUREMENT_ID?.trim();
  if (!raw) return undefined;

  if (!MEASUREMENT_ID.test(raw)) {
    throw new Error(
      `GA_MEASUREMENT_ID is "${raw}", which is not a GA4 measurement id. ` +
        `Expected the form "G-XXXXXXXXXX" — a Universal Analytics property ` +
        `("UA-…") or a Tag Manager container ("GTM-…") will not work here. ` +
        `Leave it unset to build with no analytics.`,
    );
  }

  return raw;
}
