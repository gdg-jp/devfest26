/**
 * Internal links.
 *
 * Every city is mounted on a path of its own — `/kansai`, `/tokyo` — under the
 * one origin the front page sits at. That used to be Astro's `base`, one value
 * per build. A single build now emits all of them, so the prefix is the city
 * rather than the build, and it is written here rather than by hand: a
 * root-absolute path typed into a component would point at whichever city
 * happened to be first.
 *
 * The old `withBase` is deliberately gone rather than kept as a no-op. Every
 * call site had to be revisited, and a function that silently did nothing
 * would have let one be missed.
 */

/** Trailing slashes are stripped to match `trailingSlash: "never"`. */
const normalize = (href: string) =>
  href.length > 1 ? href.replace(/\/$/, "") : href || "/";

/**
 * A city's home page: `/kansai`.
 *
 * Also the prefix for the section anchors in the nav, which resolve only on
 * the home page and so have to travel there first from a detail page.
 */
export const tenantHome = (tenant: string) => `/${tenant}`;

/**
 * A path inside one city. Anything that is not root-absolute — a `#anchor`, an
 * external URL — is already correct and passes through.
 */
export const tenantPath = (tenant: string, path: string) =>
  path.startsWith("/") ? normalize(`/${tenant}${path}`) : path;

/** True on that city's home page. */
export const isHome = (url: URL, tenant: string) =>
  normalize(url.pathname) === tenantHome(tenant);
