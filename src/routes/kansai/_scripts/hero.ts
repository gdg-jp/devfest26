import { animate, scroll, stagger } from "motion";
import {
  all,
  EASE_OUT,
  EASE_QUINT,
  finePointer,
  onIntro,
  reduced,
} from "./env";

/**
 * The hero's entrance, and the key visual's life afterwards.
 *
 * Entrance: the four arms of the crossing slide in along their axes and
 * lock while the name, the dates and the button come up beneath, then the
 * marker stroke under
 * 「考える」 draws itself. Afterwards the arms keep sliding a little on their
 * axes, out of phase — the fields never quite settle — the whole figure turns
 * as the page scrolls, and it leans towards the pointer.
 */
export function initHero() {
  const hero = document.querySelector<HTMLElement>(".k-hero");
  if (!hero) return;

  const items = all("[data-k-intro]", hero).sort(
    (a, b) => Number(a.dataset.kIntro) - Number(b.dataset.kIntro),
  );
  const mark = hero.querySelector<HTMLElement>("[data-k-mark]");
  const x = hero.querySelector<HTMLElement>("[data-k-crossing]");
  const pills = x ? all(".k-x__pill", x) : [];
  const core = x?.querySelector<HTMLElement>("[data-k-x-core]");
  const spin = x?.querySelector<HTMLElement>("[data-k-x-spin]");

  if (reduced) {
    mark?.classList.add("is-drawn");
    return;
  }

  // Hidden until the intro, so nothing flashes before the splash lifts.
  pills.forEach((pill) => (pill.style.opacity = "0"));
  if (core) core.style.opacity = "0";

  onIntro(() => {
    animate(
      items,
      { opacity: [0, 1], y: [28, 0] },
      {
        duration: 0.9,
        delay: stagger(0.07, { startDelay: 0.1 }),
        ease: EASE_QUINT,
      },
    );

    pills.forEach((pill, i) => {
      const from = (i % 2 ? 1 : -1) * 70;
      animate(
        pill,
        { x: [`${from}%`, "0%"], opacity: [0, 1] },
        { duration: 1.1, delay: 0.15 + i * 0.09, ease: EASE_QUINT },
      ).finished.then(() => drift(pill, i));
    });

    if (core) {
      animate(
        core,
        { scale: [0, 1], rotate: [-120, 0], opacity: [0, 1] },
        { type: "spring", stiffness: 220, damping: 14, delay: 0.75 },
      );
    }

    window.setTimeout(() => mark?.classList.add("is-drawn"), 850);
  });

  // The figure turns a quarter as the hero scrolls away.
  if (spin) {
    scroll(
      animate(spin, { rotate: [0, 50], scale: [1, 0.86] }, { ease: "linear" }),
      { target: hero, offset: ["start start", "end start"] },
    );
  }

  if (finePointer) lean(hero);
}

/** The arms' idle: each slides a little along its own axis, out of phase. */
function drift(pill: HTMLElement, i: number) {
  const reach = [7, -9, 6, -8][i % 4];
  animate(
    pill,
    { x: ["0%", `${reach}%`, "0%"] },
    {
      duration: 5.5 + i * 0.9,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.3,
    },
  );
}

/**
 * Everything marked `data-k-depth` shifts with the pointer by its depth, so
 * the glyphs around the crossing separate into layers.
 */
function lean(hero: HTMLElement) {
  const layers = all("[data-k-depth]", hero).map((el) => ({
    el,
    depth: Number(el.dataset.kDepth) || 1,
  }));
  const x = hero.querySelector<HTMLElement>("[data-k-crossing]");
  if (!layers.length && !x) return;

  let frame = 0;
  hero.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      const dx = (event.clientX - r.left) / r.width - 0.5;
      const dy = (event.clientY - r.top) / r.height - 0.5;
      layers.forEach(({ el, depth }) => {
        animate(
          el,
          { x: dx * 26 * depth, y: dy * 26 * depth },
          { type: "spring", stiffness: 120, damping: 18 },
        );
      });
      if (x) {
        animate(
          x,
          { rotateY: dx * 14, rotateX: -dy * 14 },
          { type: "spring", stiffness: 120, damping: 18 },
        );
      }
    });
  });

  hero.addEventListener("pointerleave", () => {
    layers.forEach(({ el }) =>
      animate(el, { x: 0, y: 0 }, { duration: 0.9, ease: EASE_OUT }),
    );
    if (x)
      animate(x, { rotateX: 0, rotateY: 0 }, { duration: 0.9, ease: EASE_OUT });
  });
}
