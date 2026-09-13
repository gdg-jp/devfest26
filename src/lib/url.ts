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
 *
 * The language prefix works the same way, one layer out: `/kansai` in
 * Japanese, `/en/kansai` in English. `langPrefix` is a build constant (see
 * `src/i18n/language.ts`), so every link this build ever writes is already in
 * this build's own language — there is no cross-language link to construct.
 *
 * A handful of root-absolute paths deliberately do *not* go through
 * `tenantPath` and carry no language prefix: `/favicon/<theme>.ico`,
 * `/favicon.svg` and `/preview/status` are shared across every city and every
 * language, not owned by one of them.
 */
import { langPrefix } from "../i18n/language";

/** Trailing slashes are stripped to match `trailingSlash: "never"`. */
const normalize = (href: string) =>
  href.length > 1 ? href.replace(/\/$/, "") : href || "/";

/**
 * A city's home page: `/kansai`, or `/en/kansai` in an English build.
 *
 * Also the prefix for the section anchors in the nav, which resolve only on
 * the home page and so have to travel there first from a detail page.
 */
export const tenantHome = (tenant: string) => `${langPrefix}/${tenant}`;

/**
 * A path inside one city. Anything that is not root-absolute — a `#anchor`, an
 * external URL — is already correct and passes through.
 */
export const tenantPath = (tenant: string, path: string) =>
  path.startsWith("/") ? normalize(`${langPrefix}/${tenant}${path}`) : path;

/** True on that city's home page. */
export const isHome = (url: URL, tenant: string) =>
  normalize(url.pathname) === tenantHome(tenant);
