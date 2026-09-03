/**
 * Which cities exist, according to the CMS.
 *
 * This is the module that replaced a hard-coded list. With Sanity on, a city
 * exists because someone published an `event` document for it — nothing in
 * this repository names it. `.github/workflows/build.yml` asks this module
 * what to build, `src/tenants/selection.ts` asks it what a `TARGETS` value is
 * allowed to mean, and the front page asks it what to list.
 *
 * Two rules shape what is in here:
 *
 * 1. **No dependencies.** Plain `fetch` rather than `@sanity/client`, and
 *    hand-written checks rather than zod, so `scripts/discover-targets.mjs`
 *    can run this on a bare checkout with no `pnpm install` behind it. That is
 *    also why the relative imports carry their `.ts` extension: Vite does not
 *    need it, but Node's ESM resolver does.
 *
 * 2. **Tier 1 only.** What comes back is exactly what a front-page card shows
 *    — slug, title, theme, dates, venue — and nothing else. The rest of a
 *    city's configuration is tier 2, validated in `src/tenants/fromSanity.ts`
 *    when that city's own pages are built. Keeping the two apart is what lets
 *    the front page stay green while one city's configuration is broken: the
 *    card still points at `/kansai`, and the copy of `/kansai` already on the
 *    publish branch is still there to answer it.
 */

import { themes, type Theme } from "../data/themes.ts";
import {
  apiVersion,
  dataset,
  projectId,
  readToken,
  sanityEnabled,
} from "../lib/sanity/env.ts";
import { previewMode } from "../preview/mode.ts";
import { reject, report } from "../preview/problems.ts";
import { LOCAL_TENANT_IDS, PORTAL_TARGET } from "./ids.ts";

/** Everything the front page needs to draw a card for a city. */
export interface CityCard {
  /** Also the path segment: this city lives at `/<slug>`. */
  slug: string;
  title: string;
  theme: Theme;
  startsAt: string;
  endsAt: string;
  venue: { name: string; city: string; region: string };
  isPublic?: boolean;
}

/**
 * The tier-1 projection. Deliberately short: every field here is one a card
 * prints, so a document missing any of them has nothing to show.
 */
const CITY_QUERY = `*[_type == "event" && coalesce(isPublic, true) == true] | order(startsAt asc){
  "slug": slug.current,
  title, theme, startsAt, endsAt,
  "venue": { "name": venue.name, "city": venue.city, "region": venue.region }
}`;

type Unknown = Record<string, unknown>;

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

/**
 * A timestamp the card can actually print.
 *
 * Checked here rather than left to the formatter, because a date that only
 * fails when it is rendered would take the whole front page down over one
 * mistyped field — the opposite of what tier 1 is for.
 */
const timestamp = (value: unknown): string | undefined => {
  const raw = str(value);
  return raw && !Number.isNaN(new Date(raw).getTime()) ? raw : undefined;
};

/**
 * Tier 1, by hand.
 *
 * Returns the problems rather than throwing, because the caller's answer
 * differs: discovery drops the city with a warning and carries on, since one
 * unfinished draft in the Studio must not take the whole front page down.
 */
function readCard(doc: unknown): { card: CityCard } | { problems: string[] } {
  const problems: string[] = [];
  const d = (doc ?? {}) as Unknown;
  const venue = (d.venue ?? {}) as Unknown;

  const slug = str(d.slug);
  const title = str(d.title);
  const startsAt = timestamp(d.startsAt);
  const endsAt = timestamp(d.endsAt);
  const name = str(venue.name);
  const city = str(venue.city);
  const region = str(venue.region);
  const theme = str(d.theme);

  if (!slug) problems.push("slug is missing");
  if (!title) problems.push("title is missing");
  if (!startsAt) problems.push("startsAt is missing or not a date");
  if (!endsAt) problems.push("endsAt is missing or not a date");
  if (!name) problems.push("venue.name is missing");
  if (!city) problems.push("venue.city is missing");
  if (!region) problems.push("venue.region is missing");
  if (!theme || !(theme in themes))
    problems.push(
      `theme must be one of ${Object.keys(themes).join(", ")}, got ${
        theme ? `"${theme}"` : "nothing"
      }`,
    );

  if (slug === PORTAL_TARGET)
    problems.push(
      `"${PORTAL_TARGET}" is the front page's own path and cannot be a city slug`,
    );

  if (problems.length > 0) return { problems };

  return {
    card: {
      slug: slug!,
      title: title!,
      theme: theme as Theme,
      startsAt: startsAt!,
      endsAt: endsAt!,
      venue: { name: name!, city: city!, region: region! },
      isPublic: d.isPublic !== false,
    },
  };
}

