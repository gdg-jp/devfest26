/**
 * Session cards from the command line — the same drawing the build does
 * (`src/lib/og/render.ts`), from either of two sources.
 *
 * From the site's own programme (Sanity, or the Markdown in src/content):
 *
 *   pnpm og:session <slug> [--lang ja|en]   one session
 *   pnpm og:sessions [--lang ja|en|all]     every session
 *
 * These run a build of the city with OG_EXPORT set, which writes only the
 * cards' data (`src/routes/tokyo/og/sessions.json.ts`), then draw from it.
 * Each card's data is written next to its PNG, so it can be edited and drawn
 * again with og:card.
 *
 * From JSON, for a card the site does not have — a slide, a draft:
 *
 *   pnpm og:card <file.json | directory> [...]
 *
 * A file holds one card or an array of them; a directory, every .json file
 * in it. The shape is `CardInput` in `src/lib/og/input.ts`; see
 * `scripts/og-card.example.json`. A photo given as a relative path is read
 * from beside the JSON file.
 *
 * Options, for all three:
 *   --out <dir>      where the PNGs go (default dist/og-cards)
 *   --width <px>     PNG width; the height follows (default 1200, i.e. 630)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { renderCard } from "../src/lib/og/render";
import type { CardInput } from "../src/lib/og/input";

const CITY = "tokyo";
const LANGS = ["ja", "en"] as const;
type Lang = (typeof LANGS)[number];

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    lang: { type: "string", default: "ja" },
    out: { type: "string", default: "dist/og-cards" },
    width: { type: "string", default: "1200" },
  },
});
const [command, ...args] = positionals;
const width = Number(values.width);
const out = resolve(values.out!);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function draw(card: CardInput, dir: string) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${card.id}.png`);
  await writeFile(file, await renderCard(card, { width }));
  console.log(`wrote ${file}`);
}

/** The site's cards in one language, by way of an export build. */
async function siteCards(lang: Lang): Promise<CardInput[]> {
  console.log(`── reading the ${lang} programme ──`);
  execFileSync(
    process.execPath,
    ["node_modules/astro/bin/astro.mjs", "build", "--silent"],
    {
      stdio: "inherit",
      env: { ...process.env, TARGETS: CITY, SITE_LANG: lang, OG_EXPORT: "1" },
    },
  );
  const prefix = lang === "ja" ? "" : `${lang}/`;
  const file = `dist/og-export/${lang}-${CITY}/${prefix}${CITY}/og/sessions.json`;
  if (!existsSync(file)) fail(`The export build wrote no ${file}.`);
  return JSON.parse(await readFile(file, "utf8")) as CardInput[];
}

/** One card or many, from a file or every file in a directory. */
async function jsonCards(path: string): Promise<CardInput[]> {
  if (statSync(path).isDirectory()) {
    const files = readdirSync(path).filter((name) => name.endsWith(".json"));
    return (
      await Promise.all(files.map((f) => jsonCards(join(path, f))))
    ).flat();
  }
  const data = JSON.parse(await readFile(path, "utf8")) as
    CardInput | CardInput[];
  const here = dirname(resolve(path));
  // A relative photo path means beside the JSON, not wherever this was run.
  return (Array.isArray(data) ? data : [data]).map((card) => ({
    ...card,
    speakers: card.speakers.map((speaker) =>
      typeof speaker.photo === "string" &&
      !/^https?:\/\//.test(speaker.photo) &&
      !isAbsolute(speaker.photo)
        ? { ...speaker, photo: join(here, speaker.photo) }
        : speaker,
    ),
  }));
}

const langs = (): Lang[] => {
  if (values.lang === "all") return [...LANGS];
  if (!LANGS.includes(values.lang as Lang)) {
    fail(`--lang is one of ${LANGS.join(", ")} or all, not "${values.lang}".`);
  }
  return [values.lang as Lang];
};

switch (command) {
  case "session": {
    const [slug] = args;
    if (!slug) fail("Usage: pnpm og:session <slug> [--lang ja|en]");
    for (const lang of langs()) {
      const card = (await siteCards(lang)).find((c) => c.id === slug);
      if (!card) fail(`No ${lang} session "${slug}" with a title.`);
      const dir = join(out, lang);
      mkdirSync(dir, { recursive: true });
      await writeFile(join(dir, `${slug}.json`), JSON.stringify(card, null, 2));
      await draw(card, dir);
    }
    break;
  }

  case "sessions": {
    for (const lang of langs()) {
      const dir = join(out, lang);
      mkdirSync(dir, { recursive: true });
      for (const card of await siteCards(lang)) {
        await writeFile(
          join(dir, `${card.id}.json`),
          JSON.stringify(card, null, 2),
        );
        await draw(card, dir);
      }
    }
    break;
  }

  case "card": {
    if (!args.length) fail("Usage: pnpm og:card <file.json | directory> [...]");
    for (const path of args) {
      if (!existsSync(path)) fail(`No such file or directory: ${path}`);
      for (const card of await jsonCards(path)) await draw(card, out);
    }
    break;
  }

  default:
    fail("Usage: pnpm og:session <slug> | og:sessions | og:card <json>");
}
