import { initReveal, initSplit } from "./reveal";
import { initCarousels } from "./carousel";
import { initPanels } from "./panel";
import { initOverview } from "./overview";
import {
  initFaq,
  initMagnets,
  initMarquee,
  initMenu,
  initTilt,
} from "./interact";

declare global {
  interface Window {
    __tk26Ready?: boolean;
  }
}

/**
 * Tokyo's motion, in one bundle — Kansai's, less the key visual and the
 * splash, since Tokyo opens on the shared hero. Every module finds its own
 * hooks and does nothing on a page without them.
 */
window.__tk26Ready = true;

initPanels();
initSplit();
initReveal();
initCarousels();
initMarquee();
initMagnets();
initTilt();
initFaq();
initOverview();
initMenu();
