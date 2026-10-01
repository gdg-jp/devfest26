import { scroll } from "motion";

/** Topbar condense, read-progress rail, and which nav item is lit. */
export function initNav() {
  const bar = document.querySelector<HTMLElement>("[data-topbar]");
  const progress = document.querySelector<HTMLElement>("[data-progress]");

  if (progress) {
    scroll((p: number) => {
      progress.style.transform = `scaleX(${p})`;
    });
  }

  if (bar) {
    // A hero set on the dark stage runs up behind the bar, so the bar has to
    // invert for exactly as long as it is over one. Measured rather than
    // assumed: the stage's height depends on the viewport, and on a page with
    // no stage at all this simply never turns on.
    const stage = document.querySelector<HTMLElement>("[data-stage]");
    let stageEnd = 0;
    const measure = () => {
      stageEnd = stage
        ? stage.offsetTop + stage.offsetHeight - bar.offsetHeight
        : 0;
    };

    const sync = () => {
      bar.classList.toggle("is-stuck", window.scrollY > 60);
      bar.classList.toggle("is-past-stage", window.scrollY >= stageEnd);
    };

    measure();
    sync();
    addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", () => {
      measure();
      sync();
    });

    // The bar's height is not a constant — it condenses here and the lockup
    // narrows at two breakpoints — so anything pinned just below it wants the
    // measurement rather than a number. `--topbar-h` in the tokens is the
    // resting value this refines; the observer catches the condense as it
    // animates, so nothing pinned drifts while the padding is still moving.
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        const h = Math.round(bar.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--topbar-h", `${h}px`);
      }).observe(bar);
    }
  }

  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-spy]")];
  if (!links.length || !("IntersectionObserver" in window)) return;

  const sections = links
    .map((a) => document.getElementById(a.dataset.spy!))
    .filter((el): el is HTMLElement => el !== null);

  // A narrow band across the middle of the viewport: whichever section is
  // crossing it owns the nav highlight.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        links.forEach((a) =>
          a.classList.toggle("is-current", a.dataset.spy === id),
        );
      }
    },
    { rootMargin: "-46% 0px -50% 0px", threshold: 0 },
  );

  sections.forEach((section) => observer.observe(section));
}
