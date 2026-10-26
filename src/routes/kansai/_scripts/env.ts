/**
 * What every motion module needs to know before it moves anything.
 *
 * Read once: a visitor who flips reduced motion mid-visit gets it from the
 * next page, which is the same thing the browser's own transitions do.
 */

export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A real pointer that can hover — not a finger. */
export const finePointer = matchMedia(
  "(hover: hover) and (pointer: fine)",
).matches;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;
export const EASE_QUINT = [0.23, 1, 0.32, 1] as const;

export const all = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
) => [...root.querySelectorAll<T & Element>(selector)] as T[];

/** Fired on `document` once the splash has lifted (or was never shown). */
export const INTRO_EVENT = "k:intro";

let introPlayed = false;

export function announceIntro() {
  if (introPlayed) return;
  introPlayed = true;
  document.dispatchEvent(new CustomEvent(INTRO_EVENT));
}

export function onIntro(run: () => void) {
  if (introPlayed) run();
  else document.addEventListener(INTRO_EVENT, run, { once: true });
}
