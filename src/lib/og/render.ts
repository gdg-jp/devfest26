import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import sharp from "sharp";
import { cardInput, type Card, type CardInput } from "./input";
import { framedPhoto } from "./photos";
import { breakLines, type Lines } from "./lines";
import { placeStickers, stickerSvg, type Rect } from "./stickers";

/**
 * Draws a session card from its data — the whole of the card's design.
 *
 * Everything is laid out on a frame 1080 high, the height the design is
 * specified at (title 120–140, names 60, roles 40–50), and only then scaled
 * to whatever is asked for: 1200×630 for Open Graph by default. Drawing at
 * the specified size and shrinking keeps every proportion exactly as
 * designed, where laying out at the small size would round each one.
 *
 * satori lays the card out and turns its text into paths; sharp rasterises
 * and scales it. Node only — the build and the command line both call it,
 * and neither needs Astro to: see `./input.ts` for what it is handed.
 */

/** The design frame: 1080 high, at Open Graph's 1.905:1. */
export const BASE = { width: 2057, height: 1080 } as const;
export const OPEN_GRAPH = { width: 1200, height: 630 } as const;

const W = BASE.width;
const H = BASE.height;

// The palette, from src/styles/tokens.css. satori cannot read custom
// properties, so the values are restated here — and only ones the brand has.
const INK = "#1e1e1e";
const GROUND = "#f0f0f0";
const SURFACE = "#ffffff";
const MUTED = "#5f6368";
const RED = "#ea4335";
const PASTEL = {
  blue: "#c3ecf6",
  green: "#ccf6c5",
  yellow: "#ffe7a5",
  red: "#f8d8d8",
} as const;

/** Around the edge of the card; the 2025 cards kept about this much. */
const MARGIN = 80;

/**
 * Every piece of text on the card, Latin in Google Sans Flex and Japanese in
 * Noto Sans JP. satori falls through the list per character, among the fonts
 * `loadFonts` hands it; `sans-serif` is there for the list's sake only.
 */
const FONT_FAMILY = '"Google Sans Flex", "Noto Sans JP", sans-serif';

/** The few words the card supplies itself. */
const WORDS = {
  ja: { separator: "、", others: (n: number) => `ほか ${n} 名` },
  en: { separator: ", ", others: (n: number) => `and ${n} more` },
} as const;

/** How many speakers a card names in full; the rest are counted. */
const NAMED = 2;

/* ---- Type ----------------------------------------------------------------
   In pixels of the 1080 frame. */

/** From `from` down to `to`, each step about 6% under the last. */
const steps = (from: number, to: number) => {
  const sizes: number[] = [];
  for (let size = from; size > to; size = Math.floor(size * 0.94)) {
    sizes.push(size);
  }
  return [...sizes, to];
};

const TYPE = {
  /**
   * Largest first; a title steps down until all of it fits. 120–140 is where
   * a title of ordinary length lands. The floor is 56 — still clearly the
   * largest thing on the card after the logo — and a title that will not fit
   * even there goes smaller still, with a warning, rather than lose words.
   */
  title: steps(140, 56),
  titleLastResort: steps(56, 36).slice(1),
  name: 60,
  /** One speaker has room for a larger line under the name. */
  role: { single: 48, several: 40 },
  tag: 40,
  edition: 34,
};
const TITLE_LINE = 1.2;
const NAME_LINE = 1.25;
const ROLE_LINE = 1.35;

/* ---- The photo frames -----------------------------------------------------
   Drawn the way DevFest Tokyo 2025's cards framed their speakers: a rounded
   frame with a heavy outline and one corner stepped in, the frames of a
   session fitted into each other's steps.

   One speaker fills a single tall frame. Two sit on a diagonal, as on the
   2025 two-speaker cards. Three are two frames side by side above a wide one,
   as on the 2025 three-speaker cards. A fourth speaker on is named, not
   pictured. */

type Corner = "bottom-right" | "top-left" | "top-right" | "bottom-left";

interface Frame extends Rect {
  /** The stepped-in corner, and how far in it steps. */
  notch: { w: number; h: number; corner: Corner };
}

/** Where the frames are; the text column runs up to `x`. */
const FRAMES = { x: 1234, y: MARGIN, right: W - MARGIN, bottom: H - MARGIN };
/** Between two frames, where one steps around the other. */
const FRAME_GAP = 21;
const FRAME_STROKE = 9;
const RADIUS = 52;
/** The two corners where the frame turns into the notch. */
const JOIN = 38;

