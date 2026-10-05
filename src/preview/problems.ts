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
 *
 * `IGNORE_CONTENT_WARNINGS` is the one way out of the throw for a published
 * build: the「すべての警告を無視して公開」checkbox on a manual run of
 * `.github/workflows/build.yml`, for the day a half-written session must not
 * hold the rest of the city back. The entry is dropped the way the preview
 * drops it, and the reason goes to the log instead of nowhere.
 */
export function reject(where: string, message: string): void {
  if (previewMode) return report(where, message);
  if (!ignoreWarnings) throw new Error(message);
  warnOnce(where, message);
}

const ignoreWarnings = Boolean(process.env.IGNORE_CONTENT_WARNINGS?.trim());

/**
 * Every page of a city runs the same checks, so one unfinished session would
 * otherwise be logged once per section that lists it — the same reason
 * `report()` collapses repeats. A module-level set is fine here and only here:
 * a static build is one walk, with no second request to interleave with.
 *
 * Shared by `warnOnce` and by `warn` below: both are "say this once per build",
 * and keying on the place as well as the wording keeps the same sentence from
 * two different checks from silencing one another.
 */
const warned = new Set<string>();

function warnOnce(where: string, message: string): void {
  const key = `${where}\0${message}`;
  if (warned.has(key)) return;
  warned.add(key);

  // On GitHub Actions, as a warning annotation, so what was left out shows on
  // the run's summary rather than only somewhere in the middle of the log. The
  // Studio reads only failure annotations, so these do not turn「サイトに反映」
  // red.
  if (process.env.GITHUB_ACTIONS) {
    const escaped = message
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.warn(`::warning title=${where} (ignored)::${escaped}`);
  } else {
    console.warn(`[${where}] ignored: ${message}`);
  }
}

/**
 * A rule the content has broken that nothing has to stop for.
 *
 * `reject` is for the mistakes that would put a wrong page on the internet — a
 * reference across cities resolving to the wrong person, two entries fighting
 * over one URL, a slot with nobody on it — and dying on those is the whole
 * reason they are worth checking.
 *
 * This is for the ones whose only consequence is that something in the Studio
 * goes unused. Nothing renders wrongly, so taking every page down over it is a
 * worse outcome than the mistake: an event site is edited by volunteers in the
 * week before the day, and a stray placeholder left in the Studio should cost
 * that placeholder, not the site. It is still said out loud so it gets tidied.
 */
export function warn(where: string, message: string): void {
  report(where, message);
  if (previewMode) return;

  const key = `${where} ${message}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[${where}] ${message}`);
}
