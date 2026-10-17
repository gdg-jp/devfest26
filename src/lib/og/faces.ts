import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/**
 * Finds faces in a photo, and cuts a frame of a given shape around one.
 *
 * The detector is pico — Nenad Markus's pixel-intensity-comparison cascade —
 * ported from its MIT-licensed C runtime (`rnt/picornt.c` at
 * https://github.com/nenadmarkus/pico), with the frontal-face cascade it
 * ships, `src/assets/face/facefinder`. See `src/assets/face/LICENSE-pico.txt`.
 * It is small, has no native parts and needs no model server, which is the
 * whole of why it is here rather than something cleverer: it runs wherever
 * the build runs.
 *
 * Build-time only, like everything that draws a card.
 */

export interface Face {
  /** Centre and side of the square the face fits in, in image pixels. */
  x: number;
  y: number;
  size: number;
  /** The cascade's confidence, summed over the detections merged into it. */
  score: number;
}

interface Cascade {
  depth: number;
  trees: {
    /** Four signed bytes per internal node: two pixel offsets to compare. */
    codes: Int8Array;
    leaves: Float32Array;
    threshold: number;
  }[];
}

let cascade: Promise<Cascade> | undefined;

/** Read from the working directory: a build bundles this module elsewhere. */
function loadCascade(): Promise<Cascade> {
  cascade ??= readFile(join(process.cwd(), "src/assets/face/facefinder")).then(
    (file) => {
      const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
      // Two 32-bit fields the runtime does not use, then depth and tree count.
      const depth = view.getInt32(8, true);
      const count = view.getInt32(12, true);
      const nodes = (1 << depth) - 1;
      const leaves = 1 << depth;

      const trees: Cascade["trees"] = [];
      let at = 16;
      for (let i = 0; i < count; i++) {
        const codes = new Int8Array(
          file.buffer,
          file.byteOffset + at,
          4 * nodes,
        );
        at += 4 * nodes;
        const lut = new Float32Array(leaves);
        for (let j = 0; j < leaves; j++, at += 4) {
          lut[j] = view.getFloat32(at, true);
        }
        trees.push({
          codes,
          leaves: lut,
          threshold: view.getFloat32(at, true),
        });
        at += 4;
      }
      return { depth, trees };
    },
  );
  return cascade;
}

/** cos and sin of a 32nd of a turn at a time, times 256 — picornt.c's tables. */
const QCOS = [
  256, 251, 236, 212, 181, 142, 97, 49, 0, -49, -97, -142, -181, -212, -236,
  -251, -256, -251, -236, -212, -181, -142, -97, -49, 0, 49, 97, 142, 181, 212,
  236, 251, 256,
];
const QSIN = [
  0, 49, 97, 142, 181, 212, 236, 251, 256, 251, 236, 212, 181, 142, 97, 49, 0,
  -49, -97, -142, -181, -212, -236, -251, -256, -251, -236, -212, -181, -142,
  -97, -49, 0,
];

/**
 * The cascade at one window: centre (r, c), side s, turned `turn` 32nds of a
 * full turn counterclockwise. Its confidence, or nothing where it rejects the
 * window. `run_rotated_cascade` in picornt.c, the C integer arithmetic kept
 * so that the pixels compared are the same ones.
 */
function runCascade(
  { depth, trees }: Cascade,
  r: number,
  c: number,
  s: number,
  turn: number,
  pixels: Uint8Array,
  rows: number,
  cols: number,
): number | undefined {
  const rr = Math.trunc(r) * 65536;
  const cc = Math.trunc(c) * 65536;
  const ss = Math.trunc(s);
  if (
    Math.trunc((rr + 46341 * ss) / 65536) >= rows ||
    Math.trunc((rr - 46341 * ss) / 65536) < 0 ||
    Math.trunc((cc + 46341 * ss) / 65536) >= cols ||
    Math.trunc((cc - 46341 * ss) / 65536) < 0
  ) {
    return undefined;
  }

  const qcos = ss * QCOS[turn];
  const qsin = ss * QSIN[turn];
  const at = (dr: number, dc: number) =>
    pixels[
      Math.trunc((rr + qcos * dr - qsin * dc) / 65536) * cols +
        Math.trunc((cc + qsin * dr + qcos * dc) / 65536)
    ];

  let o = 0;
  for (const tree of trees) {
    let idx = 1;
    for (let j = 0; j < depth; j++) {
      const k = 4 * (idx - 1);
      const t = tree.codes;
      idx = 2 * idx + (at(t[k], t[k + 1]) <= at(t[k + 2], t[k + 3]) ? 1 : 0);
    }
    o += tree.leaves[idx - (1 << depth)];
    if (o <= tree.threshold) return undefined;
  }
  return o - trees.at(-1)!.threshold;
}

/** How much two square windows overlap, as intersection over union. */
function overlap(a: Face, b: Face): number {
  const r = Math.max(
    0,
    Math.min(a.y + a.size / 2, b.y + b.size / 2) -
      Math.max(a.y - a.size / 2, b.y - b.size / 2),
  );
  const c = Math.max(
    0,
    Math.min(a.x + a.size / 2, b.x + b.size / 2) -
      Math.max(a.x - a.size / 2, b.x - b.size / 2),
  );
  return (r * c) / (a.size * a.size + b.size * b.size - r * c);
}

/**
 * Merges the windows that fired on the same face — `cluster_detections`:
 * windows overlapping by more than 0.3 are one face, placed at their mean and
 * scored by their sum.
 */
