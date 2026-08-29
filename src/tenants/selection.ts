/**
 * What this build was asked to produce.
 *
 * One `astro build` can emit the front page and every city at once. `TARGETS`
 * narrows it to a subset:
 *
 *     pnpm build                  # the front page and every city
 *     TARGETS=kansai pnpm build   # just /kansai
 *     TARGETS=portal pnpm build   # just the front page
 *
 * CI runs one job per target, which is the whole point of the variable: a
 * process that never loads Tokyo's data cannot be brought down by it, and a
 * job that fails uploads no artifact, so the publish step leaves that city's
 * previously published pages exactly where they are.
 *
 * Everything above the `selectedCities` line is synchronous, because
 * `astro.config.ts` reads it before anything else loads.
 */

import { sanityEnabled } from "../lib/sanity/env";
import { discoverCitySlugs } from "./discovery";
import { DEFAULT_TENANT, LOCAL_TENANT_IDS, PORTAL_TARGET } from "./ids";

const raw = process.env.TARGETS?.trim();

/**
 * The requested targets, or `undefined` for "everything this build can make".
 * `portal` is a target like a city is, and names the root page.
 */
const requested: string[] | undefined = raw
  ? raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  : undefined;

/** Whether the root page — the list of every city — is part of this build. */
export const portalSelected = !requested || requested.includes(PORTAL_TARGET);

/** The city slugs asked for, or `undefined` for "whichever ones exist". */
const requestedCities = requested?.filter((t) => t !== PORTAL_TARGET);

/** True when this build produces no city at all. */
export const noCities = requestedCities?.length === 0;

/** The complement, for the routes that only exist when a city does. */
export const anyCity = !noCities;

/**
 * The one city this build is entirely about, if it is exactly one and there is
 * no front page alongside it — the shape every CI city job takes.
 *
 * Worth knowing separately because such a build is self-contained under
 * `/<slug>/`, so its bundled assets go there too rather than to the shared
 * root. See `build.assets` in `astro.config.ts`.
 */
export const soleCity =
  !portalSelected && requestedCities?.length === 1
    ? requestedCities[0]
    : undefined;

/**
 * Output and cache directory name. Distinct per target set, because the
 * content store is keyed by collection name and would otherwise carry one
 * build's cities into the next one's.
 */
export const targetKey = requested
  ? [...requested]
      .sort()
      .join("-")
      .replace(/[^A-Za-z0-9._-]/g, "_")
  : "all";

/**
 * Whether a city whose configuration does not validate should fail the build.
 *
 * On in CI, where a city job going red is exactly the signal the publish step
 * reads as "leave that city alone". Off locally, where one half-written city
 * should not stop you looking at the other one.
 */
export const strictTenants = Boolean(process.env.STRICT_TENANTS?.trim());

/**
 * Markdown builds are one city at a time.
 *
 * The Markdown loaders read a single directory, and the entry ids inside it
 * are bare file names — `tracks/a.md` is what makes `track: a` resolve. Two
 * cities in one store would collide on those ids, so rather than rewrite forty
 * files to carry a prefix, a build with no CMS behind it takes one city.
 */
export const LOCAL_TENANT: string = (() => {
  if (sanityEnabled) return requestedCities?.[0] ?? DEFAULT_TENANT;

  const asked = requestedCities;
  if (!asked || asked.length === 0) return DEFAULT_TENANT;

  if (asked.length > 1) {
    throw new Error(
      `TARGETS names ${asked.length} cities (${asked.join(", ")}), but a build ` +
        `with no SANITY_PROJECT_ID reads content from one directory and can only ` +
        `produce one city. Build them one at a time.`,
    );
  }

  if (!(LOCAL_TENANT_IDS as readonly string[]).includes(asked[0])) {
    throw new Error(
      `Unknown city "${asked[0]}". Without Sanity the cities are the ones in ` +
        `src/tenants/: ${LOCAL_TENANT_IDS.join(", ")}.`,
    );
  }

  return asked[0];
})();

let cached: Promise<string[]> | undefined;

/**
 * The cities this build actually emits pages for.
 *
 * This is the list the content loaders scope their queries to, so a city that
 * is not in it has none of its documents fetched at all — the structural
 * separation the per-city Markdown directories used to give, moved into the
 * query.
 */
export function selectedCities(): Promise<string[]> {
  cached ??= resolveCities();
  return cached;
}

async function resolveCities(): Promise<string[]> {
  if (requestedCities?.length === 0) return [];

  // Without a CMS there is one city and `LOCAL_TENANT` has already checked it.
  if (!sanityEnabled) return [LOCAL_TENANT];

  const known = await discoverCitySlugs();
  if (!requestedCities) return known;

  for (const slug of requestedCities) {
    if (!known.includes(slug)) {
      throw new Error(
        `TARGETS asks for "${slug}", which is not a city in Sanity. ` +
          `Published events: ${known.join(", ") || "(none)"}.`,
      );
    }
  }

  return requestedCities;
}
