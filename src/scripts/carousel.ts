/**
 * The speaker rail's buttons.
 *
 * The rail is an ordinary horizontal scroller with scroll-snap, so a touch
 * device and a trackpad already work and this adds nothing for them. What it
 * adds is the affordance a mouse has no gesture for: two buttons that page it,
 * and — as much to the point — the fact that they are *there*, which is what
 * tells somebody the row continues past the edge of the screen.
 *
 * The pager is `hidden` in the markup and revealed here, so a rail that is not
 * actually scrollable (a short programme, a wide window) never shows controls
 * that would do nothing.
 */
const PAGE = 0.85;

function wire(root: HTMLElement) {
  const rail = root.querySelector<HTMLElement>("[data-carousel-rail]");
  // The pager sits beside the heading rather than inside the rail's wrapper,
  // so it is looked up from the section rather than from the root.
  const pager = root
    .closest("section")
    ?.querySelector<HTMLElement>("[data-carousel-pager]");
  const prev = pager?.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const next = pager?.querySelector<HTMLButtonElement>("[data-carousel-next]");
  if (!rail || !pager || !prev || !next) return;

  const scrollable = () => rail.scrollWidth - rail.clientWidth;

  const sync = () => {
    const room = scrollable();
    pager.hidden = room < 2;
    // A fractional scrollWidth means the end is never exactly reached, so both
    // ends are judged with a pixel of slack rather than by equality.
    prev.disabled = rail.scrollLeft <= 1;
    next.disabled = rail.scrollLeft >= room - 1;
  };

  const page = (direction: 1 | -1) => {
    rail.scrollBy({
      left: direction * rail.clientWidth * PAGE,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  prev.addEventListener("click", () => page(-1));
  next.addEventListener("click", () => page(1));
  rail.addEventListener("scroll", sync, { passive: true });

  if ("ResizeObserver" in window) new ResizeObserver(sync).observe(rail);
  sync();
}

export function initCarousels() {
  for (const root of document.querySelectorAll<HTMLElement>(
    "[data-carousel]",
  )) {
    wire(root);
  }
}
