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
  /** GROQ returning an array of documents. `$tenant` is bound for you. */
  query: string;
  tenant: string;
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
  tenant,
  toEntry,
}: Options): Loader {
  return {
    name: `sanity:${label}`,

    load: async ({ store, parseData, generateDigest, logger }) => {
      const docs = await sanityClient().fetch<never[]>(query, { tenant });

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

      logger.info(`${docs.length} ${label} for "${tenant}"`);
    },
  };
}