const SINGLE: Frame[] = [
  {
    x: FRAMES.x,
    y: FRAMES.y,
    w: FRAMES.right - FRAMES.x,
    h: FRAMES.bottom - FRAMES.y,
    notch: { w: 429, h: 274, corner: "bottom-right" },
  },
];

const PAIR: Frame[] = (() => {
  const side = 497;
  const first = { x: FRAMES.x, y: FRAMES.y, w: side, h: side };
  const second = {
    x: FRAMES.right - side,
    y: 446,
    w: side,
    h: FRAMES.bottom - 446,
  };
  // How far the two overlap, plus the gap each step leaves around the other.
  const notch = {
    w: first.x + first.w - second.x + FRAME_GAP,
    h: first.y + first.h - second.y + FRAME_GAP,
  };
  return [
    { ...first, notch: { ...notch, corner: "bottom-right" } },
    { ...second, notch: { ...notch, corner: "top-left" } },
  ];
})();

const TRIO: Frame[] = (() => {
  // The left frame runs taller than the right one beside it, and the wide
  // frame below steps around the left one's foot. `split` is where the left
  // frame widens under the right one's stepped-in corner.
  const split = 264;
  const a = { x: FRAMES.x, y: FRAMES.y, w: 412, h: 600 };
  const b = { x: 1519, y: FRAMES.y, w: FRAMES.right - 1519, h: 462 };
  const c = {
    x: 1405,
    y: b.y + b.h + FRAME_GAP,
    w: FRAMES.right - 1405,
    h: FRAMES.bottom - (b.y + b.h + FRAME_GAP),
  };
  const aRight = a.x + a.w;
  return [
    {
      ...a,
      notch: {
        w: aRight - (b.x - FRAME_GAP),
        h: split + FRAME_GAP - a.y,
        corner: "top-right",
      },
    },
    {
      ...b,
      notch: {
        w: aRight + FRAME_GAP - b.x,
        h: b.y + b.h - split,
        corner: "bottom-left",
      },
    },
    {
      ...c,
      notch: {
        w: aRight + FRAME_GAP - c.x,
        h: a.y + a.h + FRAME_GAP - c.y,
        corner: "top-left",
      },
    },
  ];
})();

/**
 * A frame's outline with its bottom-right corner stepped in, inset by half
 * the stroke so that all of it is drawn inside the frame's box. Clockwise from
 * the top-left corner. Every other corner is this outline turned or mirrored.
 */
function framePath({ w, h, notch }: Frame): string {
  const i = FRAME_STROKE / 2;
  const [l, t, r, b] = [i, i, w - i, h - i];
  const nx = w - notch.w;
  const ny = h - notch.h;
  return [
    `M ${l + RADIUS} ${t}`,
    `H ${r - RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${r} ${t + RADIUS}`,
    `V ${ny - JOIN} A ${JOIN} ${JOIN} 0 0 1 ${r - JOIN} ${ny}`,
    `H ${nx + RADIUS} A ${RADIUS} ${RADIUS} 0 0 0 ${nx} ${ny + RADIUS}`,
    `V ${b - JOIN} A ${JOIN} ${JOIN} 0 0 1 ${nx - JOIN} ${b}`,
    `H ${l + RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${l} ${b - RADIUS}`,
    `V ${t + RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${l + RADIUS} ${t} Z`,
  ].join(" ");
}

const TURN: Record<Corner, (w: number, h: number) => string> = {
  "bottom-right": () => "",
  "top-left": (w, h) => `rotate(180 ${w / 2} ${h / 2})`,
  "top-right": (_, h) => `translate(0 ${h}) scale(1 -1)`,
  "bottom-left": (w) => `translate(${w} 0) scale(-1 1)`,
};

/**
 * A frame, whole: what fills it — the photo, or the city's pastel — cut to the
 * frame's outline, then the outline itself.
 *
 * Cut rather than covered. Painting the ground over everything outside a
 * frame was simpler, but frames that fit into each other's steps each reach
 * into the next one's box, and whichever was painted last covered the other's
 * photo. A clip touches nothing outside its own frame.
 */
