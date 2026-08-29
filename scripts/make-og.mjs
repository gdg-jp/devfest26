/**
 * Renders public/og/<city>.png for every city.
 *
 *   pnpm og            # every city
 *   pnpm og kansai     # just one
 *
 * The card itself is `src/pages/[tenant]/og-preview.astro`, which reads the
 * same tenant config the site does — so the image cannot drift from the page.
 * That route only exists when OG_PREVIEW is set, so it never ships.
 *
 * Requires Google Chrome (set CHROME_PATH to override) and a network
 * connection, because the card uses Google Fonts.
 *
 * This is a manual step, not part of `pnpm build`: the card changes only when
 * the title, date, venue or theme changes.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { discoverCitySlugs } from "../src/tenants/discovery.ts";

const WIDTH = 1200;
const HEIGHT = 630;
// Chrome's window includes furniture, so shoot a larger frame and crop the
// card out of the top-left corner. Sizing the window exactly gives a viewport
// a little smaller than the window and clips the card.
const FRAME = [WIDTH + 200, HEIGHT + 270];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error("Chrome not found. Set CHROME_PATH to the executable.");
  process.exit(1);
}

// The cities are whatever the CMS holds, so the argument is checked against
// that rather than against a list in this repository.
const known = await discoverCitySlugs();
const requested = process.argv.slice(2);
for (const t of requested) {
  if (!known.includes(t)) {
    console.error(`Unknown city "${t}". Known: ${known.join(", ")}`);
    process.exit(1);
  }
}
const targets = requested.length ? requested : known;

mkdirSync("public/og", { recursive: true });
const shots = resolve("node_modules/.cache/og");
mkdirSync(shots, { recursive: true });

for (const tenant of targets) {
  console.log(`\n── ${tenant} ─────────────────────────────`);

  execFileSync(
    process.execPath,
    ["node_modules/astro/bin/astro.mjs", "build"],
    {
      stdio: "inherit",
      env: { ...process.env, TARGETS: tenant, OG_PREVIEW: "1" },
    },
  );

  // `TARGETS=<city>` puts the build in dist/<city>/, and the route inside it
  // is /<city>/og-preview.
  const page = resolve(`dist/${tenant}/${tenant}/og-preview/index.html`);
  if (!existsSync(page)) throw new Error(`Card was not built for ${tenant}`);

  const raw = join(shots, `${tenant}.png`);
  rmSync(raw, { force: true });

  execFileSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${FRAME.join(",")}`,
      "--virtual-time-budget=8000",
      `--user-data-dir=${resolve("node_modules/.cache/og-chrome")}`,
      `--screenshot=${raw}`,
      pathToFileURL(page).href,
    ],
    { stdio: "inherit" },
  );

  if (!existsSync(raw)) throw new Error(`Chrome wrote no file for ${tenant}`);

  const out = resolve(`public/og/${tenant}.png`);
  await sharp(readFileSync(raw))
    .extract({ left: 0, top: 0, width: WIDTH, height: HEIGHT })
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log(`wrote public/og/${tenant}.png`);
}

console.log(
  "\nRebuild normally before deploying — these builds included the OG route.",
);
