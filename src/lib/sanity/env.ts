/**
 * Sanity is opt-in. With no `SANITY_PROJECT_ID` in the environment the site
 * builds exactly as before, from the Markdown in `src/content/<tenant>/`.
 *
 * That switch is the whole migration story: content collections, the tenant
 * config and the speaker photos each pick their source from this one flag, so a
 * city can move to the CMS without the other city moving with it.
 */

export const projectId = process.env.SANITY_PROJECT_ID?.trim() || undefined;
export const dataset = process.env.SANITY_DATASET?.trim() || "production";
export const apiVersion =
  process.env.SANITY_API_VERSION?.trim() || "2026-01-01";

/** Only needed to read drafts. Public content does not require a token. */
export const readToken = process.env.SANITY_READ_TOKEN?.trim() || undefined;

export const sanityEnabled = Boolean(projectId);
