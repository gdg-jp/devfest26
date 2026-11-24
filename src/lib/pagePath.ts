/**
 * The form a page's URL takes: `/kansai/` on the published site, `/kansai` in
 * the draft preview.
 *
 * The published site is GitHub Pages, which serves `kansai/index.html` at
 * `/kansai/` and answers `/kansai` with a 301 to it. Every URL the site writes
 * for a page — its links, its canonical, its hreflang alternates, the sitemap
 * the publish job derives from those — has to be that one. A canonical that
 * names a URL which redirects back to the page declaring it is a contradiction
 * Google settles by indexing neither form reliably, and that is what the site
 * did while it wrote `/kansai`.
 *
 * The draft preview is the exception, and stays slashless. Its gate
 * (`preview/src/index.ts`) and its asset router (`html_handling:
 * "drop-trailing-slash"` in `preview/wrangler.jsonc`) both strip the slash, and
 * the Studio it serves relies on that; Astro redirecting the other way would
 * be a loop. The preview is behind a sign-in and never indexed, so nothing is
 * lost by it differing.
 *
 * Dependency-free apart from `previewMode`, and imported with its `.ts`
 * extension, for the reason `src/i18n/language.ts` gives: that file needs it,
 * and runs outside Vite.
 */
import { previewMode } from "../preview/mode.ts";

/** What `astro.config.ts` sets `trailingSlash` to. */
export const trailingSlash: "always" | "never" = previewMode
  ? "never"
  : "always";

/**
 * A page's path in this deployment's form, with any `?query` or `#anchor` kept
 * after it. Only for pages: a file (`/kansai/favicon.svg`) is already in its
 * one form and is never passed here.
 */
export function pagePath(path: string): string {
  const split = path.search(/[?#]/);
  const pathname = split === -1 ? path : path.slice(0, split);
  const rest = split === -1 ? "" : path.slice(split);

  const bare = pathname.replace(/\/+$/, "");
  if (bare === "") return `/${rest}`;
  return `${bare}${trailingSlash === "always" ? "/" : ""}${rest}`;
}

/** The same page whichever form it is written in — for comparing two paths. */
export const samePage = (a: string, b: string) =>
  a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
