import { ja } from "./ja";
import { en } from "./en";

/**
 * The languages this site's UI chrome is written in. Content fields (Sanity,
 * markdown) have their own notion of language — see `src/i18n/language.ts`
 * for the build-time axis that picks one.
 */
export type Language = "ja" | "en";

export type Messages = typeof ja;

const dictionaries: Record<Language, Messages> = { ja, en };

export function messages(lang: Language): Messages {
  return dictionaries[lang];
}
