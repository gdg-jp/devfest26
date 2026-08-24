import { initCountdown } from "./countdown";
import { initIntro } from "./intro";
import { initNav } from "./nav";
import { initParallax } from "./parallax";
import { initReveal } from "./reveal";

declare global {
  interface Window {
    __dfMotionFallback?: number;
  }
}

// The inline script in Base.astro arms a fallback that un-hides everything if
// this bundle never arrives. It did, so stand it down.
if (window.__dfMotionFallback) {
  clearTimeout(window.__dfMotionFallback);
  delete window.__dfMotionFallback;
}

/**
 * Each module decides for itself what `prefers-reduced-motion` means for it,
 * so this stays a plain list rather than a set of conditionals.
 */
initCountdown();
initNav();
initReveal();
initParallax();
initIntro();
