import { scroll } from 'motion';

/** Travel in px across a full section pass, before the per-sticker speed. */
const RANGE = 130;

/**
 * The gutter stickers drift against the scroll at different rates, which gives
 * the flat sections some depth without anything moving over the text.
 *
 * Only ever runs above 1240px — below that `.props` is display:none, so there
 * is nothing to move and nothing to pay for.
 */
export function initParallax() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(min-width: 1241px)').matches) return;

  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = Number.parseFloat(el.dataset.parallax ?? '0');
    if (!speed) return;

    const section = el.closest<HTMLElement>('.sec, .band, .hero, .register');
    if (!section) return;

    scroll(
      (progress: number) => {
        // progress runs 0 → 1 across the section's whole pass through the
        // viewport; centre it so the sticker sits at rest mid-section.
        el.style.setProperty('--py', `${(progress - 0.5) * speed * RANGE}px`);
      },
      { target: section, offset: ['start end', 'end start'] },
    );
  });
}