function frameSvg(frame: Frame, fill: string): string {
  const { w, h } = frame;
  const outline = `<path d="${framePath(frame)}" transform="${TURN[frame.notch.corner](w, h)}"/>`;
  const content = fill.startsWith("data:")
    ? `<image href="${fill}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${w}" height="${h}" fill="${fill}"/>`;
  return svg(
    w,
    h,
    `<defs><clipPath id="frame">${outline}</clipPath></defs>` +
      `<g clip-path="url(#frame)">${content}</g>` +
      outline.replace(
        "<path ",
        `<path fill="none" stroke="${INK}" stroke-width="${FRAME_STROKE}" `,
      ),
  );
}

/** What a frame covers: its box less the notch, as two rectangles. */
function frameArea({ x, y, w, h, notch }: Frame): Rect[] {
  const { w: nw, h: nh, corner } = notch;
  switch (corner) {
    case "bottom-right":
      return [
        { x, y, w, h: h - nh },
        { x, y: y + h - nh, w: w - nw, h: nh },
      ];
    case "top-left":
      return [
        { x, y: y + nh, w, h: h - nh },
        { x: x + nw, y, w: w - nw, h: nh },
      ];
    case "top-right":
      return [
        { x, y: y + nh, w, h: h - nh },
        { x, y, w: w - nw, h: nh },
      ];
    case "bottom-left":
      return [
        { x, y, w, h: h - nh },
        { x: x + nw, y: y + h - nh, w: w - nw, h: nh },
      ];
  }
}

/* ---- Brand marks --------------------------------------------------------- */

