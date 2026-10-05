import { animate } from "motion";
import { all, finePointer, reduced } from "./env";

/**
 * The featured-speaker carousel: an endless strip that centres each card.
 *
 * The track is a native scroll-snap strip, so touch and trackpads need
 * nothing from here. For the loop, the cards are copied once to either side
 * of the real set; whenever the strip comes to rest in a copy, it is moved by
 * exactly one set's width to the same card in the real set — the same picture,
 * so the jump is invisible. The copies are `inert` and hidden from assistive
 * tech, which sees one list of speakers.
 *
 * On top: the arrows, drag for a mouse, a progress segment, and the focus —
 * the middle card sits full size while its neighbours shrink back and dim,
 * and each photo pans a little inside its frame as the strip moves.
 */
const hasScrollEnd = "onscrollend" in window;

export function initCarousels() {
  all("[data-k-car]").forEach((root) => {
    const track = root.querySelector<HTMLElement>("[data-k-car-track]");
    if (!track) return;
    const originals = [...track.children] as HTMLElement[];
    const n = originals.length;
    if (n < 2) return;

    const copy = () =>
      originals.map((item) => {
        const clone = item.cloneNode(true) as HTMLElement;
        clone.inert = true;
        clone.setAttribute("aria-hidden", "true");
        return clone;
      });
    track.prepend(...copy());
    track.append(...copy());

    const items = [...track.children] as HTMLElement[];
    const cards = items.map((item) =>
      item.querySelector<HTMLElement>(".k-card"),
    );
    const pans = items.map((item) =>
      item.querySelector<HTMLElement>("[data-k-car-pan]"),
    );
    const prev = root.querySelector<HTMLButtonElement>("[data-k-car-prev]");
    const next = root.querySelector<HTMLButtonElement>("[data-k-car-next]");
    const bar = root.querySelector<HTMLElement>("[data-k-car-progress]");
    bar?.style.setProperty("--seg", `${100 / n}%`);

    // Distance between neighbouring cards, and the scroll that centres one.
    const step = () => items[1].offsetLeft - items[0].offsetLeft;
    const centre = (i: number) =>
      items[i].offsetLeft + items[i].offsetWidth / 2 - track.clientWidth / 2;
    // Which card is in the middle, as a fraction between two while moving.
    const at = () => (track.scrollLeft - centre(0)) / step();

    const jump = (left: number) => {
      track.scrollLeft = left;
    };

    // Back into the real set, by whole sets, when resting in a copy.
    const settle = () => {
      if (track.classList.contains("is-dragging")) return;
      const i = Math.round(at());
      if (i < n) jump(track.scrollLeft + n * step());
      else if (i >= 2 * n) jump(track.scrollLeft - n * step());
    };

    const start = Number(track.dataset.kCarStart) || 0;
    jump(centre(n + start));

    const by = (dir: number) =>
      track.scrollBy({
        left: dir * step(),
        behavior: reduced ? "auto" : "smooth",
      });
    prev?.addEventListener("click", () => by(-1));
    next?.addEventListener("click", () => by(1));

    const sync = () => {
      const pos = at();
      if (bar) {
        const inSet = (((pos - n) % n) + n) % n;
        bar.style.transform = `translate3d(${(inSet * 100).toFixed(1)}%,0,0)`;
      }
      if (reduced) return;
      cards.forEach((card, i) => {
        if (!card) return;
        const off = i - pos;
        const d = Math.min(Math.abs(off), 1.5);
        card.style.transform = `scale(${(1 - Math.min(d, 1) * 0.1).toFixed(3)})`;
        card.style.opacity = (1 - d * 0.3).toFixed(3);
        pans[i]?.style.setProperty(
          "transform",
          `translate3d(${(-Math.max(-2, Math.min(2, off)) * 4).toFixed(2)}%,0,0)`,
        );
      });
    };

    let rest = 0;
    track.addEventListener(
      "scroll",
      () => {
        requestAnimationFrame(sync);
        // `scrollend` where there is one; a pause in scrolling where not.
        if (!hasScrollEnd) {
          window.clearTimeout(rest);
          rest = window.setTimeout(settle, 160);
        }
      },
      { passive: true },
    );
    track.addEventListener("scrollend", settle);

    // Keep the same card in the middle when the column changes width.
    window.addEventListener("resize", () => {
      const i = Math.round(at());
      jump(centre(((((i - n) % n) + n) % n) + n));
      sync();
    });
    sync();

    if (finePointer) drag(track, settle);
  });
}

/** Mouse drag, with a little carry after release before snapping. */
function drag(track: HTMLElement, done: () => void) {
  let startX = 0;
  let startLeft = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let moved = false;
  let down = false;

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    down = true;
    moved = false;
    startX = lastX = event.clientX;
    startLeft = track.scrollLeft;
    lastT = performance.now();
    velocity = 0;
  });

  window.addEventListener("pointermove", (event) => {
    if (!down) return;
    const dx = event.clientX - startX;
    if (!moved && Math.abs(dx) > 4) {
      moved = true;
      track.classList.add("is-dragging");
    }
    if (!moved) return;
    const now = performance.now();
    velocity = (event.clientX - lastX) / Math.max(1, now - lastT);
    lastX = event.clientX;
    lastT = now;
    track.scrollLeft = startLeft - dx;
  });

  window.addEventListener("pointerup", () => {
    if (!down) return;
    down = false;
    if (!moved) return;
    const from = track.scrollLeft;
    const carry = -velocity * 260;
    animate(from, from + carry, {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (track.scrollLeft = v),
    }).finished.then(() => {
      // Snapping comes back on here, and the strip settles on a card.
      track.classList.remove("is-dragging");
      window.setTimeout(done, 400);
    });
  });

  // A drag that ends over a card is not a click on it.
  track.addEventListener(
    "click",
    (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    },
    true,
  );
}
