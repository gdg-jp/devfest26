import { eventDates } from "./eventDates";
import { previewMode } from "../preview/mode";
import { report } from "../preview/problems";
import { fromSanityIfEnabled } from "./source";
import type { LocalTenantId } from "./ids";
import { registry } from "./registry";
import { selectedCities, strictTenants } from "./selection";
import type { TenantConfig } from "./types";

/**
 * A city's configuration, resolved and expanded.
 *
 * This used to be a singleton — one module, one city, decided by an
 * environment variable — because one build produced one city. A build now
 * produces several, so the city arrives as an argument and travels down as a
 * prop. `src/pages/[tenant]/index.astro` is where it enters.
 */

/**
 * "DevFest 2026 in Kansai" → "Kansai". The top bar sets the city name beside
 * the logo, where the full title has no room, so it is derived from `titleEn`
 * rather than being one more field every city has to keep in sync.
 */
function editionEn(config: TenantConfig): string {
  const match = /\bin\s+(.+)$/i.exec(config.titleEn.trim());
  if (match) return match[1].trim();

  // A city that titles itself some other way still gets a usable label.
  return config.tenant.charAt(0).toUpperCase() + config.tenant.slice(1);
}

/**
 * Expands a tenant config into what the components actually read: the raw
 * fields plus every date label derived from `startsAt` / `endsAt`.
 */
function resolve(config: TenantConfig) {
  const { social, ...event } = config.event;

  return {
    ...config,
    editionEn: editionEn(config),
    event: {
      ...event,
      ...eventDates(config.event.startsAt, config.event.endsAt),
      social: social && { ...social, hours: `${social.start} – ${social.end}` },
    },
  };
}

export type ResolvedTenant = ReturnType<typeof resolve>;

const resolved = new Map<string, Promise<ResolvedTenant>>();

/**
 * One city's full configuration — tier 2, in the language of
 * `src/tenants/discovery.ts`.
 *
 * Throws when the CMS has no complete `event` document for the slug. That is
 * the intended failure: a city whose configuration is half-written has no
 * business rendering a page that reads "undefined", and in CI the throw is
 * what keeps the previously published copy of that city in place.
 *
 * Memoised per slug — a dozen components ask for the same city, and each ask
 * would otherwise be a network read.
 *
 * Not in the preview. A build runs once and one answer is the right answer; a
 * Worker isolate answers requests for hours, and a map filled on the first of
 * them would show that city's name and dates until the isolate was recycled.
 * The reads it saves are already saved there — every one of them comes out of
 * the snapshot in `src/preview/drafts.ts`, which is fetched once per render.
 */
export function resolveTenant(slug: string): Promise<ResolvedTenant> {
  if (previewMode) return load(slug);

  let found = resolved.get(slug);
  if (!found) {
    found = load(slug);
    resolved.set(slug, found);
  }
  return found;
}

async function load(slug: string): Promise<ResolvedTenant> {
  const fromCms = await fromSanityIfEnabled(slug);
  if (fromCms) return resolve(fromCms);

  const local = registry[slug as LocalTenantId];
  if (!local) {
    throw new Error(
      `No configuration for the city "${slug}". Add src/tenants/${slug}.ts, ` +
        `or set SANITY_PROJECT_ID to read it from the CMS.`,
    );
  }

  return resolve(local);
}

export interface BuildableCity {
  slug: string;
  site: ResolvedTenant;
}

let buildable: Promise<BuildableCity[]> | undefined;

/**
 * The cities this build both was asked for and can actually render.
 *
 * Every route's `getStaticPaths` reads this one list, so they cannot disagree
 * about which cities exist. A city whose configuration does not validate is
 * dropped here rather than in each of them — with `STRICT_TENANTS` set it
 * takes the build down instead, which is what a CI city job wants.
 */
export function buildableCities(): Promise<BuildableCity[]> {
  if (previewMode) return collect();

  buildable ??= collect();
  return buildable;
}

async function collect(): Promise<BuildableCity[]> {
  const slugs = await selectedCities();
  const cities: BuildableCity[] = [];

  for (const slug of slugs) {
    try {
      cities.push({ slug, site: await resolveTenant(slug) });
    } catch (error) {
      if (strictTenants) throw error;

      const why = error instanceof Error ? error.message : String(error);

      // Local builds render the cities that are ready and say why the others
      // are missing. CI never takes this branch.
      console.warn(`[tenants] Skipping "${slug}": ${why}`);

      // In the preview the console is a Cloudflare log nobody has open, and
      // the person who left that document half-written is the one looking at
      // the page it is missing from.
      report("cities", `"${slug}" has no page: ${why}`);
    }
  }

  return cities;
}
