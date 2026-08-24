import { animate, stagger } from "motion";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;
const SEEN_KEY = "df26-intro-seen";

function heroItems(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-intro]")].sort(
    (a, b) => Number(a.dataset.intro) - Number(b.dataset.intro),
  );
}

function showHero(items: HTMLElement[], startDelay: number) {
  if (!items.length) return;
  animate(
    items,
    { opacity: [0, 1], y: [14, 0] },
    { duration: 0.6, delay: stagger(0.075, { startDelay }), ease: EASE_OUT },
  );
}

/**
 * Plays the curtain, then hands off to the hero entrance. The two overlap by
 * design — the page is already moving by the time it is uncovered.
 */
export function initIntro() {
  const root = document.documentElement;
  const items = heroItems();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const curtain = document.querySelector<HTMLElement>(".preloader");

  // No curtain to play: either a repeat visit, reduced motion, or the safety
  // timeout already fired. Bring the hero in without the wait.
  if (!curtain || reduced || !root.classList.contains("is-loading")) {
    root.classList.remove("is-loading");
    items.forEach((el) => {
      el.style.opacity = "";
      el.style.transform = "";
    });
    if (!reduced) showHero(items, 0.05);
    return;
  }

  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode — the curtain simply plays again next time */
  }

  const braceL = curtain.querySelector<SVGElement>(".pl-brace-l");
  const braceR = curtain.querySelector<SVGElement>(".pl-brace-r");
  const word = curtain.querySelector<SVGElement>(".pl-word");

  // The mark is a pair of braces, so that is the gesture: they clamp in from
  // the edges and the wordmark opens out between them.
  if (braceL)
    animate(
      braceL,
      { x: [-70, 0], opacity: [0, 1] },
      { duration: 0.5, ease: EASE_OUT },
    );
  if (braceR)
    animate(
      braceR,
      { x: [70, 0], opacity: [0, 1] },
      { duration: 0.5, ease: EASE_OUT },
    );
  if (word) {
    animate(
      word,
      {
        clipPath: ["inset(0 50% 0 50%)", "inset(0 12% 0 12%)"],
        opacity: [0, 1],
      },
      { duration: 0.5, delay: 0.22, ease: EASE_OUT },
    );
  }

  showHero(items, 1.0);

  const lift = animate(
    curtain,
    { transform: ["translateY(0%)", "translateY(-105%)"] },
    { duration: 0.72, delay: 0.85, ease: EASE_CURTAIN },
  );

  lift.finished
    .catch(() => {})
    .finally(() => {
      root.classList.remove("is-loading");
      curtain.remove();
    });
}
