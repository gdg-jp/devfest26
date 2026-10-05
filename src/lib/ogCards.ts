import type { AstroIntegration } from "astro";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { previewMode } from "../preview/mode";
import { OG_CARD_PENDING, ogCardFile } from "./og";

/**
 * Makes each city's Open Graph card as part of the build that makes its pages.
 *
 * The card is `src/routes/[tenant]/og-preview.astro`, an ordinary page built
 * alongside the rest from the same tenant config — so it says what the page
 * says. Once the build is written, this serves the output directory on
 * localhost, has Chrome screenshot each card page, and then:
 *
 * 1. saves the PNG into the card's own city directory, named for what it says
 *    (`kansai/og.<hash>.png`, `en/kansai/og.<hash>.png`);
 * 2. deletes the card page, which was only ever there to be photographed;
 * 3. replaces the placeholder that city's pages wrote for the file name — see
 *    `src/lib/og.ts` for why the name is not known any earlier.
 *
 * Inside the city's directory rather than in a shared `og/` at the root,
 * because that directory is the unit `publish` in `.github/workflows/build.yml`
 * swaps in. A city's job publishes its own card along with the pages that
 * point at it, and the next deploy of that city takes the old one away with
 * the old pages.
 *
 * Served over HTTP rather than opened from disk because the page's stylesheets
 * are root-absolute — `/kansai/_astro/….css` — and resolve to nothing under
 * `file://`. Chrome runs as a child process with no library in between: one
 * command line per card, the way it was run by hand before this existed.
 */

const WIDTH = 1200;
const HEIGHT = 630;
// Chrome's window includes furniture, so shoot a larger frame and crop the
// card out of the top-left corner. Sizing the window exactly gives a viewport
// a little smaller than the window and clips the card.
const FRAME = [WIDTH + 200, HEIGHT + 270];

const run = promisify(execFile);

/** The Chrome this build will use, if it makes cards at all. */
let chrome: string | undefined;

export const ogCards: AstroIntegration = {
  name: "devfest:og-cards",
  hooks: {
    "astro:config:setup": ({ command, logger, updateConfig }) => {
      chrome = command === "build" && !previewMode ? findChrome() : undefined;

      if (command === "build" && !previewMode && !chrome) {
        const message =
          "Chrome was not found, so this build makes no OG cards and its " +
          "pages carry no og:image. Set CHROME_PATH to the executable.";
        // A deploy without cards would publish link previews with no image
        // and nothing red to say so.
        if (process.env.CI) throw new Error(message);
        logger.warn(message);
      }

      updateConfig({
        vite: {
          define: { __OG_CARDS__: JSON.stringify(Boolean(chrome)) },
        },
      });
    },

    "astro:build:done": async ({ dir, pages, logger }) => {
      if (!chrome) return;

      // `resolve` drops the trailing separator the URL carries, which
      // `locate` and the report at the end both rely on.
      const root = resolve(fileURLToPath(dir));
      const cards = pages
        .map(({ pathname }) => pathname.replace(/^\/+|\/+$/g, ""))
        .filter((path) => posix.basename(path) === "og-preview");

      const server = await serve(root);
      const scratch = await mkdtemp(join(tmpdir(), "devfest-og-"));
      try {
        for (const page of cards) {
          const city = posix.dirname(page);
          const source = await locate(root, `/${page}`);
          if (!source)
            throw new Error(`The card page /${page} was not written`);

          /*
            Named for the page it is a picture of, not for the picture. The
            words are in that HTML, and so are the stylesheets, by their
            content-hashed names — so a card that says something new or looks
            different gets a new name either way. The pixels would also change
            with things nobody changed: a Chrome update on the runner, a font
            Google re-hinted. Each would be a new URL, and a fresh fetch by
            every crawler, for an image no one could tell from the last.
          */
          const hash = createHash("sha256")
            .update(await readFile(source))
            .digest("hex");
          const name = ogCardFile(hash.slice(0, 10));

          const png = await shoot(chrome, `${server.origin}/${page}`, scratch);
          await writeFile(join(root, city, name), png);
          await rm(join(root, page), { recursive: true, force: true });
          await fill(join(root, city), name);

          logger.info(`/${city}/${name}`);
        }
      } finally {
        server.close();
        await rm(scratch, { recursive: true, force: true });
      }

      // Every page of a city lives under that city's directory, which is what
      // makes `fill` above enough. A page that broke the rule would be
      // published with a link card pointing at nothing; stop it here instead.
      const pending = ogCardFile(OG_CARD_PENDING);
      const stranded: string[] = [];
      for (const file of await htmlFiles(root)) {
        if ((await readFile(file, "utf8")).includes(pending)) {
          stranded.push(file.slice(root.length));
        }
      }
      if (stranded.length > 0) {
        throw new Error(
          `These pages point at an OG card no build made:\n` +
            stranded.map((file) => `  ${file}`).join("\n"),
        );
      }
    },
  },
};

function findChrome(): string | undefined {
  const { CHROME_PATH, LOCALAPPDATA } = process.env;
  return [
    CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    LOCALAPPDATA && join(LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // GitHub's Ubuntu runners have this one installed.
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((path): path is string => Boolean(path) && existsSync(path!));
}

/** One screenshot of one card page, cropped to the card. */
async function shoot(
  chrome: string,
  url: string,
  scratch: string,
): Promise<Buffer> {
  const raw = join(scratch, "shot.png");
  await rm(raw, { force: true });

  await run(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${FRAME.join(",")}`,
      // Long enough for Google Fonts to arrive: the card uses Google Sans
      // and Noto Sans JP, and a screenshot taken first is set in fallbacks.
      "--virtual-time-budget=8000",
      `--user-data-dir=${join(scratch, "profile")}`,
      `--screenshot=${raw}`,
      url,
    ],
    { timeout: 60_000 },
  );

  if (!existsSync(raw)) throw new Error(`Chrome wrote no screenshot of ${url}`);

  return sharp(await readFile(raw))
    .extract({ left: 0, top: 0, width: WIDTH, height: HEIGHT })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Puts the card's real name where the pages under `dir` wrote the placeholder. */
async function fill(dir: string, name: string): Promise<void> {
  const pending = ogCardFile(OG_CARD_PENDING);
  for (const file of await htmlFiles(dir)) {
    const html = await readFile(file, "utf8");
    if (html.includes(pending)) {
      await writeFile(file, html.replaceAll(pending, name));
    }
  }
}

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => join(entry.parentPath, entry.name));
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/**
 * The build output as a static site on a free port, for as long as the
 * screenshots take. Asynchronous throughout, and Chrome is too: a blocking
 * call would stop this server from answering the very request it is waiting
 * on.
 */
async function serve(root: string) {
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      const file = await locate(root, path);
      if (!file) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      });
      response.end(await readFile(file));
    } catch {
      response.writeHead(500).end();
    }
  });

  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}

/** `/kansai/og-preview` → `<root>/kansai/og-preview/index.html`, as a host would. */
async function locate(root: string, path: string) {
  const base = resolve(root, `.${path}`);
  if (base !== root && !base.startsWith(root + sep)) return undefined;

  for (const file of [base, join(base, "index.html"), `${base}.html`]) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // Not this one; try the next.
    }
  }
  return undefined;
}