const svg = (w: number, h: number, body: string, viewBox = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>`;

const dataUri = (markup: string) =>
  `data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`;

/*
  `logo-brackets.svg` is the { DevFest } lockup: two braces, then seven letters.
  The card sets the braces further apart than the lockup does — they hold the
  pill as well as the word — so the two are cut out of it separately. The view
  boxes are each part's bounds in the lockup's own coordinates, stroke included.
  Read from the working directory, like the fonts: a build bundles this module
  somewhere else first.
*/
const LOCKUP_PATHS =
  readFileSync(
    join(process.cwd(), "src/assets/brand/logo-brackets.svg"),
    "utf8",
  ).match(/<path[^>]*\/>/g) ?? [];
const LETTERS = LOCKUP_PATHS.slice(2)
  .join("")
  .replaceAll("var(--brand-ink)", INK);
const WORDMARK = { viewBox: "333 136 1883 373", ratio: 1883 / 373 };
const BRACE_BOX = {
  ratio: 232 / 621,
  left: "5 12 232 621",
  right: "2296 12 232 621",
};

/** The braces in red: pale on the left, the brand red on the right. */
const brace = (side: "left" | "right", height: number) =>
  dataUri(
    svg(
      Math.round(height * BRACE_BOX.ratio),
      height,
      (LOCKUP_PATHS[side === "left" ? 0 : 1] ?? "").replace(
        "#f9ab00",
        side === "left" ? PASTEL.red : RED,
      ),
      BRACE_BOX[side],
    ),
  );

/** The eight-pointed asterisk beside the names, in a hairline. */
const SPARKLE_SIZE = 110;
const SPARKLE = dataUri(
  svg(
    64,
    64,
    [0, 45, 90, 135]
      .map(
        (angle) =>
          `<line x1="32" y1="2" x2="32" y2="62" stroke="${INK}" stroke-width="2" stroke-linecap="round" transform="rotate(${angle} 32 32)"/>`,
      )
      .join(""),
  ),
);

/* ---- satori's element tree ------------------------------------------------
   satori takes React elements, which are plain objects; writing them through
   this keeps the card out of JSX and the build free of a React renderer. */

type Style = Record<string, string | number>;
interface Node {
  type: string;
  props: { style?: Style; children?: Child | Child[]; [key: string]: unknown };
}
type Child = Node | string | null | undefined | false;

const el = (
  type: string,
  props: Record<string, unknown> & { style?: Style },
  ...children: Child[]
): Node => ({
  type,
  props: { ...props, children: children.filter(Boolean) },
});

const img = (src: string, width: number, height: number, style: Style = {}) =>
  el("img", { src, width, height, style: { width, height, ...style } });

const absolute = ({ x, y }: { x: number; y: number }): Style => ({
  position: "absolute",
  left: x,
  top: y,
});

const clamp = (lines: number): Style => ({
  display: "block",
  lineClamp: lines,
  overflow: "hidden",
});

/* ---- Fitting the text -----------------------------------------------------
   The title's lines are chosen, not left to wrap: `./lines.ts` measures it
   with the fonts and breaks it between phrases. Tags and names are short and
   only estimated — a full-width character about one em across, anything
   narrower about half of one — which is close enough to keep stickers clear
   of them. */

const TEXT_X = MARGIN + 7;
const TEXT_WIDTH = FRAMES.x - TEXT_X - 51;

/** Latin, its punctuation and the general punctuation block: about half an em. */
const NARROW = new RegExp(
  `[ -~${String.fromCharCode(0xa0)}-${String.fromCharCode(0x24f)}` +
    `${String.fromCharCode(0x2000)}-${String.fromCharCode(0x206f)}]`,
);

const emWidth = (text: string) =>
  [...text].reduce((sum, char) => sum + (NARROW.test(char) ? 0.56 : 1), 0);

const widthAt = (text: string, size: number) => emWidth(text) * size * 1.04;

/**
 * A smaller size is worth taking to end every line between phrases, down to
 * this share of the largest size that fits at all; past it, a break inside a
 * phrase is the lesser evil.
 */
const SPLIT_WORTH = 0.6;

/**
 * Likewise a smaller size that takes fewer lines, down to this share: two
 * full lines read better than three short ones at a size not much larger.
 */
const FEWER_WORTH = 0.85;

/**
 * The size and the lines of a title: the largest size whose lines fit the
 * room above the names, preferring —
 *
 * 1. sizes where no word has to be broken into characters, then
 * 2. a smaller size that takes fewer lines, if it is no smaller than
 *    `FEWER_WORTH` of the largest, then
 * 3. a smaller size whose every line ends between phrases, if it is no
 *    smaller than `SPLIT_WORTH` of that.
 *
 * Below the floor only when nothing else fits, with a warning: every word of
 * a title is kept.
 */
function fitTitle(title: string, room: number): Lines & { size: number } {
  const set = (size: number, maxLines: number) => {
    const lines =
      maxLines >= 1 && breakLines(title, size, TEXT_WIDTH, maxLines);
    return lines ? { ...lines, size } : undefined;
  };
  const tries = (sizes: number[]) =>
    sizes.flatMap(
      (size) => set(size, Math.floor(room / (size * TITLE_LINE))) ?? [],
    );

  let options = tries(TYPE.title);
  if (!options.length) {
    options = tries(TYPE.titleLastResort);
    const fallback = options[0] ??
      set(TYPE.titleLastResort.at(-1)!, 99) ?? {
        lines: [title],
        width: TEXT_WIDTH,
        forced: true,
        splits: 0,
        size: TYPE.titleLastResort.at(-1)!,
      };
    console.warn(
      `[og] "${title}" is set at ${fallback.size}px, under the ` +
        `${TYPE.title.at(-1)}px floor, to fit it whole. A shorter title ` +
        `would read better.`,
    );
    return fallback;
  }

  const whole = options.filter((option) => !option.forced);
  const largest = whole[0] ?? options[0];
  const fewer = whole
    .filter(
      (option) =>
        option.size >= largest.size * FEWER_WORTH &&
        option.lines.length < largest.lines.length,
    )
    .sort((a, b) => a.lines.length - b.lines.length || b.size - a.size)[0];
  const best = fewer ?? largest;
  const clean = whole.find(
    (option) =>
      option.splits === 0 &&
      option.size <= best.size &&
      option.size >= best.size * SPLIT_WORTH,
  );
  return clean ?? best;
}

/* ---- Tags ----------------------------------------------------------------- */

/**
 * Which colour each kind of tag is, in one place.
 *
 * GDG's halftone colours (`--ht-*` in src/styles/tokens.css) — a step
 * lighter than the core four — under a black outline and ink type. Lighter
 * fills cannot carry white type: white on these is 1.4–1.9:1. Ink on them is
 * 9–12:1. Red is left out, so a tag never reads as part of the { DevFest }
 * braces above it.
 *
 * Keys are compared in lower case. A tag not listed here is blue.
 */
const TAG_FILL = {
  blue: "#57caff",
  green: "#5cdb6d",
  yellow: "#ffd427",
} as const;

export const TAG_COLORS: Readonly<Record<string, string>> = {
  ライブデモ: TAG_FILL.yellow,
  "live demo": TAG_FILL.yellow,
  ハンズオン: TAG_FILL.green,
  "hands-on": TAG_FILL.green,
  ワークショップ: TAG_FILL.green,
  workshop: TAG_FILL.green,
  パネル: TAG_FILL.blue,
  パネルディスカッション: TAG_FILL.blue,
  panel: TAG_FILL.blue,
  "panel discussion": TAG_FILL.blue,
};
const TAG_DEFAULT = TAG_FILL.blue;
const tagColor = (tag: string) => TAG_COLORS[tag.toLowerCase()] ?? TAG_DEFAULT;

/**
 * A title that opens with bracketed tags — "[ライブデモ] ウェブ…", or
 * "[ハンズオン][初心者向け] …" — has them drawn as badges above the rest.
 * Full-width brackets count too.
 */
export function splitTags(title: string): { tags: string[]; rest: string } {
  const tags: string[] = [];
  let rest = title;
  for (;;) {
    const match = /^\s*[[［]([^\]］]{1,16})[\]］]\s*(.+)$/u.exec(rest);
    if (!match) return { tags, rest };
    tags.push(match[1].trim());
    rest = match[2];
  }
}

const TAG_HEIGHT = Math.round(TYPE.tag * 1.7);
const TAG_PAD = Math.round(TYPE.tag * 0.75);
const TAG_BORDER = 5;
/** Between tags in the row, and between the row and the title. */
const TAG_GAP = 20;

/** The row of tags' size, wrapping as satori will. */
function tagRowSize(tags: string[]): { w: number; h: number } {
  if (!tags.length) return { w: 0, h: 0 };
  let rows = 1;
  let used = 0;
  let widest = 0;
  for (const tag of tags) {
    const width = widthAt(tag, TYPE.tag) + 2 * (TAG_PAD + TAG_BORDER);
    if (used && used + TAG_GAP + width > TEXT_WIDTH) {
      [rows, used] = [rows + 1, 0];
    }
    used += (used ? TAG_GAP : 0) + width;
    widest = Math.max(widest, used);
  }
  return { w: widest, h: rows * TAG_HEIGHT + (rows - 1) * TAG_GAP };
}

function tagRow(tags: string[]): Node {
  return el(
    "div",
    { style: { display: "flex", flexWrap: "wrap", gap: TAG_GAP } },
    ...tags.map((tag) =>
      el(
        "div",
        {
          style: {
            height: TAG_HEIGHT,
            display: "flex",
            alignItems: "center",
            padding: `0 ${TAG_PAD}px`,
            border: `${TAG_BORDER}px solid #000000`,
            borderRadius: TAG_HEIGHT / 2,
            backgroundColor: tagColor(tag),
            fontSize: TYPE.tag,
            fontWeight: 700,
            color: INK,
          },
        },
        tag,
      ),
    ),
  );
}

