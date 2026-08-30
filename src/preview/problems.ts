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
 * This is deliberately not a logger, and deliberately not a module-level list.
 * A Worker isolate serves overlapping requests: one render can be halfway
 * through while another starts, and a shared list would let the second one
 * clear the first one's findings and then interleave with them, so that
 * `/preview/status` answered with some of one walk and some of another — most
 * often *fewer* problems than there are, which is the one direction this must
 * not fail in. So a recording is an object with an owner, and `report()`
 * writes to whichever one the current call stack is running inside.
 */

// With the extension, because `src/tenants/discovery.ts` reaches this module
// and that one has to run under bare Node — see its own header.
import { previewMode } from "./mode.ts";
import { AsyncLocalStorage } from "node:async_hooks";

export interface Problem {
  /** The collection or step that noticed. Groups the list for a reader. */
  where: string;
  message: string;
}

/** One walk's findings. Whose walk is decided by `recordInto`. */
export interface Recording {
  problems: Problem[];
  /** How many were found after `LIMIT`, and so are only a number. */
  dropped: number;
}

/**
 * A cap, not a design. Nothing should ever produce this many, and if something
 * does — a projection that changed shape, say, failing every document — the
 * status page should stay a page rather than becoming a memory leak with a
 * scrollbar.
 */
const LIMIT = 200;

/**
 * The recording the current call stack belongs to.
 *
 * `AsyncLocalStorage` rather than a variable, because the whole difficulty is
 * that two of these overlap in one isolate. It keeps the association through
 * every `await` in a walk without `report()`'s callers — which are deep in
 * `src/data/program.ts` and `src/tenants/` and have no business knowing this
 * module exists beyond one import — having to carry it.
 */
const current = new AsyncLocalStorage<Recording>();

/** An empty recording, to be filled by `recordInto`. */
export function recording(): Recording {
  return { problems: [], dropped: 0 };
}

/**
 * Runs `walk`, with everything it reports landing in `into`.
 *
 * Nesting is what makes the snapshot work: `src/preview/drafts.ts` takes one
 * inside whichever request first asked for it, and the parse failures belong to
 * the snapshot rather than to that request — the next request reads the same
 * snapshot and must see them too. Because that call opens its own recording,
 * they go there and not into the caller's.
 */
export function recordInto<T>(
  into: Recording,
  walk: () => Promise<T>,
): Promise<T> {
  return current.run(into, walk);
}

/**
 * Notes one thing that could not be rendered.
 *
 * Repeats are collapsed: every page of a city runs the same programme through
 * the same checks, so without this a single unfinished session would be
 * reported once per section that lists it.
 *
 * Outside a recording this does nothing, and that is not a loss. The only
 * reader is `/preview/status`, which walks every city itself precisely so that
 * its answer describes the whole draft rather than whichever page happened to
 * be rendered last.
 */
export function report(where: string, message: string): void {
  const into = current.getStore();
  if (into) add(into, { where, message });
}

/** Two recordings as one, with the repeats between them collapsed too. */
export function combine(a: Recording, b: Recording): Recording {
  const merged = recording();
  merged.dropped = a.dropped + b.dropped;
  for (const problem of [...a.problems, ...b.problems]) add(merged, problem);
  return merged;
}

function add(into: Recording, problem: Problem): void {
  const seen = into.problems.some(
    (p) => p.where === problem.where && p.message === problem.message,
  );
  if (seen) return;

  if (into.problems.length >= LIMIT) {
    into.dropped += 1;
    return;
  }

  into.problems.push(problem);
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
