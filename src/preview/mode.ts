/**
 * Whether this build is the draft preview rather than the published site.
 *
 * The published site is static files on GitHub Pages: every page is rendered
 * once, at build time, from published content. The preview is the same code
 * rendered per request from the *drafts*, so that reloading a page shows what
 * the Studio has in it right now. One flag picks between the two, and it
 * reaches four kinds of decision:
 *
 * - `astro.config.ts` builds for a server rather than for a directory of files,
 *   and injects the routes that only the preview has;
 * - the content collections register empty and the data is read at request
 *   time instead — see `src/preview/drafts.ts`;
 * - the caches that are correct for a one-shot build (`resolveTenant`,
 *   `buildableCities`, `discoverCities`) would freeze a Worker isolate on the
 *   first draft it ever saw, so they are switched off;
 * - the checks that correctly fail a production build — a session with no
 *   speakers yet, a reference typed halfway — drop the entry and say so
 *   instead. See `src/preview/problems.ts`.
 *
 * `__PREVIEW__` is substituted at build time (see `vite.define` in
 * `astro.config.ts`), so the branches taken by the published build are dead
 * code there and are removed rather than shipped. The `process.env` fallback is
 * for the two places that run outside Vite: `astro.config.ts` itself, and
 * `scripts/discover-targets.mjs`, which runs this tree on a bare checkout.
 */

declare const __PREVIEW__: boolean | undefined;

export const previewMode: boolean =
  typeof __PREVIEW__ === "boolean"
    ? __PREVIEW__
    : Boolean(process.env.PREVIEW?.trim());
