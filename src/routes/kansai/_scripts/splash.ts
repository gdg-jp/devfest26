import { animate, stagger } from "motion";
import { all, announceIntro, EASE_IN_OUT, EASE_OUT, reduced } from "./env";

const SEEN_KEY = "df26-intro-seen";

/**
 * The splash: four arms fly in from the edges and cross, the braces close
 * around the name, a counter runs to 100, then the curtain closes in on the
 * crossing point and the hero is there underneath.
 *
 * Base.astro decided before first paint whether this plays at all (first
 * visit, motion allowed) and said so with `.is-loading`. From here the script
 * holds the curtain up with its own `.k-splashing`, so Base's three-second
 * safety net cannot drop it mid-flight.
 */
export function initSplash() {
  const root = document.documentElement;
  const splash = document.querySelector<HTMLElement>("[data-k-splash]");

  if (!splash || reduced || !root.classList.contains("is-loading")) {
    root.classList.remove("is-loading");
    splash?.remove();
    announceIntro();
    return;
  }

  root.classList.add("k-splashing");
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* Storage walled off — the splash just plays again next time. */
  }

  const pills = all(".k-x__pill", splash);
  const core = splash.querySelector<HTMLElement>("[data-k-x-core]");
  const spin = splash.querySelector<HTMLElement>("[data-k-x-spin]");
  const logo = splash.querySelector<SVGElement>(".k-splash__logo");
  const line = splash.querySelector<HTMLElement>("[data-k-splash-line]");
  const count = splash.querySelector<HTMLElement>("[data-k-splash-count]");
  const skip = splash.querySelector<HTMLButtonElement>("[data-k-splash-skip]");

  const running: { stop(): void }[] = [];
  const track = <T extends { stop(): void }>(a: T) => (running.push(a), a);

  // Each arm comes in along its own axis, alternating sides, so the four
  // arrive from eight directions and meet in the middle.
  pills.forEach((pill, i) => {
    const from = (i % 2 ? 1 : -1) * 130;
    track(
      animate(
        pill,
        { x: [`${from}vmax`, "0vmax"] },
        { duration: 0.95, delay: 0.08 * i, ease: EASE_OUT },
      ),
    );
  });

  if (core) {
    track(
      animate(
        core,
        { scale: [0, 1], rotate: [-180, 0] },
        { type: "spring", stiffness: 260, damping: 16, delay: 0.62 },
      ),
    );
  }

  if (logo) {
    track(
      animate(
        logo,
        {
          clipPath: ["inset(0 50% 0 50%)", "inset(0 0% 0 0%)"],
          opacity: [0, 1],
        },
        { duration: 0.7, delay: 0.55, ease: EASE_OUT },
      ),
    );
  }

  if (line) {
    track(
      animate(
        [...line.children],
        { y: [16, 0], opacity: [0, 1] },
        {
          duration: 0.5,
          delay: stagger(0.08, { startDelay: 0.8 }),
          ease: EASE_OUT,
        },
      ),
    );
  }

  if (count) {
    track(
      animate(0, 100, {
        duration: 1.45,
        ease: [0.6, 0, 0.3, 1],
        onUpdate: (v) => {
          count.textContent = String(Math.round(v)).padStart(3, "0");
        },
      }),
    );
  }

  let leaving = false;

  const leave = (quick: boolean) => {
    if (leaving) return;
    leaving = true;
    running.forEach((a) => a.stop());

    const duration = quick ? 0.45 : 0.85;

    // The hero starts arriving while the curtain is still closing, so there
    // is never a frame of nothing.
    window.setTimeout(announceIntro, quick ? 0 : 200);

    if (spin) {
      animate(
        spin,
        { rotate: [0, 90], scale: [1, 0.2] },
        { duration, ease: EASE_IN_OUT },
      );
    }

    animate(
      splash,
      {
        clipPath: ["circle(150% at 50% 50%)", "circle(0% at 50% 50%)"],
      },
      { duration, ease: EASE_IN_OUT },
    ).finished.finally(() => {
      root.classList.remove("is-loading", "k-splashing");
      splash.remove();
    });
  };

  const timer = window.setTimeout(() => leave(false), 1750);

  const skipNow = () => {
    window.clearTimeout(timer);
    leave(true);
  };
  skip?.addEventListener("click", skipNow);
  splash.addEventListener("click", skipNow);
  window.addEventListener("keydown", skipNow, { once: true });
}
