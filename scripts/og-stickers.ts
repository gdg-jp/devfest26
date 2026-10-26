/**
 * Writes `src/lib/og/stickerShapes.ts`, the stickers the session cards are
 * scattered with, from the DF25 sticker sheet as vectors:
 * `src/assets/brand/sticker-sheet.svg`, an export of `DF25-StickerSheet.ai`,
 * kept exactly as exported.
 *
 * The sheet has two sections, each a clipped group: the bold glyphs (filled,
 * with a keyline) and the monoline ones. A sticker is every path of a section
 * whose centre falls inside the sticker's area below — areas, not path
 * numbers, so that a fresh export of the same sheet, which may order its
 * paths differently, still comes out the same.
 *
 * To add a sticker, add its area (in the sheet's coordinates, as a design
 * tool shows them) to `BOLD` or `THIN`; to replace the artwork, export the
 * sheet over `sticker-sheet.svg`. Then
 *
 *     pnpm og:stickers
 *
 * The cards pick stickers by a seed from the session id, so adding or
 * removing one changes which stickers existing cards show.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { Shape } from "../src/lib/og/stickerShapes";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = join(repo, "src/assets/brand/sticker-sheet.svg");
const OUT = join(repo, "src/lib/og/stickerShapes.ts");

/** An area of the sheet: left, top, right, bottom. */
type Area = [number, number, number, number];

/**
 * The bold section. Left out: the long ones (the three bubbles, the quotes,
 * the minus, the three dots), which only ever fit a strip and would sit tiny
 * in the square spaces a card has.
 */
const BOLD: Record<string, Area> = {
  brackets: [100, 340, 500, 690],
  arrow: [540, 340, 1010, 640],
  dot: [540, 640, 700, 780],
  slashes: [1020, 340, 1460, 780],
  semicolon: [1500, 390, 1650, 780],
  braces: [1740, 340, 2180, 780],
  arc: [2220, 340, 2460, 780],
  chevrons: [100, 840, 580, 1110],
  cee: [1500, 840, 1740, 1280],
  equals: [2180, 970, 2460, 1230],
  plusRed: [100, 1200, 460, 1550],
  hash: [540, 1200, 900, 1550],
  colon: [940, 1240, 1100, 1550],
  cross: [1180, 1200, 1540, 1550],
  plusBlue: [2180, 1290, 2460, 1550],
};

/**
 * The monoline section, all of it, in the order the cards have always had
 * them: a card picks by position, so a new order would change its stickers.
 */
const THIN: Record<string, Area> = {
  hash: [560, 2740, 800, 3060],
  "brace-right": [1080, 2740, 1200, 3150],
  "brace-left": [840, 2740, 960, 3150],
  "at-sign": [1760, 2740, 1960, 2960],
  "multi-brace-left": [700, 2200, 800, 2610],
  "multi-brace-right": [960, 2200, 1060, 2610],
  "triple-brace-left": [1100, 2200, 1210, 2610],
  "triple-brace-right": [1350, 2200, 1460, 2610],
  parentheses: [2020, 2740, 2390, 3060],
  asterisk: [1500, 2410, 1700, 2600],
  "double-slash": [1240, 2740, 1440, 3150],
  "arrow-right": [380, 2200, 660, 2420],
  "less-than-three": [1500, 2740, 1720, 2940],
  "angle-brackets": [1500, 2200, 1780, 2380],
  globe: [170, 2740, 510, 3060],
  "square-brackets": [1820, 2200, 2180, 2610],
  equals: [380, 2520, 540, 2610],
  semicolon: [1520, 3020, 1590, 3150],
  colon: [1760, 3020, 1830, 3150],
};

const sheet = readFileSync(SHEET, "utf8");
const [width, height] = (sheet.match(/viewBox="0 0 (\S+) (\S+)"/) ?? [])
  .slice(1)
  .map(Number);

/** The sheet's sections, in order: their paths, the backdrop left out. */
const sections = [
  ...sheet.matchAll(/<g clip-path="[^"]*">([\s\S]*?)<\/g>/g),
].map(([, inner]) =>
  (inner.match(/<path[^>]*\/>/g) ?? []).filter(
    (path) => !/fill="#F0F0F0"/i.test(path),
  ),
);
if (sections.length !== 2) {
  throw new Error(`${SHEET}: expected 2 sections, found ${sections.length}`);
}

