import type { Loader } from "astro/loaders";
import { sanityClient } from "../lib/sanity/client";

export interface SanityEntry {
  /** Unique within the collection. Sessions reference speakers by this. */
  id: string;
  data: Record<string, unknown>;
  /** Prose, already converted from Portable Text. Always set, possibly ''. */
  html: string;
  /** The same prose as plain text. Speaker bios read this, not `rendered`. */
  body: string;
}

interface Options {
  /** Appears in build logs, e.g. "sanity:sessions". */
  label: string;
  /**
   * GROQ returning an array of documents. `$tenants` is bound for you when the
   * collection is city-scoped.
   */
  query: string;
  /**
   * The cities this build is producing, resolved when the loader runs.
   *
   * A thunk rather than a list because discovering them is a network read and
   * the collections are defined long before anything is loaded. Omit entirely
   * for a collection that belongs to no city — see EXTERNAL_EVENTS.
   */
  tenants?: () => Promise<string[]>;
  toEntry: (doc: never) => SanityEntry;
}

/**
 * A content-layer loader over Sanity.
 *
 * The collections keep the same zod schemas they had with `glob()`: this runs
 * every document through `parseData`, so a document that a Studio editor left
 * half-filled fails the build in the same way a bad frontmatter field does.
 *
 * `rendered.html` is populated here, which is what lets `render(entry)` and
 * `<Content />` keep working without any component knowing about Sanity.
 */
export function sanityLoader({
  label,
  query,
  tenants,
  toEntry,
}: Options): Loader {
  return {
    name: `sanity:${label}`,

    load: async ({ store, parseData, generateDigest, logger }) => {
      const scope = tenants ? await tenants() : undefined;
      const docs = await sanityClient().fetch<never[]>(
        query,
        scope ? { tenants: scope } : {},
      );

      // A full replace: entries deleted in the Studio have to disappear here
      // too, and there is no cheap way to diff against the previous run.
      store.clear();

      for (const doc of docs) {
        const { id, data, html, body } = toEntry(doc);
        store.set({
          id,
          data: await parseData({ id, data }),
          body,
          digest: generateDigest(doc),
          rendered: { html },
        });
      }

      logger.info(
        scope
          ? `${docs.length} ${label} for ${scope.join(", ") || "(no city)"}`
          : `${docs.length} ${label}`,
      );
    },
  };
}
