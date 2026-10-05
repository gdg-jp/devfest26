import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { previewMode } from "./src/preview/mode";
import { LANGUAGES, langPrefix, langPrefixOf } from "./src/i18n/language";
import { routeTable, type RouteFile } from "./src/lib/routeTable";
import { offBrandColors } from "./src/lib/brandColors";
import { ogCards } from "./src/lib/ogCards";
import {
  anyCity,
  mayBuildCity,
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
 * The pages are in `src/routes/`, laid out the way `src/pages/` would lay them
 * out — the path of a file is its URL — and read into a table by
 * `src/lib/routeTable.ts`. They are injected from there rather than filed
 * under `src/pages/` because a page in that directory is built whether or not
 * it renders anything:
 *
 * - A front-page build with the city routes present emits every city
 *   stylesheet and the whole motion bundle beside a page that references none
 *   of it.
 * - A one-city build with the front page present emits a second, unwanted copy
 *   of the site's front door into output that is grafted on under `/kansai`.
 * - A city's own page, `src/routes/kansai/index.astro`, is a static route. In
 *   `src/pages/` every build would render it — Tokyo's included, which has
 *   not fetched a single Kansai document.
 *
 * Selecting the entrypoints keeps one module graph per build, which is the
 * property the separate per-city builds used to give.
 *
 * The shared city pages are in `src/routes/[tenant]/`. `getStaticPaths` on
 * each one expands `[tenant]` over the cities this build resolved — see
 * `buildableCities` in `src/tenants/index.ts`. In the draft preview there is
 * nothing to expand at build time, so those exports are ignored (Astro says
 * so, once per route) and each page resolves its own props from
 * `Astro.params` instead — see `src/lib/cityRoutes.ts`.
 */
const routes: AstroIntegration = {
  name: "devfest:routes",
  hooks: {
    "astro:config:setup": ({
      command,
      config,
      injectRoute,
      injectScript,
      logger,
      updateConfig,
    }) => {
      const root = fileURLToPath(config.root);
      const table = routeTable(root);

      /*
        The language prefixes this build answers on.

        A static build has exactly one — it *is* a language, the same way it is
        a set of cities, and `/en/kansai` belongs to the English build's
        output. The preview has both, for the same reason it has every city
        rather than the one `TARGETS` asked for: it is a single deployment
        resolving each request as it arrives, so the language is a segment of
        the URL rather than a property of the build.

        Injecting a pattern twice against the same entrypoint is how that is
        said. Astro keeps both routes and shares the component between them, so
        this widens the route table without widening the bundle. Which of the
        two a request is in is then read back off the URL, once, by
        `src/middleware.ts`.
      */
      const prefixes = previewMode ? LANGUAGES.map(langPrefixOf) : [langPrefix];

      const inject = ({ pattern, entrypoint }: RouteFile) => {
        for (const prefix of prefixes) {
          injectRoute({
            pattern: pattern === "/" ? prefix || "/" : `${prefix}${pattern}`,
            entrypoint,
          });
        }
      };

      if (portalSelected) table.portal.forEach(inject);

      if (anyCity) {
        for (const route of table.shared) {
          // The OG card, built to be screenshotted and then deleted; see
          // `src/lib/ogCards.ts`. The preview renders on demand, where
          // `getStaticPaths` decides nothing and the route would answer for
          // every city — so it is left out entirely, and with it any question
          // of which language it would be in.
          if (previewMode && route.pattern === "/[tenant]/og-preview") continue;
          inject(route);
        }

        /*
          Each city's own directory, if this build may be making that city.

          The preview takes every one, as it takes every city. A static build
          takes the ones `TARGETS` names — so a Tokyo job never compiles
          Kansai's pages, its components or its stylesheet — or, with no
          `TARGETS`, all of them, and a page whose city turns out not to exist
          writes nothing; see `missingCity` in `src/lib/cityRoutes.ts`.
        */
        for (const [slug, city] of table.cities) {
          if (!previewMode && !mayBuildCity(slug)) continue;

          city.routes.forEach(inject);

          // Into every page, not just the city's own: its session and speaker
          // pages are the shared ones, and they are that city's pages too. The
          // rules are scoped by `data-city`, so where several cities share a
          // build, each stylesheet only ever matches its own.
          if (city.stylesheet) {
            injectScript(
              "page-ssr",
              `import ${JSON.stringify(city.stylesheet)};`,
            );
          }

          // Held to the brand palette — see `src/lib/brandColors.ts`. A
          // warning while working on it, so a stray colour does not take the
          // dev server down mid-edit; an error in a build, so it is never
          // published.
          const problems = city.styled.flatMap((file) =>
            offBrandColors(root, file),
          );
          if (problems.length > 0) {
            const message =
              `src/routes/${slug}/ uses colours outside the DevFest palette:\n` +
              problems.map((problem) => `  ${problem}`).join("\n") +
              `\nUse the tokens in src/styles/tokens.css. A colour the brand ` +
              `does not have is a decision to make first, not a line of CSS.`;
            if (command === "build") throw new Error(message);
            logger.warn(message);
          }
        }
      }

      updateConfig({
        vite: {
          define: {
            /**
             * Every path some city answers from its own directory, so that the
             * shared routes can leave those out of `getStaticPaths` — see
             * `exceptOwned` in `src/lib/cityRoutes.ts`. All of them, not just
             * this build's: a city outside the build is absent from the shared
             * routes' paths as well, so listing it changes nothing.
             */
            __CITY_ROUTES__: JSON.stringify(
              [...table.cities.values()].flatMap((city) =>
                city.routes.map((route) => route.pattern),
              ),
            ),
          },
        },
      });

      if (previewMode) {
        // What could not be rendered, and when the content was read. Read by
        // the bar at the foot of every preview page.
        injectRoute({
          pattern: "/preview/status",
          entrypoint: "./src/preview/status.ts",
        });
        // Astro serves this for anything that still throws. There is no
        // equivalent in a static build — a page that failed there failed the
        // build — so it exists only here.
        injectRoute({
          pattern: "/500",
          entrypoint: "./src/preview/Error.astro",
        });

        /*
          Sanity's click-to-edit overlays, on every preview page.

          Injected here rather than imported behind `if (previewMode)` in
          `src/scripts/main.ts`, and the difference is not stylistic. A
          conditional `import()` there does get its call removed from the
          published bundle — but the module graph was already built by then,
          so the chunk is still *emitted*: three orphan files and 734 kB of
          React and overlay code, published to a static host where nothing
          would ever load them. Injecting keeps the module out of the
          published graph entirely, which is the same reason the pages are
          injected rather than filed under `src/pages/`.
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
  integrations: [routes, ogCards],
  trailingSlash: "never",
  /**
   * Two routes rendering the same path is always a mistake here, never a
   * choice: the shared city routes step aside for a city's own pages rather
   * than lose to them (`exceptOwned` in `src/lib/cityRoutes.ts`), so a
   * collision that is left means something was missed. Astro's default is to
   * warn and carry on with whichever route ranks higher.
   */
  prerenderConflictBehavior: "error",
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
    assets: soleCity
      ? [langPrefix.slice(1), soleCity, "_astro"].filter(Boolean).join("/")
      : "_astro",
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
