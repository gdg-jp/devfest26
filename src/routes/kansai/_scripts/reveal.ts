import { animate, inView, stagger } from "motion";
import { all, EASE_QUINT, reduced } from "./env";

type Keyframes = Record<string, (string | number)[]>;

/**
 * How each `data-k-reveal` variant arrives. Springs for the things that pop,
 * a long quint for the things that rise — never the same curve for both.
 */
const VARIANTS: Record<string, { from: Keyframes; spring?: boolean }> = {
  up: { from: { opacity: [0, 1], y: [36, 0] } },
  rise: { from: { opacity: [0, 1], y: [90, 0], scale: [0.94, 1] } },
  pop: { from: { opacity: [0, 1], scale: [0.7, 1] }, spring: true },
  fade: { from: { opacity: [0, 1] } },
};

function play(el: HTMLElement, delay = 0) {
  const variant = VARIANTS[el.dataset.kReveal ?? "up"] ?? VARIANTS.up;
  return animate(
    el,
    variant.from,
    variant.spring
      ? { type: "spring", stiffness: 260, damping: 18, delay }
      : { duration: 1, ease: EASE_QUINT, delay },
  );
}

/** Scroll reveals, one at a time or as a staggered group. */
export function initReveal() {
  const every = all("[data-k-reveal]");
  if (reduced) {
    every.forEach((el) => (el.style.opacity = "1"));
    return;
  }

  all("[data-k-stagger]").forEach((group) => {
    const children = all("[data-k-reveal]", group).filter(
      (el) => el.closest("[data-k-stagger]") === group,
    );
    inView(
      group,
      () => {
        // Cap the ramp so the last of a long grid is not left waiting.
        children.forEach((el, i) => play(el, Math.min(i, 9) * 0.07));
      },
      { margin: "0px 0px -10% 0px" },
    );
  });

  every
    .filter((el) => !el.closest("[data-k-stagger]"))
    .forEach((el) => {
      inView(el, () => void play(el), { margin: "0px 0px -12% 0px" });
    });
}

/**
 * Section titles, letter by letter up out of a mask. The original text stays
 * as the accessible name; the letters are presentation.
 */
export function initSplit() {
  all("[data-k-split]").forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    if (!text) return;
    el.setAttribute("aria-label", text);
    el.textContent = "";

    const mask = document.createElement("span");
    mask.className = "k-split__mask";
    mask.setAttribute("aria-hidden", "true");

    const chars = [...text].map((ch) => {
      const span = document.createElement("span");
      span.className = "k-split__char";
      span.textContent = ch === " " ? " " : ch;
      mask.append(span);
      return span;
    });
    el.append(mask);

    if (reduced) return;
    inView(
      el,
      () => {
        animate(
          chars,
          { y: ["105%", "0%"], rotate: [8, 0] },
          { duration: 1, delay: stagger(0.035), ease: EASE_QUINT },
        );
      },
      { margin: "0px 0px -8% 0px" },
    );
  });
}
