import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || "production",
  },

  /**
   * The subdomain `sanity deploy` publishes to: devfest26.sanity.studio.
   *
   * Setting it here is what makes the deploy non-interactive. Without it the
   * CLI asks which studio to deploy to, which on a CI runner means hanging
   * until the job times out. On the first deploy the hostname does not exist
   * yet and is created; every deploy after that overwrites it.
   */
  studioHost: "devfest26",

  vite: (config) => ({
    ...config,

    resolve: {
      ...config.resolve,

      /**
       * Sanity turns Vite's `resolve.tsconfigPaths` on for the Studio build.
       * Its resolver walks *up* from this directory for a tsconfig, so it
       * reaches the site's `tsconfig.json` at the repository root — whose
       * `extends: "astro/tsconfigs/strict"` only resolves when the site's
       * `node_modules` is installed. The Studio's deploy job installs only
       * `studio/`, so on CI the build died with "Tsconfig not found
       * astro/tsconfigs/strict" before it compiled a single file.
       *
       * Nothing here needs the feature: this Studio imports by relative path
       * and its own tsconfig declares no `paths`.
       */
      tsconfigPaths: false,
    },
  }),

  deployment: {
    appId: "szhkyjqvn58j1ktnyd7ow4x2",
  },
});
