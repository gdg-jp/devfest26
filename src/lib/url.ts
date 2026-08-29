/**
 * Internal links, aware of where this build is mounted.
 *
 * The city sites are not at the origin root: they are assembled under
 * `/kansai` and `/tokyo` on one host, so `base` is set per build (see
 * `astro.config.ts`). Astro does not rewrite hrefs, so a root-absolute path
 * written by hand would point outside its own site. Every one of them goes
 * through here instead.
 *
 * `import.meta.env.BASE_URL` is `/` for the portal build and `/kansai` for a
 * city, but the trailing slash has varied across Astro versions — normalising
 * both ends here keeps callers from having to care.
 */

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Trailing slashes are stripped to match `trailingSlash: "never"`. */
const normalize = (href: string) =>
  href.length > 1 ? href.replace(/\/$/, "") : href || "/";

/**
 * Prefixes a root-absolute path with this build's base. Anything else — a
 * `#anchor`, an external URL — is already correct and passes through.
 */
export const withBase = (path: string) =>
  path.startsWith("/") ? normalize(base + path) : path;

/**
 * This site's home page: `/` for the portal, `/kansai` for a city.
 *
 * Also the prefix for the section anchors in the nav, which resolve only on
 * the home page and so have to travel there first from a detail page.
 */
export const home = withBase("/");

/** True on the home page, whether that is `/` or `/kansai`. */
export const isHome = (url: URL) => normalize(url.pathname) === home;
