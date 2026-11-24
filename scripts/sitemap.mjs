/**
 * The sitemap, written from the published site itself:
 *
 *   node scripts/sitemap.mjs <site-dir>
 *
 * Run by `publish` in `.github/workflows/build.yml` once every build has been
 * grafted onto `gh-pages`, so that it lists the whole site — every city in
 * every language, the ones this deploy left as they were included — and by
 * `pr-preview` on the same assembled tree, so a pull request can see what it
 * would publish.
 *
 * Taken from the pages rather than from the routes. A page is listed if it
 * names itself as its canonical URL: that is the one URL Google should index,
 * in the page's own words, and reading it from there means the sitemap cannot
 * list a URL the page itself disagrees with. That disagreement is what kept
 * most of the site out of the index while every canonical was slashless and
 * GitHub Pages redirected each one to the slashed URL that declared it — see
 * `src/lib/pagePath.ts`. A page with no canonical, one whose canonical points
 * elsewhere, or one that asks not to be indexed is left out, and the second
 * kind is reported, because on this site it is always a mistake.
 *
 * Writes two files at the root of `<site-dir>`:
 *
 * - `sitemap.xml`, the URLs alone. No `<lastmod>`: the build rewrites every
 *   page on every deploy, so the only date there is to give is "today" for all
 *   of them, which Google learns to ignore. No hreflang either; every page
 *   already carries its alternates in its `<head>`.
 * - `robots.txt`, with nothing in it but the `Sitemap:` line, so that crawlers
 *   other than Google's find it without being told. Cloudflare serves this host
 *   a managed robots.txt — the AI-crawler rules — and adds them in front of
 *   whatever the origin answers, so this file adds to those rules rather than
 *   replacing them. It has no rules of its own to conflict with.
 *
 * A site with no canonical URLs at all is one built without `SITE_URL`, and
 * there is no origin to write a sitemap for. That is not an error — the build
 * treats it the same way — so it says so and writes nothing.
 *
 * Plain Node, no dependencies: `publish` runs it from a sparse checkout with
 * nothing installed.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("usage: node scripts/sitemap.mjs <site-dir>");
  process.exit(2);
}

/** Every `index.html` under `dir`, skipping git metadata and built assets. */
function* pages(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "_astro") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* pages(path);
    else if (entry.name === "index.html") yield path;
  }
}

/** The tags called `name` in `html`, each as a map of its attributes. */
function tags(html, name) {
  const found = [];
  for (const [tag] of html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))) {
    const attributes = new Map();
    // The tag's own name is read as a valueless attribute too; nothing asks
    // for it, so it does no harm.
    for (const [, key, double, single, bare] of tag.matchAll(
      /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g,
    )) {
      attributes.set(key.toLowerCase(), decode(double ?? single ?? bare ?? ""));
    }
    found.push(attributes);
  }
  return found;
}

function decode(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const listed = [];
const elsewhere = [];
let noindex = 0;
let uncanonical = 0;

for (const file of pages(root)) {
  // `kansai/sessions/x/index.html` is served at `/kansai/sessions/x/`.
  const dir = relative(root, file).split(sep).slice(0, -1).join("/");
  const own = dir ? `/${dir}/` : "/";
  const html = readFileSync(file, "utf8");

  const robots = tags(html, "meta").find(
    (meta) => meta.get("name")?.toLowerCase() === "robots",
  );
  if (robots?.get("content")?.toLowerCase().includes("noindex")) {
    noindex++;
    continue;
  }

  const canonical = tags(html, "link").find((link) =>
    link.get("rel")?.toLowerCase().split(/\s+/).includes("canonical"),
  );
  const href = canonical?.get("href");
  if (!href) {
    uncanonical++;
    continue;
  }

  const url = new URL(href);
  if (decodeURIComponent(url.pathname) !== own) {
    elsewhere.push(`${own} → ${href}`);
    continue;
  }
  listed.push(url);
}

if (listed.length === 0) {
  const why =
    uncanonical > 0
      ? `none of its ${uncanonical} pages has a canonical URL — was SITE_URL set for the build?`
      : "it has no pages to list";
  console.log(`::warning::no sitemap written for ${root}: ${why}`);
  process.exit(0);
}

const origins = [...new Set(listed.map((url) => url.origin))];
if (origins.length > 1) {
  console.log(
    `::error::the canonical URLs under ${root} are on ${origins.length} origins (${origins.join(", ")}); a sitemap covers one`,
  );
  process.exit(1);
}

const locs = listed.map((url) => url.href).sort();
writeFileSync(
  join(root, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    locs.map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>\n`).join("") +
    "</urlset>\n",
);
writeFileSync(join(root, "robots.txt"), `Sitemap: ${origins[0]}/sitemap.xml\n`);

console.log(`sitemap.xml: ${locs.length} pages on ${origins[0]}`);
if (noindex > 0) console.log(`  left out ${noindex} marked noindex`);
if (uncanonical > 0) console.log(`  left out ${uncanonical} with no canonical`);
// One annotation, however many pages: Actions keeps only the first few of a
// step's, and the list below is what to read anyway.
if (elsewhere.length > 0) {
  console.log(
    `::warning::left ${elsewhere.length} pages out of the sitemap because their canonical URL is another page's`,
  );
  for (const line of elsewhere) console.log(`  ${line}`);
}