/* ---- The logo ------------------------------------------------------------- */

/** The { DevFest } lockup and the edition pill, at 70% of the first cut. */
const HEADER = (() => {
  const braceHeight = 223;
  const braceWidth = Math.round(braceHeight * BRACE_BOX.ratio);
  const wordmarkWidth = 552;
  const gap = 19;
  return {
    x: MARGIN,
    y: MARGIN - 7,
    braceHeight,
    braceWidth,
    wordmarkWidth,
    wordmarkHeight: Math.round(wordmarkWidth / WORDMARK.ratio),
    pillHeight: 69,
    gap,
    w: 2 * braceWidth + wordmarkWidth + 2 * gap,
    h: braceHeight,
  };
})();

function header(edition: string): Node {
  const { braceHeight, braceWidth, wordmarkWidth, wordmarkHeight, gap } =
    HEADER;
  return el(
    "div",
    {
      style: {
        ...absolute(HEADER),
        display: "flex",
        alignItems: "center",
        gap,
      },
    },
    img(brace("left", braceHeight), braceWidth, braceHeight),
    el(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap,
        },
      },
      img(
        dataUri(svg(wordmarkWidth, wordmarkHeight, LETTERS, WORDMARK.viewBox)),
        wordmarkWidth,
        wordmarkHeight,
      ),
      el(
        "div",
        {
          style: {
            width: wordmarkWidth,
            height: HEADER.pillHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `5px solid ${INK}`,
            borderRadius: HEADER.pillHeight / 2,
            backgroundColor: SURFACE,
            fontSize: TYPE.edition,
            fontWeight: 500,
            color: INK,
          },
        },
        edition,
      ),
    ),
    img(brace("right", braceHeight), braceWidth, braceHeight),
  );
}

