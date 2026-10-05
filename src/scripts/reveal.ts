import { inView } from "motion";

/**
 * How much of an element has to be on screen before it reveals.
 *
 * `inView`'s `amount` is a fraction of the *element*, which only behaves while
 * elements are shorter than the window. The timetable is not: at 2800px, a
 * third of it is 840px, and a window shorter than that can never show 840px of
 * anything — so it sat at `opacity: 0` for the whole page, with no error
 * anywhere to say why. The old timetable was a grid half that height and
 * cleared the same threshold, which is why this only appeared when the grid
 * became a list.
 *
 * So the fraction is read as a share of the *window* instead, and only
 * tightened to `most` for an element short enough that the two agree. What it
 * asks for is then at most `most` of the viewport, which is always reachable —
 * the property the fixed fraction quietly lacked.
 */
const amountFor = (el: HTMLElement, most: number) => {
  const height = el.offsetHeight;
  if (!height) return most;
  return Math.min(most, (innerHeight * most) / height);
};

/**
 * Scroll reveals run on a CSS class, not on inline styles, so that hover
 * transforms on the same elements keep working once the reveal has finished.
 *
 * A `[data-stagger]` ancestor makes its children come in as one group in DOM
 * order; everything else reveals on its own.
 */
export function initReveal() {
  const all = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (!all.length) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    all.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
    const children = [...group.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (!children.length) return;

    inView(
      group,
      () => {
        children.forEach((el, i) => {
          // Cap the ramp so a long grid does not leave the last card waiting.
          el.style.transitionDelay = `${Math.min(i, 7) * 65}ms`;
          el.classList.add("is-revealed");
        });
      },
      { amount: amountFor(group, 0.1) },
    );
  });

  all
    .filter((el) => !el.closest("[data-stagger]"))
    .forEach((el) => {
      inView(el, () => el.classList.add("is-revealed"), {
        amount: amountFor(el, 0.3),
      });
    });
}
