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
});
