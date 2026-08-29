import { defineConfig } from "astro/config";
import type { AstroIntegration } from "astro";
import {
  anyCity,
  portalSelected,
  soleCity,
  targetKey,
} from "./src/tenants/selection";

/**
 * Absolute URLs (canonical, Open Graph, JSON-LD) need the production origin.
 * Set SITE_URL in the deploy environment; without it those tags are simply
 * omitted rather than pointing somewhere wrong.
 *
 * One origin covers everything: the cities live under `/kansai` and `/tokyo`
 * on the same host as the front page.
 */
const site = process.env.SITE_URL;

/**
 * Every route this build produces, chosen by what it was asked for.
 *
 * They are injected rather than filed under `src/pages/` because a page in
 * that directory is built whether or not it renders anything. A front-page
 * build with the city routes present emits every city stylesheet and the whole
 * motion bundle beside a page that references none of it; a one-city build
 * with the front page present emits a second, unwanted copy of the site's
 * front door into output that is grafted on under `/kansai`. Selecting the
 * entrypoints keeps one module graph per build, which is the property the
 * three separate builds used to give.
 *
 * The city pages live in `src/city/`. `getStaticPaths` on each one expands
 * `[tenant]` over the cities this build resolved — see `buildableCities` in
 * `src/tenants/index.ts`.
 */
const routes: AstroIntegration = {
  name: "devfest:routes",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      const inject = (pattern: string, entrypoint: string) =>
        injectRoute({ pattern, entrypoint });

      if (portalSelected) {
        inject("/", "./src/portal/Home.astro");
      }

      if (anyCity) {
        inject("/[tenant]", "./src/city/Home.astro");
        inject("/[tenant]/sessions/[slug]", "./src/city/Session.astro");
        inject("/[tenant]/speakers/[slug]", "./src/city/Speaker.astro");
        inject("/[tenant]/talks/[slug]", "./src/city/Talk.astro");
        inject("/[tenant]/favicon.svg", "./src/city/favicon.ts");
        // Only built with OG_PREVIEW set; see the route itself.
        inject("/[tenant]/og-preview", "./src/city/OgPreview.astro");
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [routes],
  trailingSlash: "never",
  /**
   * No `base`. The cities are not separate sites mounted on paths any more —
   * they are routes, `/[tenant]/...`, in one site whose root is the origin.
   * Internal links go through `tenantPath` in `src/lib/url.ts`, which knows
   * which city it is writing for; a hand-written root-absolute path would
   * point at whichever city came first.
   */
  // One directory per target set, so building a subset locally does not
  // silently overwrite the last one's output. The content store is persistent
  // and keyed by collection name rather than by city, so a shared cache would
  // also carry the previous build's cities into this one — hence the same key
  // for `cacheDir`.
  outDir: `./dist/${targetKey}`,
  cacheDir: `./node_modules/.astro/${targetKey}`,
  build: {
    /**
     * A build of one city and nothing else is grafted onto the publish branch
     * as `/<city>/` and has to be complete on its own, so its stylesheets and
     * scripts go inside it rather than to a shared root directory that job
     * does not publish. A build that also makes the front page owns the root
     * and keeps the default, sharing one copy across every city in it.
     *
     * See the `publish` job in `.github/workflows/build.yml`.
     */
    assets: soleCity ? `${soleCity}/_astro` : "_astro",
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
