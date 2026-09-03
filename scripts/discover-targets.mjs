/**
 * The build matrix, as two JSON arrays:
 *
 *   node --experimental-strip-types scripts/discover-targets.mjs
 *   cities=["kansai","tokyo"]
 *   targets=["portal","kansai"]
 *
 * Run by the `discover` job in `.github/workflows/build.yml`. The difference
 * between the two lists is the whole point of the file:
 *
 * - `cities` is every city the CMS holds. `publish` deletes the published
 *   directories that are *not* in it, because a city missing from this list is
 *   a city someone deleted in the Studio.
 * - `targets` is the subset this run rebuilds, which is what the matrix reads.
 *
 * Narrowing `cities` to the subset would therefore take the other cities off
 * the site. They are kept apart deliberately.
 *
 * Deliberately runs on a bare checkout with no `pnpm install` behind it, which
 * is why it goes through `src/tenants/discovery.ts` — plain `fetch`, no
 * dependencies — rather than the Sanity client the site itself uses.
 */

import { appendFileSync } from "node:fs";
import { discoverCitySlugs } from "../src/tenants/discovery.ts";
import { PORTAL_TARGET } from "../src/tenants/ids.ts";

/**
 * What the caller asked to rebuild, or `null` for everything.
 *
 * Two shapes arrive here in `DEPLOY_TARGETS`: a JSON array from the Studio's
 * deploy document, and whatever someone typed into the `workflow_dispatch`
 * box. Both are read here rather than in the workflow so that neither ever
 * reaches a shell.
 */
function askedFor(raw) {
  // `toJSON` of a key the CMS did not send interpolates as the four
  // characters `null`, which is a request for everything and not a city name.
  const value = (raw ?? "").trim();
  if (!value || value === "null") return null;

  let names;
  if (value.startsWith("[")) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed))
      throw new Error(`DEPLOY_TARGETS is not an array: ${value}`);
    names = parsed.map((name) => String(name).trim());
  } else {
    names = value.split(/[\s,]+/);
  }

  // Naming nothing is how both callers say "everything": an empty box, and a
  // deploy document whose city list was left empty.
  const wanted = names.filter(Boolean);
  return wanted.length > 0 ? wanted : null;
}

const cities = await discoverCitySlugs();
const asked = askedFor(process.env.DEPLOY_TARGETS);

// Who pressed the button, when it was the Studio. Only ever printed: "why is
// this building" is a question the run's own log should answer, and the CMS is
// the only place that knows. Quoted, so that a name cannot start a line with
// `::` and become a workflow command.
if (process.env.DEPLOY_BY)
  console.log(`requested by ${JSON.stringify(process.env.DEPLOY_BY)}`);

// The intersection, not the request itself. `DEPLOY_TARGETS` is written by
// whoever can edit the CMS, so a name that is not a city becomes a warning
// rather than a build job for a directory that does not exist.
const chosen =
  asked === null ? cities : cities.filter((c) => asked.includes(c));

for (const name of asked ?? []) {
  // Quoted through JSON, for the same reason as the name above: a workflow
  // command is a line that starts with `::`, and a newline inside a name from
  // the CMS would otherwise be able to start one.
  if (name !== PORTAL_TARGET && !cities.includes(name))
    console.log(
      `::warning::${JSON.stringify(name)} is not a city in the CMS; ignoring it`,
    );
}

// The front page comes along with any city. Its cards print the city's own
// slug, title, theme, dates and venue, so rebuilding 関西 without it would
// leave the card describing the previous version.
const targets = [PORTAL_TARGET, ...chosen];

const outputs = {
  cities: JSON.stringify(cities),
  targets: JSON.stringify(targets),
};

for (const [name, json] of Object.entries(outputs))
  console.log(`${name}=${json}`);

// GitHub Actions reads them from here; a local run just sees the lines above.
if (process.env.GITHUB_OUTPUT) {
  for (const [name, json] of Object.entries(outputs))
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${json}\n`);
}
