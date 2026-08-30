import type { CollectionEntry } from "astro:content";
import { schemaOf, type CollectionName } from "../data/schemas";
import { sanityClient } from "../lib/sanity/client";
import { sources } from "../lib/sanity/sources";
import { everyCity, EVENTS } from "../lib/sanity/queries";
import { parseEvent } from "../tenants/fromSanity";
import type { TenantConfig } from "../tenants/types";
import { recordInto, recording, report, type Recording } from "./problems";

/**
 * The content the preview is rendering, read now rather than at build time.
 *
 * The published site puts every document through the content layer once, into a
 * store on disk, and renders from that. The preview cannot: the whole reason it
 * exists is that "now" moves — an editor saves in the Studio and reloads to see
 * it. So the store is replaced by this, which is the same pipeline with the
 * disk taken out of the middle:
 *
 *     GROQ (src/lib/sanity/queries.ts)
 *       → mapper (src/lib/sanity/entries.ts)
 *       → schema (src/data/schemas.ts)
 *       → an entry of exactly the shape `getCollection` would have returned
 *
 * Nothing downstream can tell the difference. `render(entry)` needs
 * `rendered.html`, which the mappers already produce; `reference()` is a pure
 * `"id" → { id, collection }` transform, so the schemas resolve references here
 * the same way they do in a build. That is why this is a few dozen lines rather
 * than a second copy of the site's data layer.
 *
 * **One query per render.** Every `Q.*` is a standalone GROQ expression, so
 * they compose into a single object projection — nine collections and every
 * city's `event` document in one round trip. A page reads a collection a dozen
 * times (`byTenant` is called by each section), and a fetch apiece would be a
 * page that takes seconds to draw and shows a different moment in each half of
 * itself.
 *
 * **No `$tenants`.** The preview is one deployment holding every city, and
 * binding the scope would need a round trip to discover the cities before the
 * round trip that fetches them. It takes the lot and lets the `tenant` field
 * separate them, which `byTenant` was already doing.
 */

/** One entry, in the shape `getCollection` hands out. */
interface Entry {
  id: string;
  collection: CollectionName;
  data: Record<string, unknown>;
  body: string;
  rendered: { html: string };
}

interface Snapshot {
  /** When it was taken, for `/preview/status`. */
  at: number;
  entries: Map<CollectionName, Entry[]>;
  /** Raw `event` documents. Tier 1 and tier 2 both read these — see `EVENTS`. */
  events: unknown[];
  /**
   * What reading it ran into — a document that does not match its schema, a
   * mapper that threw. It belongs to the snapshot rather than to the request
   * that happened to trigger it, because every request served from this
   * snapshot has the same holes in it.
   */
  problems: Recording;
}

/**
 * How long one snapshot stands.
 *
 * Not a cache in the usual sense — it is the render's unit of consistency. A
 * page asks for its city, its tracks, its sessions, its speakers and its photos
 * separately, and all of them have to describe the same moment in the Studio or
 * the page shows a session whose speaker it also says does not exist. A second
 * is long enough to cover the slowest render and short enough that "save, then
 * reload" always shows the save.
 */
const TTL_MS = 1000;

let taken: Promise<Snapshot> | undefined;
let takenAt = 0;

function snapshot(): Promise<Snapshot> {
  const now = Date.now();
  if (!taken || now - takenAt >= TTL_MS) {
    takenAt = now;
    taken = take().catch((error: unknown) => {
      // A failed fetch must not become the answer for the next second.
      taken = undefined;
      throw error;
    });
  }
  return taken;
}

let batch: string | undefined;

/** Every collection and every `event` document, as one GROQ object. */
function batchQuery(): string {
  batch ??= `{
${Object.entries(sources)
  .map(
    ([key, source]) =>
      `  "${key}": ${source.scoped ? everyCity(source.query) : source.query}`,
  )
  .join(",\n")},
  "events": ${EVENTS}
}`;
  return batch;
}

