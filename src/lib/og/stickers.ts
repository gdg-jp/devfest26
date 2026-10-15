import { BOLD, THIN, type Shape } from "./stickerShapes";

/**
 * Stickers for the empty parts of a card, placed by the card itself.
 *
 * The 2025 Tokyo cards filled their gaps with one or two DF25 stickers — a
 * pink arc beside a photo, a green hash under a title. This does the same
 * from what is left once everything else is laid out: it is told where the
 * text, the logo and the photos are, finds the largest empty squares around
 * them, and puts a sticker in each.
 *
 * Which weight follows from how much room there is. A square big enough to
 * hold a bold sticker without it crowding anything gets one — that is a card
 * with little on it, where a solid shape balances the photo. A smaller gap
 * gets a monoline one, which reads as texture rather than a second subject
 * on a card that is already busy.
 *
 * Every choice is drawn from a generator seeded with the card's id, so the
 * same session comes out the same every time it is drawn.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placed {
  shape: Shape;
  weight: "bold" | "thin";
  /** The square it sits in, and its turn in degrees. */
  box: Rect;
  rotate: number;
}

export interface Placement {
  /** Where stickers may go at all — the card, less a margin. */
  area: Rect;
  /** Everything a sticker must keep clear of. */
  taken: Rect[];
  /** Kept between a sticker and anything taken, and between stickers. */
  clearance: number;
  /** The id the choices are seeded with. */
  seed: string;
}

/** Squares at least this big get a bold sticker; smaller ones a thin one. */
const BOLD_FROM = 230;
/** No sticker goes in a square smaller than this. */
const SMALLEST = 120;
/** Nor is any drawn larger, however much room there is. */
const LARGEST = { bold: 280, thin: 200 };
/** How many a card gets at most. */
const MOST = 2;
/** The grid empty space is measured on, in card pixels. */
const CELL = 10;

/** mulberry32, seeded with an FNV-1a hash of the id. */
export function generator(seed: string): () => number {
  let h = 2166136261;
  for (const char of seed) {
    h ^= char.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The largest empty square at each cell of a grid over the area — the classic
 * dynamic programme, built from the bottom-right corner so that `size[i][j]`
 * is the side of the largest free square whose top-left cell is (i, j).
 */
function emptySquares(free: boolean[][]): number[][] {
  const rows = free.length;
  const cols = free[0].length;
  const size = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      size[i][j] = free[i][j]
        ? 1 + Math.min(size[i + 1][j], size[i][j + 1], size[i + 1][j + 1])
        : 0;
    }
  }
  return size;
}

export function placeStickers({
  area,
  taken,
  clearance,
  seed,
}: Placement): Placed[] {
  const random = generator(seed);
  const rows = Math.floor(area.h / CELL);
  const cols = Math.floor(area.w / CELL);
  const free = Array.from({ length: rows }, () =>
    new Array<boolean>(cols).fill(true),
  );

  const block = ({ x, y, w, h }: Rect, pad: number) => {
    const top = Math.max(0, Math.floor((y - pad - area.y) / CELL));
    const bottom = Math.min(rows, Math.ceil((y + h + pad - area.y) / CELL));
    const left = Math.max(0, Math.floor((x - pad - area.x) / CELL));
    const right = Math.min(cols, Math.ceil((x + w + pad - area.x) / CELL));
    for (let i = top; i < bottom; i++) {
      for (let j = left; j < right; j++) free[i][j] = false;
    }
  };
  taken.forEach((rect) => block(rect, clearance));

  const used = new Set<string>();
  const placed: Placed[] = [];

  for (let n = 0; n < MOST; n++) {
    const size = emptySquares(free);
    const candidates: { i: number; j: number; side: number }[] = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (size[i][j] * CELL >= SMALLEST) {
          candidates.push({ i, j, side: size[i][j] * CELL });
        }
      }
    }
    if (!candidates.length) break;

    // Among the squares near the largest, pick one: the biggest gaps are the
    // ones a sticker balances, but always the very biggest would stack every
    // card's stickers in the same corner.
    const biggest = Math.max(...candidates.map((c) => c.side));
    const near = candidates.filter((c) => c.side >= biggest * 0.85);
    const spot = near[Math.floor(random() * near.length)];

    const weight = spot.side >= BOLD_FROM ? "bold" : "thin";
    const library = (weight === "bold" ? BOLD : THIN).filter(
      (shape) => !used.has(shape.name),
    );
    const shape = library[Math.floor(random() * library.length)];
    used.add(shape.name);

    // Smaller than the square, so that it still fits once turned, and
    // centred in it.
    const side = Math.min(spot.side, LARGEST[weight]);
    const box = {
      x: area.x + spot.j * CELL + (spot.side - side) / 2,
      y: area.y + spot.i * CELL + (spot.side - side) / 2,
      w: side,
      h: side,
    };
    const turn = weight === "bold" ? 24 : 16;
    placed.push({ shape, weight, box, rotate: (random() - 0.5) * turn });
    block(box, clearance);
  }

  return placed;
}

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/**
 * A placed sticker as SVG: the artwork fitted to 80% of its square — room
 * enough to turn up to ±15° without leaving it — then turned about the
 * centre. Thin artwork is stroked in ink at the brand's keyline.
 */
export function stickerSvg(
  { shape, weight, box, rotate }: Placed,
  ink: string,
) {
  const [, , vw, vh] = shape.viewBox.split(" ").map(Number);
  const scale = (box.w * 0.8) / Math.max(vw, vh);
  const [w, h] = [vw * scale, vh * scale];
  const style =
    weight === "thin"
      ? ` fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`
      : "";
  return svg(
    box.w,
    box.h,
    `<g transform="translate(${box.w / 2} ${box.h / 2}) rotate(${rotate.toFixed(2)})">` +
      `<svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="${shape.viewBox}"${style}>${shape.body}</svg>` +
      `</g>`,
  );
}
