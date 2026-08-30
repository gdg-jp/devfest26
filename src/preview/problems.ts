/**
 * What the preview could not show, and why.
 *
 * A published build fails loudly on half-written content, and should: a session
 * naming nobody, a reference typed halfway, an `event` document missing its
 * venue. In CI a red job is the signal `.github/workflows/build.yml` reads as
 * "leave that city's published pages where they are", and nothing gets
 * published wearing an "undefined".
 *
 * The draft preview is the one place where half-written content is the *point*.
 * The same throw there blanks the page an editor opened in order to look at the
 * very thing they were in the middle of writing — and tells them nothing, since
 * a 500 from a Worker is a 500. So the preview drops the entry it cannot render
 * and records what happened here, and `/preview/status` reads it back. The
 * editor sees the rest of the page, plus a line saying which session is missing
 * and what it needs.
 *
 * This is deliberately not a logger. It holds what the *current* snapshot ran
 * into and nothing older: `src/preview/drafts.ts` clears it each time it
 * fetches, so what is in here always describes the page being looked at rather
 * than a history nobody asked for.
 */

// With the extension, because `src/tenants/discovery.ts` reaches this module
// and that one has to run under bare Node — see its own header.
import { previewMode } from "./mode.ts";

export interface Problem {
  /** The collection or step that noticed. Groups the list for a reader. */
  where: string;
  message: string;
}

/**
 * A cap, not a design. Nothing should ever produce this many, and if something
 * does — a projection that changed shape, say, failing every document — the
 * status page should stay a page rather than becoming a memory leak with a
 * scrollbar.
 */
const LIMIT = 200;

let recorded: Problem[] = [];
let dropped = 0;

/** Starts a new recording. Called when a fresh snapshot is taken. */
export function startRecording(): void {
  recorded = [];
  dropped = 0;
}

/**
 * Notes one thing that could not be rendered.
 *
 * Repeats are collapsed: every page of a city runs the same programme through
 * the same checks, so without this a single unfinished session would be
 * reported once per section that lists it.
 */
export function report(where: string, message: string): void {
  if (recorded.some((p) => p.where === where && p.message === message)) return;
  if (recorded.length >= LIMIT) {
    dropped += 1;
    return;
  }
  recorded.push({ where, message });
}

/** Everything the current snapshot ran into, in the order it was found. */
export function problems(): { problems: Problem[]; dropped: number } {
  return { problems: [...recorded], dropped };
}

/**
 * A rule the content has broken.
 *
 * Published builds throw, which is the behaviour every one of these checks was
 * written for and the reason they are worth having. The preview records instead
 * and the caller drops whatever it was about to render, so that one unfinished
 * session costs one card rather than the whole page.
 *
 * `previewMode` is substituted at build time, so a published build carries the
 * throw and none of this.
 */
export function reject(where: string, message: string): void {
  if (!previewMode) throw new Error(message);
  report(where, message);
}
