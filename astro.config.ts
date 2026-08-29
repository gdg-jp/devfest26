import { defineConfig } from "astro/config";
import type { AstroIntegration } from "astro";
import { activeTenant } from "./src/tenants/active";
import { isPortal } from "./src/portal/active";

/**
 * Absolute URLs (canonical, Open Graph, JSON-LD) need the production origin.
 * Set SITE_URL in the deploy environment; without it those tags are simply
 * omitted rather than pointing somewhere wrong.
 *
 * One origin now covers every build: the cities live under `/kansai` and
 * `/tokyo` on the same host as the portal.
 */
const site = process.env.SITE_URL;

/** Which of the three builds this is. The portal has no city. */
const target = isPortal ? "portal" : activeTenant;

/**
 * The root route is two different pages: a city's long home page, or the
 * portal's list of every city.
 *
 * Injected rather than branched inside `src/pages/index.astro`, because a
 * branch keeps both components in the module graph — the portal would ship
 * every city stylesheet and speaker photo behind a condition that is false.
 * One entrypoint per build means one module graph.
 */
const homeRoute: AstroIntegration = {
  name: "devfest:home-route",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      injectRoute({
        pattern: "/",
        entrypoint: isPortal
          ? "./src/portal/Home.astro"
          : "./src/home/Tenant.astro",
      });
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [homeRoute],
  trailingSlash: "never",
  /**
   * Each city is mounted on a path of its own; the portal is the root. Astro
   * does not rewrite hrefs, so every internal link goes through `withBase` in
   * `src/lib/url.ts` — a hand-written root-absolute path would escape its own
   * site.
   */
  base: isPortal ? undefined : `/${activeTenant}`,
  // One directory per build, so building a second one locally does not
  // silently overwrite the first one's output. `.github/workflows/build.yml`
  // assembles all three into a single site.
  outDir: `./dist/${target}`,
  // The content store is persistent and keyed by collection name, not by
  // tenant, so a shared cache carries the previous city's entries into this
  // build. Give each one its own — without this, `pnpm build:all` produces a
  // second site contaminated with the first one's sessions and speakers.
  cacheDir: `./node_modules/.astro/${target}`,
  build: {
    // The OG card is screenshotted straight off disk, where a `/_astro/...`
    // stylesheet href resolves to nothing. Inlining makes that build
    // self-contained; normal builds keep the default split.
    inlineStylesheets: process.env.OG_PREVIEW ? "always" : "auto",
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
    },
  },
});
