import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import type { AstroIntegration } from "astro";
import { previewMode } from "./src/preview/mode";
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
 * `src/tenants/index.ts`. In the draft preview there is nothing to expand at
 * build time, so those exports are ignored (Astro says so, once per route) and
 * each page resolves its own props from `Astro.params` instead — see
 * `src/city/params.ts`.
 */
const routes: AstroIntegration = {
  name: "devfest:routes",
  hooks: {
    "astro:config:setup": ({ injectRoute, injectScript }) => {
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
        // Only built with OG_PREVIEW set; see the route itself. The preview
        // renders on demand, where `getStaticPaths` decides nothing and the
        // route would answer for every city — so it is left out entirely.
        if (!previewMode) {
          inject("/[tenant]/og-preview", "./src/city/OgPreview.astro");
        }
      }

      if (previewMode) {
        // What could not be rendered, and when the content was read. Read by
        // the bar at the foot of every preview page.
        inject("/preview/status", "./src/preview/status.ts");
        // Astro serves this for anything that still throws. There is no
        // equivalent in a static build — a page that failed there failed the
        // build — so it exists only here.
        inject("/500", "./src/preview/Error.astro");

        /*
          Sanity's click-to-edit overlays, on every preview page.

          Injected here rather than imported behind `if (previewMode)` in
          `src/scripts/main.ts`, and the difference is not stylistic. A
          conditional `import()` there does get its call removed from the
          published bundle — but the module graph was already built by then,
          so the chunk is still *emitted*: three orphan files and 734 kB of
          React and overlay code, published to a static host where nothing
          would ever load them. Injecting keeps the module out of the
          published graph entirely, which is the same reason the two routes
          above are injected rather than filed under `src/pages/`.
        */
        injectScript(
          "page",
          `import { init } from "/src/preview/visualEditing.ts"; init();`,
        );
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
   * The published site is a directory of files; the draft preview is a
   * Cloudflare Worker that renders each request from whatever is in the Studio
   * at that moment. Same routes, same components, same schemas — see
   * `src/preview/mode.ts` for the whole of what differs.
   */
  output: previewMode ? "server" : "static",
  /**
   * Pointed at the gate's own config, because the gate is the Worker: `main`
   * there is `preview/src/index.ts`, which authenticates and only then hands
   * the request to this adapter's handler. It has to be that way round —
   * the handler serves static assets itself, before any Astro middleware
   * would run, so a gate inside the app would leave `/_astro/*` open.
   */
  adapter: previewMode
    ? cloudflare({
        configPath: "preview/wrangler.jsonc",
        /**
         * Neither of the bindings this adapter reaches for by default is
         * wanted here, and both would be a binding the deploy has to be given
         * something real for.
         *
         * Images: every photo on the Sanity path is already a URL on Sanity's
         * CDN, cropped to the hotspot an organiser set — see
         * `src/lib/sanity/image.ts`. There is nothing left for an image
         * service to transform, so it passes them through.
         */
        imageService: "passthrough",
      })
    : undefined,
  /**
   * KV sessions, the other default binding. Nothing in this site has a session
   * — the only one in the deployment is the sign-in cookie, which belongs to
   * the gate and is encrypted into the cookie itself.
   */
  session: previewMode ? false : undefined,
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
    define: {
      /**
       * Which of the two this is, decided once and substituted in. A constant
       * rather than an environment read, because the preview's own branches
       * run inside a Worker where `process.env` is only reliably populated
       * during a request — and because it lets the published build drop every
       * preview-only branch instead of shipping it. See `src/preview/mode.ts`.
       */
      __PREVIEW__: JSON.stringify(previewMode),
    },
    build: {
      cssMinify: "lightningcss",
    },
  },
});