/* ---- The speakers --------------------------------------------------------- */

/**
 * One speaker in one frame. With no photo, the city's pastel, and the initial
 * set over it in the part of the frame the notch leaves whole.
 */
async function framed(
  speaker: Card["speakers"][number],
  frame: Frame,
  pastel: string,
): Promise<Node[]> {
  const { w, h, notch } = frame;
  const src = speaker.photo && (await framedPhoto(speaker.photo, w, h));
  const whole = h - notch.h;
  const notchOnTop = notch.corner.startsWith("top");

  return [
    img(dataUri(frameSvg(frame, src ?? pastel)), w, h, absolute(frame)),
    !src &&
      el(
        "div",
        {
          style: {
            ...absolute({
              x: frame.x,
              y: frame.y + (notchOnTop ? notch.h : 0),
            }),
            width: w,
            height: whole,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: INK,
            fontSize: Math.round(Math.min(w, whole) * 0.5),
            fontWeight: 700,
          },
        },
        speaker.initial ?? speaker.name.slice(0, 1),
      ),
  ].filter((node): node is Node => Boolean(node));
}

/**
 * The names under the title, and what each does. One or two people are named
 * in full; past that, the first two and a count.
 */
function people(card: Card) {
  const words = WORDS[card.lang];
  const shown = card.speakers.slice(0, NAMED);
  const others = card.speakers.length - shown.length;
  const single = shown.length === 1;
  const role = single ? TYPE.role.single : TYPE.role.several;
  const rowGap = 16;
  const columnWidth = TEXT_WIDTH - SPARKLE_SIZE - 40;

  const rows: Child[] = others
    ? [
        el(
          "div",
          {
            style: {
              fontSize: TYPE.name,
              fontWeight: 700,
              lineHeight: NAME_LINE,
              ...clamp(2),
            },
          },
          `${shown.map((s) => s.name).join(words.separator)} ${words.others(others)}`,
        ),
      ]
    : shown.map((speaker) =>
        el(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 2 } },
          el(
            "div",
            {
              style: {
                fontSize: TYPE.name,
                fontWeight: 700,
                lineHeight: NAME_LINE,
                ...clamp(1),
              },
            },
            speaker.name,
          ),
          speaker.role &&
            el(
              "div",
              {
                style: {
                  fontSize: role,
                  fontWeight: 500,
                  color: MUTED,
                  lineHeight: ROLE_LINE,
                  ...clamp(single ? 2 : 1),
                },
              },
              speaker.role,
            ),
        ),
      );

  // What the rows take up at most, for the title to work around, and how
  // wide they run, for the stickers to keep clear of.
  const nameHeight = TYPE.name * NAME_LINE;
  const height = others
    ? 2 * nameHeight
    : single
      ? nameHeight + 2 + 2 * role * ROLE_LINE
      : 2 * (nameHeight + 2 + role * ROLE_LINE) + rowGap;
  const width = Math.min(
    columnWidth,
    Math.max(
      ...shown.flatMap((s) => [
        widthAt(s.name, TYPE.name),
        // A role that wraps fills the column; one that does not, its own width.
        widthAt(s.role, role),
      ]),
      others ? columnWidth : 0,
    ),
  );

  return {
    height,
    width,
    node: el(
      "div",
      {
        style: { display: "flex", alignItems: "flex-start", width: TEXT_WIDTH },
      },
      el(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: rowGap,
            width: columnWidth,
            color: INK,
          },
        },
        ...rows,
      ),
      img(SPARKLE, SPARKLE_SIZE, SPARKLE_SIZE, {
        marginLeft: "auto",
        marginTop: 7,
      }),
    ),
  };
}

/* ---- Fonts ---------------------------------------------------------------- */

type Font = { name: string; data: Buffer; weight: 500 | 700 | 900 };
let fonts: Promise<Font[]> | undefined;

/**
 * Google Sans Flex and Noto Sans JP, both SIL OFL and both committed in
 * `src/assets/fonts/` so a build never waits on a font server. Google Sans
 * Flex is a variable font, which satori cannot set at any weight but the
 * default, so these are the static cuts Google Fonts serves.
 */
