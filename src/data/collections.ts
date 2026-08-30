import { getCollection, type CollectionEntry } from "astro:content";
import type { CollectionName } from "./schemas";
import { previewMode } from "../preview/mode";
import { draftCollection } from "../preview/drafts";

/**
 * Reading a city-scoped collection.
 *
 * One build holds several cities in one content store, so `getCollection` on
 * its own returns the wrong thing — everyone's sessions, not this city's.
 * Every read goes through here instead, and the filter exists in exactly one
 * place rather than at a dozen call sites where one could be forgotten.
 *
 * The store is already narrower than the whole CMS: the queries fetch only the
 * cities this build was asked for, so a job building one city has nothing else
 * in it to filter out. This is the second line, for the builds that do hold
 * several — `pnpm build` with no `TARGETS`, and the dev server.
 *
 * Being the only way in is also what made the draft preview a small change.
 * There is no store there — the content is fetched while the page is being
 * rendered — and `entries` below is the single seam where that swap happens.
 */

/** The collections that belong to a city. `externalEvents` does not. */
export type CityCollection =
  | "speakers"
  | "tracks"
  | "sessions"
  | "talks"
  | "meetups"
  | "partners"
  | "about"
  | "photos";

const tenantOf = (entry: { data: Record<string, unknown> }) =>
  entry.data.tenant as string;

/**
 * Every entry in one collection, from whichever source this build reads.
 *
 * In the preview the collections are registered empty on purpose (see
 * `src/content.config.ts`), so a read that somehow missed this seam would show
 * nothing rather than showing a build-time copy of the same content. Empty is
 * noticeable; stale is not.
 */
export async function entries<C extends CollectionName>(
  name: C,
): Promise<CollectionEntry<C>[]> {
  return previewMode ? draftCollection(name) : getCollection(name);
}

/** Every entry in one collection that belongs to one city. */
export async function byTenant<C extends CityCollection>(
  name: C,
  tenant: string,
): Promise<CollectionEntry<C>[]> {
  return (await entries(name)).filter((entry) => tenantOf(entry) === tenant);
}

/**
 * The same split, keeping what was filtered out.
 *
 * `reference()` resolves by entry id and knows nothing about cities, so a
 * session in one city can name a speaker in another and the id will exist.
 * Filtering alone turns that into "unknown speaker", which sends whoever hit
 * it looking for a typo that is not there. `src/data/program.ts` uses the
 * discarded half to say what actually happened.
 */
export async function partitionByTenant<C extends CityCollection>(
  name: C,
  tenant: string,
): Promise<{ mine: CollectionEntry<C>[]; foreign: CollectionEntry<C>[] }> {
  const mine: CollectionEntry<C>[] = [];
  const foreign: CollectionEntry<C>[] = [];

  for (const entry of await entries(name)) {
    (tenantOf(entry) === tenant ? mine : foreign).push(entry);
  }

  return { mine, foreign };
}