function cluster(detections: Face[]): Face[] {
  const group = new Array<number>(detections.length).fill(0);
  let groups = 0;
  for (let i = 0; i < detections.length; i++) {
    if (group[i]) continue;
    group[i] = ++groups;
    const stack = [i];
    while (stack.length) {
      const k = stack.pop()!;
      for (let j = 0; j < detections.length; j++) {
        if (!group[j] && overlap(detections[k], detections[j]) > 0.3) {
          group[j] = groups;
          stack.push(j);
        }
      }
    }
  }

  return Array.from({ length: groups }, (_, g) => {
    const members = detections.filter((_, i) => group[i] === g + 1);
    const mean = (pick: (face: Face) => number) =>
      members.reduce((sum, face) => sum + pick(face), 0) / members.length;
    return {
      x: mean((face) => face.x),
      y: mean((face) => face.y),
      size: mean((face) => face.size),
      score: members.reduce((sum, face) => sum + face.score, 0),
    };
  });
}

/** Longest side the search runs at. Faces on a card are never tiny. */
const SEARCH_SIZE = 480;
/** Below this summed score a "face" is more often wallpaper than a person. */
const MIN_SCORE = 20;
/**
 * The turns the cascade is run at, in 32nds of a full turn: upright, and
 * about 11° and 22° either way, for a head tilted in a candid photo.
 */
const TURNS = [0, 1, 31, 2, 30];

/**
 * Every face found in an upright image, most confident first, in the image's
 * own pixels. The search is pico's sliding window over a greyscale copy, from a
 * tenth of the shorter side up to all of it.
 */
export async function findFaces(image: Buffer): Promise<Face[]> {
  const [model, { data, info }] = await Promise.all([
    loadCascade(),
    sharp(image)
      .resize(SEARCH_SIZE, SEARCH_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  const { width: cols, height: rows } = info;
  const { width = cols } = await sharp(image).metadata();
  const scale = width / cols;

  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const detections: Face[] = [];
  for (
    let s = Math.max(20, Math.min(rows, cols) / 10);
    s <= Math.min(rows, cols);
    s *= 1.1
  ) {
    const step = Math.max(0.1 * s, 1);
    for (let r = s / 2 + 1; r <= rows - s / 2 - 1; r += step) {
      for (let c = s / 2 + 1; c <= cols - s / 2 - 1; c += step) {
        for (const turn of TURNS) {
          const score = runCascade(model, r, c, s, turn, pixels, rows, cols);
          if (score !== undefined) {
            detections.push({ x: c, y: r, size: s, score });
          }
        }
      }
    }
  }

  return cluster(detections)
    .filter((face) => face.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .map((face) => ({
      x: face.x * scale,
      y: face.y * scale,
      size: face.size * scale,
      score: face.score,
    }));
}

/** Where a face sits in the frame it is cut into, as fractions of it. */
export interface Framing {
  /** The face's side against the frame's height. */
  faceHeight: number;
  /** The face's centre, down from the top. */
  eyeLine: number;
}

/** A head-and-shoulders portrait: the face a third of the height, high. */
export const PORTRAIT: Framing = { faceHeight: 0.34, eyeLine: 0.42 };

/**
 * With no face to place, how much of what the cut leaves over goes above it:
 * a quarter, so the cut sits high. See `cropToFace`.
 */
const UNFOUND_TOP = 0.25;

/**
 * An image cut to `width` × `height` around its most confident face: the face
 * made `framing.faceHeight` of the frame and centred across it at
 * `framing.eyeLine` down. The cut is kept inside the image, so a face near an
 * edge sits nearer that edge rather than the picture gaining a border, and a
 * face too large for its framing is shown as large as the image allows.
 *
 * Without a face — an illustration, an avatar, a laughing face tilted past
 * what the cascade knows — it cuts as much of the image as the frame's shape
 * allows, centred across it and nearer the top than the bottom
 * (`UNFOUND_TOP`). Avatars are drawn centred and people stand with their head
 * high, so that keeps the subject. (sharp's attention crop, used before, went for
 * the busiest region and pushed illustrated faces against the frame edge.)
 *
 * `face` says which happened, so that a caller can name the photos to give a
 * hotspot.
 */
export async function cropToFace(
  image: Buffer,
  width: number,
  height: number,
  framing: Framing = PORTRAIT,
): Promise<{ jpeg: Buffer; face?: Face }> {
  // Upright first, so that the face is found where it will be cut from.
  const upright = await sharp(image).rotate().toBuffer();
  const [face] = await findFaces(upright);

  const { width: iw = width, height: ih = height } =
    await sharp(upright).metadata();
  const aspect = width / height;

  let left: number, top: number, cw: number, ch: number;
  if (face) {
    // The cut the framing asks for, shrunk to fit the image if it has to be.
    ch = face.size / framing.faceHeight;
    cw = ch * aspect;
    const fit = Math.min(1, iw / cw, ih / ch);
    ch *= fit;
    cw *= fit;
    left = Math.min(Math.max(face.x - cw / 2, 0), iw - cw);
    top = Math.min(Math.max(face.y - ch * framing.eyeLine, 0), ih - ch);
  } else {
    cw = Math.min(iw, ih * aspect);
    ch = cw / aspect;
    left = (iw - cw) / 2;
    top = (ih - ch) * UNFOUND_TOP;
  }

  const jpeg = await sharp(upright)
    .extract({
      left: Math.round(left),
      top: Math.round(top),
      width: Math.min(iw - Math.round(left), Math.round(cw)),
      height: Math.min(ih - Math.round(top), Math.round(ch)),
    })
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { jpeg, face };
}
