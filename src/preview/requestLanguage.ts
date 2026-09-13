import { AsyncLocalStorage } from "node:async_hooks";
import type { Language } from "../i18n";

/**
 * The language of the request being rendered, in the draft preview.
 *
 * The published site never asks. One static build is one language — `language`
 * in `src/i18n/language.ts` is a constant there, and this module is not in the
 * graph at all. The preview is the awkward one: it is a single Worker that
 * already answers for every city from one deployment, and `/en/kansai` beside
 * `/kansai` is the same widening one axis further. Two Workers would have cost
 * a second hostname to register with GDG Accounts, a second sign-in, a second
 * Studio origin for Presentation, and a language switcher that could no longer
 * be a pure path swap.
 *
 * A module-level variable would be wrong here rather than merely ugly. workerd
 * runs requests concurrently inside one isolate, so a Japanese render that
 * awaits a Sanity fetch can resume *after* an English request has overwritten
 * the variable, and the page comes back half in each language — the kind of
 * fault that appears only under load and never in a local run.
 *
 * `AsyncLocalStorage` is the primitive that survives that. `nodejs_compat` is
 * already on (see `preview/wrangler.jsonc`), and the store follows the whole
 * render — including the `ReadableStream` Astro returns, whose chunks are
 * produced after `withLanguage` has already returned.
 *
 * Set once per request, by `src/middleware.ts`, and by nothing else: two
 * scopes on one render is the bug this exists to prevent.
 */
const storage = new AsyncLocalStorage<Language>();

/** Runs `render` with `language` as the answer `requestLanguage()` gives. */
export function withLanguage<T>(language: Language, render: () => T): T {
  return storage.run(language, render);
}

/**
 * The language of the request in flight, or `undefined` outside one — a build,
 * or a code path the middleware does not cover. The caller falls back to the
 * build's own language; see `currentLanguage()`.
 */
export function requestLanguage(): Language | undefined {
  return storage.getStore();
}
