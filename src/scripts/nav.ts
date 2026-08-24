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
    const sync = () => bar.classList.toggle("is-stuck", window.scrollY > 60);
    sync();
    addEventListener("scroll", sync, { passive: true });
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