async function take(): Promise<Snapshot> {
  /*
    Its own recording, opened here rather than inherited from whichever request
    arrived first. One snapshot is read by every request for the next second,
    so a schema failure found while parsing it is not that request's finding —
    it is a property of the content all of them are being shown.
  */
  const found = recording();

  return recordInto(found, async () => {
    const raw =
      await sanityClient().fetch<Record<string, unknown[]>>(batchQuery());

    const entries = new Map<CollectionName, Entry[]>();
    for (const key of Object.keys(sources) as CollectionName[]) {
      entries.set(key, parseAll(key, raw[key] ?? []));
    }

    return {
      at: Date.now(),
      entries,
      events: raw.events ?? [],
      problems: found,
    };
  });
}

/**
 * Documents in, entries out, and anything that does not survive the trip is
 * reported rather than thrown.
 *
 * The published build is right to fail here: a document that does not match its
 * schema would render as a hole in a page nobody is watching. The preview is
 * being watched by the person who is halfway through writing it, and dropping
 * one card is a far better answer than blanking the page they opened to see the
 * other twelve.
 */
function parseAll(name: CollectionName, docs: unknown[]): Entry[] {
  const schema = schemaOf(name);
  const { toEntry } = sources[name];
  const entries: Entry[] = [];

  for (const doc of docs) {
    let mapped;
    try {
      mapped = toEntry(doc as never);
    } catch (error) {
      report(name, `${describe(doc)} could not be read: ${reason(error)}`);
      continue;
    }

    const parsed = schema.safeParse(mapped.data);
    if (!parsed.success) {
      report(
        name,
        `${describe(doc)} is incomplete: ${parsed.error.issues
          .map(
            (issue) => `${issue.path.join(".") || "(root)"} — ${issue.message}`,
          )
          .join("; ")}`,
      );
      continue;
    }

    entries.push({
      id: mapped.id,
      collection: name,
      data: parsed.data as Record<string, unknown>,
      body: mapped.body,
      rendered: { html: mapped.html },
    });
  }

  return entries;
}

/**
 * What to call a document in a message an editor will read.
 *
 * Whatever it does have, in the order that identifies it to a human. A `_id` is
 * a uuid and the last resort, but it is at least what the Studio URL contains.
 */
function describe(doc: unknown): string {
  const d = (doc ?? {}) as Record<string, unknown>;
  const name = [d.slug, d.title, d.name, d._id].find(
    (value) => typeof value === "string" && value.trim(),
  );
  return typeof name === "string" ? `"${name}"` : "a document";
}

const reason = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * One collection, filtered by nothing.
 *
 * The signature `getCollection` has, because it stands in for it — see
 * `src/data/collections.ts`. The cast is the one place this pretends: the
 * entries were built to the same schema `CollectionEntry` is generated from,
 * but nothing in the type system connects a schema to the type Astro derived
 * from it.
 */
export async function draftCollection<C extends CollectionName>(
  name: C,
): Promise<CollectionEntry<C>[]> {
  const { entries } = await snapshot();
  return (entries.get(name) ?? []) as unknown as CollectionEntry<C>[];
}

/** Every `event` document, unvalidated. `src/tenants/discovery.ts` runs tier 1. */
export async function draftEvents(): Promise<unknown[]> {
  return (await snapshot()).events;
}

/**
 * One city's configuration, out of the same snapshot as its content.
 *
 * Throws exactly as `tenantFromSanity` does, because the caller above it
 * already knows what to do with that: `collect()` in `src/tenants/index.ts`
 * drops the city with a warning unless `STRICT_TENANTS` is set, and the preview
 * never sets it.
 */
export async function draftTenant(slug: string): Promise<TenantConfig> {
  const { events } = await snapshot();
  const found = events.find(
    (event) => (event as { tenant?: unknown }).tenant === slug,
  );
  return parseEvent(found, slug);
}

/** When the content on this page was read. */
export async function draftsTakenAt(): Promise<number> {
  return (await snapshot()).at;
}

/**
 * What reading the current snapshot ran into.
 *
 * `/preview/status` merges this with its own walk. The two are separate
 * because they are found at different times by different code: these come out
 * of parsing the documents, the others out of trying to assemble pages from
 * them.
 */
export async function draftProblems(): Promise<Recording> {
  return (await snapshot()).problems;
}
