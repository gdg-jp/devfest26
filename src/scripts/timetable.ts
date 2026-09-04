/**
 * The timetable's head row scrolls sideways in a container of its own, so that
 * it can be sticky to the page instead of to the grid it labels — see the
 * comment on `.tt-frame` in `src/components/Timetable.astro` for why it cannot
 * be sticky inside it. The columns line up without help, because both grids
 * are given a template that never consults its content; the one thing CSS will
 * not do for two scrollers is keep their offsets together.
 *
 * Each listener writes the other's `scrollLeft` and stops there: assigning a
 * value a scroller already holds fires no scroll event, so the mirror settles
 * on the first bounce rather than needing a flag to guard it.
 */
export function initTimetable() {
  const head = document.querySelector<HTMLElement>("[data-tt-head]");
  const body = document.querySelector<HTMLElement>("[data-tt-body]");
  if (!head || !body) return;

  const mirror = (from: HTMLElement, to: HTMLElement) => () => {
    if (to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
  };

  body.addEventListener("scroll", mirror(body, head), { passive: true });
  head.addEventListener("scroll", mirror(head, body), { passive: true });
}
