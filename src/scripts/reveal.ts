import { inView } from 'motion';

/**
 * Scroll reveals run on a CSS class, not on inline styles, so that hover
 * transforms on the same elements keep working once the reveal has finished.
 *
 * A `[data-stagger]` ancestor makes its children come in as one group in DOM
 * order; everything else reveals on its own.
 */
export function initReveal() {
  const all = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!all.length) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    all.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    const children = [...group.querySelectorAll<HTMLElement>('[data-reveal]')];
    if (!children.length) return;

    inView(
      group,
      () => {
        children.forEach((el, i) => {
          // Cap the ramp so a long grid does not leave the last card waiting.
          el.style.transitionDelay = `${Math.min(i, 7) * 65}ms`;
          el.classList.add('is-revealed');
        });
      },
      { amount: 0.1 },
    );
  });

  all
    .filter((el) => !el.closest('[data-stagger]'))
    .forEach((el) => {
      inView(el, () => el.classList.add('is-revealed'), { amount: 0.3 });
    });
}