/** The Sanity query endpoint, without the client library. */
async function query<T>(groq: string): Promise<T> {
  const token = readToken();
  const perspective = token ? "drafts" : "published";
  const url =
    `https://${projectId()}.api.sanity.io/v${apiVersion()}/data/query/${dataset()}` +
    `?perspective=${perspective}&query=${encodeURIComponent(groq)}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(
      `Sanity refused the city query (${response.status} ${response.statusText}). ` +
        `Check SANITY_PROJECT_ID and SANITY_DATASET.`,
    );
  }

  const body = (await response.json()) as { result?: T };
  if (body.result === undefined)
    throw new Error("Sanity returned no result for the city query.");

  return body.result;
}

let cached: Promise<CityCard[]> | undefined;

/**
 * Every city, in date order.
 *
 * Not filtered by what this build was asked to produce: the front page lists
 * cities it is not building, because their pages are already published and a
 * card that disappeared whenever a build was scoped would be a worse lie than
 * a card pointing at last week's copy.
 *
 * The memo is right for a build, which runs once and wants one answer. It is
 * wrong for the draft preview, which runs inside a Worker isolate that outlives
 * many requests: the first list of cities it ever saw would be the only one it
 * ever showed. There the cities come out of the same snapshot as everything
 * else on the page — see `src/preview/drafts.ts`.
 */
export function discoverCities(): Promise<CityCard[]> {
  if (previewMode) return draftCities();
  cached ??= sanityEnabled() ? fromSanity() : fromRegistry();
  return cached;
}

/**
 * Imported for its side effects only when the preview asks. `discovery.ts` runs
 * on a bare checkout under `scripts/discover-targets.mjs`, with no
 * `node_modules` to resolve a Sanity client from, so the import may not be a
 * static one.
 */
async function draftCities(): Promise<CityCard[]> {
  const { draftEvents } = await import("../preview/drafts.ts");
  return keepValid(await draftEvents());
}

/**
 * Runs candidate documents through tier 1, keeping the ones that pass and
 * saying why the others were dropped.
 *
 * Both sources go through here, and that matters: the front page has to
 * survive a city whose dates are half-typed whichever source it came from.
 */
function keepValid(docs: unknown[]): CityCard[] {
  const cards: CityCard[] = [];

  for (const doc of docs) {
    const read = readCard(doc);
    if ("card" in read) {
      cards.push(read.card);
      continue;
    }

    // Named by whatever it does have, so the warning is actionable even when
    // the slug is the missing field.
    const label =
      str((doc as Unknown).slug) ?? str((doc as Unknown).title) ?? "(untitled)";
    console.warn(
      `[discovery] Leaving "${label}" off the front page:\n` +
        read.problems.map((p) => `  ${p}`).join("\n"),
    );

    // `report`, not `reject`: dropping a half-written city is the *correct*
    // behaviour in every mode — tier 1 exists so that one unfinished draft
    // cannot take the front page down. The preview only wants the same warning
    // somewhere an editor will actually see it.
    report(
      "cities",
      `"${label}" is not on the front page: ${read.problems.join("; ")}.`,
    );
  }

  return uniqueSlugs(cards);
}

async function fromSanity(): Promise<CityCard[]> {
  return keepValid(await query<unknown[]>(CITY_QUERY));
}

/**
 * The Markdown fallback. Imported lazily and by name, so the CI script — which
 * only ever asks for slugs — never loads the tenant configs.
 */
async function fromRegistry(): Promise<CityCard[]> {
  const { registry } = await import("./registry");

  const docs = LOCAL_TENANT_IDS.map((id) => {
    const { tenant, title, theme, event } = registry[id];
    return {
      slug: tenant,
      title,
      theme,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venue: {
        name: event.venue.name,
        city: event.venue.city,
        region: event.venue.region,
      },
    };
  });

  return keepValid(docs).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Just the slugs, and the only entry point that survives on a bare checkout.
 *
 * `scripts/discover-targets.mjs` calls this to build the CI matrix, where
 * there is no `node_modules` and nothing to render — so it must not touch the
 * registry, whose imports are resolved by the bundler rather than by Node.
 */
export async function discoverCitySlugs(): Promise<string[]> {
  if (!sanityEnabled()) return [...LOCAL_TENANT_IDS];
  return (await discoverCities()).map((city) => city.slug);
}

/**
 * Two cities on one slug would be one city with the other's pages overwriting
 * it, silently and by whichever the build wrote last.
 */
function uniqueSlugs(cards: CityCard[]): CityCard[] {
  const seen = new Set<string>();
  const kept: CityCard[] = [];

  for (const card of cards) {
    if (seen.has(card.slug)) {
      reject(
        "cities",
        `Two "event" documents share the slug "${card.slug}". Give one of them its own.`,
      );
      continue;
    }
    seen.add(card.slug);
    kept.push(card);
  }

  return kept;
}
