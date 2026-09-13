/**
 * Which language a page is rendered in.
 *
 * Two questions live here, and telling them apart is the whole file:
 *
 * - **The build's language.** `SITE_LANG` picks it, the way `TARGETS` picks
 *   which cities a build renders, and one static build is one (language, city)
 *   pair — a bilingual site is several builds, not a `[lang]` segment inside
 *   one. `language` and `langPrefix` are that answer, and they are constants
 *   because a static build only ever has the one.
 * - **This request's language.** The draft preview is a single Worker holding
 *   every city, and `/en/kansai` beside `/kansai` is that same arrangement one
 *   axis wider: `astro.config.ts` injects both prefixes there, and the answer
 *   arrives with the URL rather than with the build. `currentLanguage()` is
 *   that one, and every component reads it rather than `language`.
 *
 * In a published build the two are the same value, and `currentLanguage()`
 * folds to the constant: `previewMode` is substituted at build time, so the
 * request-time branch is absent rather than merely unused. See
 * `src/preview/mode.ts`.
 *
 * `SITE_LANG`, not `LANG`: `LANG` is a POSIX environment variable most shells
 * already set (`ja_JP.UTF-8` and the like), and reading it here would pick up
 * whatever the build machine's locale happens to be instead of what was asked
 * for.
 *
 * Kept dependency-free, like `src/preview/mode.ts`, so it can be read from
 * `astro.config.ts`, from the preview Worker, and from
 * `scripts/discover-targets.mjs` — which runs this file on a bare checkout with
 * no `node_modules` behind it, and is why the two value imports below carry
 * their `.ts` extensions.
 */
import type { Language } from "./index";
import { previewMode } from "../preview/mode.ts";
import { requestLanguage } from "../preview/requestLanguage.ts";

export const LANGUAGES: readonly Language[] = ["ja", "en"];

export const DEFAULT_LANGUAGE: Language = "ja";

const raw = process.env.SITE_LANG?.trim();

/** The language this build was asked for. */
export const language: Language = (() => {
  if (!raw) return DEFAULT_LANGUAGE;
  if ((LANGUAGES as readonly string[]).includes(raw)) return raw as Language;

  throw new Error(
    `Unknown SITE_LANG "${raw}". Expected one of: ${LANGUAGES.join(", ")}.`,
  );
})();

/**
 * `""` for the default language, `"/en"` otherwise — bake this into a path.
 *
 * Every non-default language is therefore a reserved top-level segment, the way
 * `portal` and `/studio` are: a city whose slug was `en` would be a directory
 * the publish step prunes and a route the preview reads as a language. Nothing
 * enforces that beyond this note, because nothing enforces the other two
 * either — see `PORTAL_TARGET` in `src/tenants/ids.ts`.
 */
export const langPrefixOf = (lang: Language): string =>
  lang === DEFAULT_LANGUAGE ? "" : `/${lang}`;

/**
 * This build's own prefix. A constant, and the one `astro.config.ts` bakes into
 * its route patterns — a pattern is decided before any request exists, so it
 * cannot be the request-time one.
 */
export const langPrefix = langPrefixOf(language);

/**
 * The language of the page being rendered right now.
 *
 * This, not `language`, is what a component wants. The two differ in exactly
 * one deployment — the draft preview — and there the difference is the point.
 */
export function currentLanguage(): Language {
  if (!previewMode) return language;
  return requestLanguage() ?? language;
}

/** `currentLanguage()`'s prefix. See `src/lib/url.ts`, its only caller. */
export function currentLangPrefix(): string {
  return langPrefixOf(currentLanguage());
}

/**
 * The other language — there are only two, so "the alternate" is unambiguous.
 * Used for hreflang and the language switcher, which each need to name the page
 * that is not this one.
 */
export const alternateOf = (lang: Language): Language =>
  lang === DEFAULT_LANGUAGE ? "en" : DEFAULT_LANGUAGE;

export function currentAlternateLanguage(): Language {
  return alternateOf(currentLanguage());
}

/** A language's own name for itself — an endonym needs no translation. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ja: "日本語",
  en: "English",
};

/**
 * Which language a path is written in.
 *
 * Read by `src/middleware.ts` to open the request's language scope, and by
 * `alternatePath` below. A whole segment is matched, never a string prefix:
 * `/en` must not match `/enshu`.
 */
export function languageFromPath(pathname: string): Language {
  for (const lang of LANGUAGES) {
    const prefix = langPrefixOf(lang);
    // The default language has no prefix, so it is what is left over.
    if (prefix === "") continue;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return lang;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * The same path, in the other language. Field-level localization means every
 * page that exists in one language exists at the same slug in the other — see
 * the localization plan — so this is a pure prefix swap, not a lookup.
 *
 * Derived from the path rather than from the build or the request: the path
 * already says which language it is in, and taking the answer from there is
 * one fewer thing that can disagree with the URL being rewritten.
 */
export function alternatePath(pathname: string): string {
  const here = languageFromPath(pathname);
  const from = langPrefixOf(here);
  const to = langPrefixOf(alternateOf(here));

  const withoutPrefix =
    from === "" ? pathname : pathname.slice(from.length) || "/";
  const combined = withoutPrefix === "/" ? to : `${to}${withoutPrefix}`;
  return combined || "/";
}
