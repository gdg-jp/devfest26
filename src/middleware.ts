import { defineMiddleware } from "astro:middleware";
import { languageFromPath } from "./i18n/language";
import { previewMode } from "./preview/mode";
import { withLanguage } from "./preview/requestLanguage";

/**
 * Opens the request's language scope, and does nothing else.
 *
 * The published site has no use for a middleware: one build is one language,
 * so `currentLanguage()` is already the right answer everywhere and the branch
 * below compiles down to `return next()`. `previewMode` is a build-time
 * constant — see `src/preview/mode.ts`.
 *
 * The preview is the one deployment where the language cannot be a constant.
 * It answers both `/kansai` and `/en/kansai` from the same Worker, so the URL
 * is what says which language to render in, and this is the single place that
 * reads it. Everything downstream asks `currentLanguage()` — components, the
 * link helpers in `src/lib/url.ts`, the GROQ `$lang` binding in
 * `src/preview/drafts.ts` — rather than being handed a language as a prop
 * through several dozen call sites that have no other reason to know about it.
 *
 * Deliberately here and not in the gate (`preview/src/index.ts`). The gate is
 * type-checked against its own `tsconfig.json`, which does not include `src/`,
 * and the two are kept as separate module graphs on purpose; an
 * `AsyncLocalStorage` shared across them would be one bundler decision away
 * from being two stores that never see each other's values.
 *
 * Static assets never reach here — the adapter's handler answers those off the
 * `ASSETS` binding before any middleware runs — which is why the gate, not
 * this, is where authentication lives.
 */
export const onRequest = defineMiddleware((context, next) => {
  if (!previewMode) return next();
  return withLanguage(languageFromPath(context.url.pathname), next);
});
