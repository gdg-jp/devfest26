/**
 * Internal links.
 *
 * Every city is mounted on a path of its own — `/kansai/`, `/tokyo/` — under
 * the one origin the front page sits at. That used to be Astro's `base`, one
 * value per build. A single build now emits all of them, so the prefix is the
 * city rather than the build, and it is written here rather than by hand: a
 * root-absolute path typed into a component would point at whichever city
 * happened to be first.
 *
 * The old `withBase` is deliberately gone rather than kept as a no-op. Every
 * call site had to be revisited, and a function that silently did nothing
 * would have let one be missed.
 *
 * The language prefix works the same way, one layer out: `/kansai/` in
 * Japanese, `/en/kansai/` in English. Every link is written in the language of
 * the page writing it, so there is no cross-language link to construct here —
 * the one page that needs the *other* language is the switcher, and it asks
 * `alternatePath` for it. In a static build `currentLanguage()` is the build's
 * own constant and this is a prefix decided once; in the draft preview, where
 * one Worker answers both languages, it is the prefix of the page in flight.
 * See `src/i18n/language.ts`.
 *
 * A page and a file are written differently. A page's URL ends in a slash on
 * the published site and not in the draft preview — see `src/lib/pagePath.ts`
 * for why — while a file (`/kansai/favicon.svg`) has the one form everywhere.
 * `tenantPath` is for the first and `tenantFile` for the second.
 *
 * A handful of root-absolute paths deliberately do *not* go through either and
 * carry no language prefix: `/favicon/<theme>.ico`, `/favicon.svg` and
 * `/preview/status` are shared across every city and every language, not owned
 * by one of them.
 */
import { currentLangPrefix } from "../i18n/language";
import { pagePath, samePage } from "./pagePath";

/**
 * A city's home page: `/kansai/`, or `/en/kansai/` in an English build.
 *
 * Also the prefix for the section anchors in the nav, which resolve only on
 * the home page and so have to travel there first from a detail page.
 */
export const tenantHome = (tenant: string) =>
  pagePath(`${currentLangPrefix()}/${tenant}`);

/**
 * A page inside one city: `/kansai/sessions/<slug>/`. Anything that is not
 * root-absolute — a `#anchor`, an external URL — is already correct and passes
 * through.
 */
export const tenantPath = (tenant: string, path: string) =>
  path.startsWith("/")
    ? pagePath(`${currentLangPrefix()}/${tenant}${path}`)
    : path;

/** A file inside one city — an icon, an OG card. Never given a slash. */
export const tenantFile = (tenant: string, path: string) =>
  `${currentLangPrefix()}/${tenant}${path}`;

/** True on that city's home page. */
export const isHome = (url: URL, tenant: string) =>
  samePage(url.pathname, tenantHome(tenant));