interface Box {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

/**
 * Where a drawing's ink lies on the sheet: rendered, then trimmed. A path
 * with no fill of its own has none, as on the sheet, whose root sets
 * `fill="none"`.
 */
async function inkOf(markup: string): Promise<Box> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${markup}</svg>`;
  const { info } = await sharp(Buffer.from(svg))
    .trim()
    .toBuffer({ resolveWithObject: true });
  const x = -(info.trimOffsetLeft ?? 0);
  const y = -(info.trimOffsetTop ?? 0);
  return { x, y, right: x + info.width, bottom: y + info.height };
}

/** The section's paths that make up each sticker, by the stickers' areas. */
async function collect(paths: string[], areas: Record<string, Area>) {
  const boxes = await Promise.all(paths.map(inkOf));
  const picked = new Set<number>();
  const groups = Object.entries(areas).map(([name, [l, t, r, b]]) => {
    const members = paths.flatMap((path, i) => {
      const box = boxes[i];
      const cx = (box.x + box.right) / 2;
      const cy = (box.y + box.bottom) / 2;
      if (cx < l || cx > r || cy < t || cy > b) return [];
      if (picked.has(i)) throw new Error(`${name}: a path is in two areas`);
      picked.add(i);
      return [{ path, box }];
    });
    if (!members.length) throw new Error(`${name}: nothing in its area`);
    return { name, members };
  });
  return groups;
}

const viewBoxOf = (boxes: Box[], pad = 4) => {
  const x = Math.min(...boxes.map((b) => b.x)) - pad;
  const y = Math.min(...boxes.map((b) => b.y)) - pad;
  const right = Math.max(...boxes.map((b) => b.right)) + pad;
  const bottom = Math.max(...boxes.map((b) => b.bottom)) + pad;
  return `${x} ${y} ${right - x} ${bottom - y}`;
};

const tidy = (path: string) => path.replace(/ id="[^"]*"/, "");

// Bold: as drawn, colours and keyline included. Grouped under `fill="none"`,
// which the sheet's root gave the keyline paths.
const bold: Shape[] = (await collect(sections[0], BOLD)).map(
  ({ name, members }) => ({
    name,
    viewBox: viewBoxOf(members.map((m) => m.box)),
    body: `<g fill="none">${members.map((m) => tidy(m.path)).join("")}</g>`,
  }),
);

// Monoline: unstyled, so the card draws every line in its own ink and
// weight. A filled path is a dot (of the colon, the semicolon) and stays
// filled, in the ink; the hairline the sheet outlines each dot with goes.
const STYLE = / (fill|stroke|stroke-[a-z]+)="[^"]*"/g;
const thin: Shape[] = (await collect(sections[1], THIN)).map(
  ({ name, members }) => ({
    name,
    viewBox: viewBoxOf(members.map((m) => m.box)),
    body: members
      .flatMap(({ path }) => {
        const fill = path.match(/ fill="([^"]*)"/)?.[1];
        const weight = Number(path.match(/ stroke-width="([^"]*)"/)?.[1] ?? 0);
        if (fill && fill !== "none") {
          return tidy(path)
            .replace(STYLE, "")
            .replace("<path", '<path fill="currentColor" stroke="none"');
        }
        if (weight < 2) return [];
        return tidy(path).replace(STYLE, "");
      })
      .join(""),
  }),
);

writeFileSync(
  OUT,
  `/**
 * The sticker artwork, as vectors. Generated by \`scripts/og-stickers.ts\`
 * (\`pnpm og:stickers\`) from \`src/assets/brand/sticker-sheet.svg\`, the DF25
 * sticker sheet — edit those, not this:
 *
 * - BOLD: the sheet's bold glyphs, with their own fills and keyline.
 * - THIN: its monoline glyphs, unstyled: whoever draws them sets the stroke,
 *   and the colour of the dots (\`currentColor\`).
 */

export interface Shape {
  name: string;
  viewBox: string;
  body: string;
}

export const BOLD: readonly Shape[] = ${JSON.stringify(bold, null, 2)};

export const THIN: readonly Shape[] = ${JSON.stringify(thin, null, 2)};
`,
);
console.log(`${OUT}: ${bold.length} bold, ${thin.length} thin`);
