/**
 * Sanity is opt-in. With no `SANITY_PROJECT_ID` in the environment the site
 * builds exactly as before, from the Markdown in `src/content/<tenant>/`.
 *
 * That switch is the whole migration story: content collections, the tenant
 * config and the speaker photos each pick their source from this one flag, so a
 * city can move to the CMS without the other city moving with it.
 *
 * Functions rather than constants, and that is not a style choice. The draft
 * preview reads Sanity at request time from a Cloudflare Worker, where
 * `process.env` is filled from the Worker's vars and secrets — but a Worker
 * evaluates its modules once, at isolate start, outside any request. A constant
 * read at module scope there would capture whatever was set before the first
 * request, which is not guaranteed to be anything. Reading on each call is
 * cheap and cannot be wrong.
 */

export const projectId = () =>
  process.env.SANITY_PROJECT_ID?.trim() || undefined;

export const dataset = () => process.env.SANITY_DATASET?.trim() || "production";

export const apiVersion = () =>
  process.env.SANITY_API_VERSION?.trim() || "2026-01-01";

/** Only needed to read drafts. Public content does not require a token. */
export const readToken = () =>
  process.env.SANITY_READ_TOKEN?.trim() || undefined;

export const sanityEnabled = () => Boolean(projectId());
