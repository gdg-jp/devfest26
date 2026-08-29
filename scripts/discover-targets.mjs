/**
 * The build matrix, as a JSON array: `["portal","kansai","tokyo"]`.
 *
 *   node --experimental-strip-types scripts/discover-targets.mjs
 *
 * Run by the `discover` job in `.github/workflows/build.yml`, which turns the
 * output into one build job per target. That is how a city published in the
 * Studio gets a page without anyone editing the workflow.
 *
 * Deliberately runs on a bare checkout with no `pnpm install` behind it, which
 * is why it goes through `src/tenants/discovery.ts` — plain `fetch`, no
 * dependencies — rather than the Sanity client the site itself uses.
 */

import { appendFileSync } from "node:fs";
import { discoverCitySlugs } from "../src/tenants/discovery.ts";
import { PORTAL_TARGET } from "../src/tenants/ids.ts";

const targets = [PORTAL_TARGET, ...(await discoverCitySlugs())];
const json = JSON.stringify(targets);

console.log(json);

// GitHub Actions reads it from here; a local run just sees the line above.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `targets=${json}\n`);
}