function loadFonts() {
  const dir = join(process.cwd(), "src/assets/fonts");
  const cuts = [
    [500, "Medium"],
    [700, "Bold"],
    [900, "Black"],
  ] as const;
  fonts ??= Promise.all(
    cuts.flatMap(([weight, name]) => [
      readFile(join(dir, `GoogleSansFlex-${weight}.ttf`)).then(
        (data): Font => ({ name: "Google Sans Flex", weight, data }),
      ),
      readFile(join(dir, `NotoSansJP-${name}.otf`)).then((data): Font => ({
        name: "Noto Sans JP",
        weight,
        data,
      })),
    ]),
  );
  return fonts;
}

/* ---- The card ------------------------------------------------------------- */

export interface RenderOptions {
  /** The width of the PNG. Its height follows from the card's proportions. */
  width?: number;
}

/**
 * A card as PNG. The input is checked first, so a hand-written JSON file
 * with a field missing says which.
 */
export async function renderCard(
  input: CardInput,
  { width = OPEN_GRAPH.width }: RenderOptions = {},
): Promise<Buffer> {
  const card = cardInput.parse(input);
  const pastel = PASTEL[card.theme];

  const frames =
    card.speakers.length >= 3
      ? TRIO
      : card.speakers.length === 2
        ? PAIR
        : SINGLE;
  const pictured = (
    await Promise.all(
      frames.map((frame, i) => framed(card.speakers[i], frame, pastel)),
    )
  ).flat();

  const { tags, rest } = splitTags(card.title);

  // The text column runs from under the logo to the bottom margin: tags and
  // title at its head, the names at its foot.
  const top = HEADER.y + HEADER.h + 28;
  const room = H - MARGIN + 7 - top;
  const who = people(card);
  const gap = 32;
  const tagRowBox = tagRowSize(tags);
  const tagsHeight = tags.length ? tagRowBox.h + TAG_GAP : 0;
  const title = fitTitle(rest, room - who.height - gap - tagsHeight);

  // What the stickers must keep clear of.
  const namesTop = top + room - who.height;
  const taken: Rect[] = [
    HEADER,
    ...frames.slice(0, card.speakers.length).flatMap(frameArea),
    { x: TEXT_X, y: top, w: tagRowBox.w, h: tagRowBox.h },
    {
      x: TEXT_X,
      y: top + tagsHeight,
      w: title.width,
      h: title.lines.length * title.size * TITLE_LINE,
    },
    { x: TEXT_X, y: namesTop, w: who.width, h: who.height },
    {
      x: TEXT_X + TEXT_WIDTH - SPARKLE_SIZE,
      y: namesTop + 7,
      w: SPARKLE_SIZE,
      h: SPARKLE_SIZE,
    },
  ];
  const stickers = placeStickers({
    area: { x: MARGIN / 2, y: MARGIN / 2, w: W - MARGIN, h: H - MARGIN },
    taken,
    clearance: 36,
    seed: card.id,
  });

  const tree = el(
    "div",
    {
      style: {
        width: W,
        height: H,
        display: "flex",
        position: "relative",
        backgroundColor: GROUND,
        fontFamily: FONT_FAMILY,
        color: INK,
      },
    },
    header(card.edition),
    el(
      "div",
      {
        style: {
          ...absolute({ x: TEXT_X, y: top }),
          width: TEXT_WIDTH,
          height: room,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap,
        },
      },
      el(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: TAG_GAP } },
        tags.length > 0 && tagRow(tags),
        // One element per line, none of which may wrap: the breaks are the
        // ones `fitTitle` chose, not wherever satori would run out of room.
        el(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              width: TEXT_WIDTH,
              fontSize: title.size,
              fontWeight: 900,
              color: INK,
              lineHeight: TITLE_LINE,
            },
          },
          ...title.lines.map((line) =>
            el("div", { style: { whiteSpace: "nowrap" } }, line),
          ),
        ),
      ),
      who.node,
    ),
    ...pictured,
    // Last, over the frames: a notch is ground the frame's overlay paints,
    // and a sticker is often placed in one.
    ...stickers.map((sticker) =>
      img(
        dataUri(stickerSvg(sticker, INK)),
        sticker.box.w,
        sticker.box.h,
        absolute(sticker.box),
      ),
    ),
  );

  const markup = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: await loadFonts(),
  });

  return sharp(Buffer.from(markup))
    .resize(width, Math.round((width * H) / W))
    .png({ compressionLevel: 9 })
    .toBuffer();
}
