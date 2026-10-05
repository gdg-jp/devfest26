import { initSplash } from "./splash";
import { initHero } from "./hero";
import { initKv } from "./kv";
import { initReveal, initSplit } from "./reveal";
import { initCarousels } from "./carousel";
import { initPanels } from "./panel";
import {
  initFaq,
  initMagnets,
  initMarquee,
  initMenu,
  initSticky,
  initTilt,
} from "./interact";

declare global {
  interface Window {
    __k26Ready?: boolean;
  }
}

/**
 * Kansai's motion, in one bundle. Every module finds its own hooks and does
 * nothing on a page without them. The hero goes first so that it is armed
 * before the splash announces the intro; the splash goes last because it may
 * announce it immediately.
 */
window.__k26Ready = true;

initHero();
initKv();
initPanels();
initSplit();
initReveal();
initCarousels();
initMarquee();
initMagnets();
initTilt();
initFaq();
initMenu();
initSticky();
initSplash();
