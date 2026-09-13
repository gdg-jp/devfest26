/**
 * The language this build renders in — a build axis, the same way `TARGETS`
 * picks which cities a build renders. One build is one (language, city) pair;
 * a bilingual site is several builds, not a `[lang]` segment inside one.
 *
 * `SITE_LANG`, not `LANG`: `LANG` is a POSIX environment variable most shells
 * already set (`ja_JP.UTF-8` and the like), and reading it here would pick up
 * whatever the build machine's locale happens to be instead of what was asked
 * for.
 *
 * Kept dependency-free, like `src/preview/mode.ts`, so it can be read from
 * `astro.config.ts` and from the preview Worker alike.
 */
import type { Language } from "./index";

export const LANGUAGES: readonly Language[] = ["ja", "en"];

export const DEFAULT_LANGUAGE: Language = "ja";

const raw = process.env.SITE_LANG?.trim();

export const language: Language = (() => {
  if (!raw) return DEFAULT_LANGUAGE;
  if ((LANGUAGES as readonly string[]).includes(raw)) return raw as Language;

  throw new Error(
    `Unknown SITE_LANG "${raw}". Expected one of: ${LANGUAGES.join(", ")}.`,
  );
})();

/** `""` for the default language, `"/en"` otherwise — bake this into a path. */
export const langPrefix = language === DEFAULT_LANGUAGE ? "" : `/${language}`;

/**
 * The other language — there are only two, so "the alternate" is unambiguous.
 * Used for hreflang and the language switcher, which each need to name the
 * page that is not this build's own.
 */
export const alternateLanguage: Language =
  language === DEFAULT_LANGUAGE ? "en" : DEFAULT_LANGUAGE;

export const alternateLangPrefix =
  alternateLanguage === DEFAULT_LANGUAGE ? "" : `/${alternateLanguage}`;

/** A language's own name for itself — an endonym needs no translation. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ja: "日本語",
  en: "English",
};

/**
 * The same path, in the other language build. Field-level localization means
 * every page that exists in one language exists at the same slug in the
 * other — see the localization plan — so this is a pure prefix swap, not a
 * lookup: strip this build's `langPrefix` off the front, put the alternate's
 * on instead.
 */
export function alternatePath(pathname: string): string {
  // A whole segment, not a string prefix: `/en` must not match `/enshu`.
  const prefixed =
    langPrefix !== "" &&
    (pathname === langPrefix || pathname.startsWith(`${langPrefix}/`));
  const withoutPrefix = prefixed
    ? pathname.slice(langPrefix.length) || "/"
    : pathname;
  const combined =
    withoutPrefix === "/"
      ? alternateLangPrefix
      : `${alternateLangPrefix}${withoutPrefix}`;
  return combined || "/";
}
