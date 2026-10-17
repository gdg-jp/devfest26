import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadDefaultJapaneseParser } from "budoux";
import * as opentypeModule from "opentype.js";

// A CommonJS package: under Node its exports arrive as `default`, under a
// bundler as the namespace itself.
const opentype =
  (opentypeModule as unknown as { default?: typeof opentypeModule }).default ??
  opentypeModule;

/**
 * Where a title's lines break.
 *
 * Left to satori, a title wraps wherever a line runs out — mid-word as often
 * as not ("ウェブフロントエン / ド") — and the layout had to guess how many
 * lines that would make. Here the breaks are chosen instead, for any title,
 * and each line is then drawn as a line of its own:
 *
 * 1. The title is cut into the pieces a line may end after: BudouX's phrases
 *    (Google's segmenter, the one Chrome uses for `word-break: auto-phrase`),
 *    spaces in Latin text, and — only where a phrase is too long for a line —
 *    the words inside it, then its characters.
 * 2. Japanese line-breaking rules (kinsoku) forbid some breaks outright: no
 *    line starts with "、" "。" "ー" a small kana or a closing bracket, and
 *    none ends with an opening one.
 * 3. Every piece is measured with the font it will be set in, so a line's
 *    width is known, not estimated.
 * 4. Of all the ways to break the title into the fewest lines that fit, the
 *    one chosen has the most even lines and the fewest breaks inside a
 *    phrase — so a title never ends on a lone word, and never splits a word
 *    when a phrase boundary would do.
 */

/* ---- Measuring ------------------------------------------------------------ */

type Font = opentypeModule.Font;
let fonts: Font[] | undefined;

/**
 * The title's two faces, in the order satori falls through them: Google Sans
 * Flex for what it has, Noto Sans JP for the rest. Black, the title's weight.
 */
function titleFonts(): Font[] {
  fonts ??= ["GoogleSansFlex-900.ttf", "NotoSansJP-Black.otf"].map((file) => {
    const data = readFileSync(join(process.cwd(), "src/assets/fonts", file));
    return opentype.parse(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    );
  });
  return fonts;
}

const advances = new Map<string, number>();

/** A character's advance, in ems, from the first face that has it. */
function advance(char: string): number {
  let em = advances.get(char);
  if (em === undefined) {
    const faces = titleFonts();
    const face =
      faces.find((font) => font.charToGlyphIndex(char) > 0) ?? faces.at(-1)!;
    em = face.charToGlyph(char).advanceWidth! / face.unitsPerEm;
    advances.set(char, em);
  }
  return em;
}

/** A run of text's width at a size, in pixels. */
export const measure = (text: string, size: number) =>
  [...text].reduce((sum, char) => sum + advance(char), 0) * size;

/* ---- Pieces --------------------------------------------------------------- */

/** What a break before a piece costs, beyond the evenness of the lines. */
const COST = {
  /** Between phrases: where a line should end. */
  phrase: 0,
  /** At a space inside a phrase — between the words of a name like
      "Google Apps Script", which reads best kept on one line. */
  space: 6,
  /** At a space between Latin and Japanese — "Google 式", "AI で" — where
      the space is typography, not a pause: worse than a change of script. */
  mixed: 10,
  /** Where the script changes inside a phrase: katakana to kanji, Latin to
      kana. Tolerable, when a phrase is too long for a line. */
  word: 8,
  /** Between characters of a word: a last resort. */
  character: 1000,
};

/* Kinsoku, after JIS X 4051: characters a line may not start with, and ones
   it may not end with. */
const NO_START = new Set([
  ..."、。，．,.：；:;！？!?）」』】〕〉》］｝)]}・ー〜…‥",
  ..."ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々ゝゞヽヾ",
  ..."%％",
]);
const NO_END = new Set([..."（「『【〔〈《［｛([{“‘"]);

interface Piece {
  text: string;
  /** A space: dropped when a line breaks there. */
  space: boolean;
  /** What breaking before this piece costs; Infinity where kinsoku forbids. */
  cost: number;
}

const phrases = loadDefaultJapaneseParser();

/**
 * A run of one script: kanji, hiragana, katakana (with its long-vowel mark),
 * Latin letters and digits, or anything else. Words inside a phrase are cut
 * where the script changes — "ウェブフロントエンド|開発|の" — and nowhere
 * else. `Intl.Segmenter` would cut finer, but by a dictionary that splits
 * katakana loanwords into fragments ("ウ|ェ|ブ|フロント|エンド"); a title is
 * better set smaller than broken there.
 */
const SCRIPT_RUN =
  /\p{Script=Han}+[々〆]*|\p{Script=Hiragana}+|[\p{Script=Katakana}ー]+|[\p{Script=Latin}\p{Nd}'’\-.]+|./gu;

/**
 * The title as pieces, the finest the given line width needs: phrases where
 * phrases fit; inside one that does not, its Latin words, then its script
 * runs; characters only inside a run wider than a line on its own.
 */
function pieces(title: string, size: number, width: number): Piece[] {
  const fits = (text: string) => measure(text, size) <= width;
  const out: Piece[] = [];

  // A space is never broken before, only after: the line ends with the word
  // ahead of it, and the break's cost is the next word's.
  const space = (text: string) =>
    out.push({ text, space: true, cost: Infinity });
  const push = (text: string, cost: number) =>
    out.push({ text, space: false, cost });

  // BudouX leaves a title with no Japanese in it as one phrase. There every
  // space is a word boundary, and as good a place to break as any.
  const latin = !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(
    title,
  );

  /** What breaking at a space inside a phrase costs, by what is either side. */
  const atSpace = (before: string, after: string) =>
    latin || /[:：、，,。．!！?？)）」』]$/u.test(before)
      ? COST.phrase
      : /[\p{Script=Latin}\p{Nd}]$/u.test(before) &&
          /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(after)
        ? COST.mixed
        : COST.space;

  for (const phrase of phrases.parse(title)) {
    const runs = phrase.split(/(\s+)/);
    if (fits(phrase.trim())) {
      // Whole, with any space it opens with kept as a place to break.
      if (!runs[0] && runs[1]) space(runs[1]);
      push(phrase.trim(), COST.phrase);
      continue;
    }
    runs.forEach((run, i) => {
      if (!run) return;
      if (/^\s+$/.test(run)) return space(run);
      // At the phrase's own start, a break costs nothing; after a space
      // inside it, what that space is worth.
      const lead =
        i === 0 || (i === 2 && !runs[0])
          ? COST.phrase
          : atSpace(runs[i - 2] ?? "", run);
      if (fits(run)) return push(run, lead);
      (run.match(SCRIPT_RUN) ?? [run]).forEach((part, j) => {
        const cost = j === 0 ? lead : COST.word;
        if (fits(part)) return push(part, cost);
        [...part].forEach((char, k) =>
          push(char, k === 0 ? cost : COST.character),
        );
      });
    });
  }

  // Kinsoku: no break before a piece that may not start a line, nor after one
  // that may not end it.
  out.forEach((piece, i) => {
    const before = out[i - 1];
    if (!before) return;
    if (!piece.space && NO_START.has(piece.text[0])) piece.cost = Infinity;
    if (!before.space && NO_END.has(before.text.at(-1)!)) {
      piece.cost = Infinity;
    }
  });
  return out;
}

/* ---- Breaking ------------------------------------------------------------- */

export interface Lines {
  lines: string[];
  /** The widest line, in pixels. */
  width: number;
  /** Whether a word had to be broken into characters to fit. */
  forced: boolean;
  /** How many lines end inside a phrase rather than between two. */
  splits: number;
}

/**
 * The best way to set a title in at most `maxLines` lines of `width` at
 * `size`, or nothing if it cannot be done.
 *
 * Fewest lines first: a title that fits in two is never spread over three.
 * Among the ways to make that many lines, the one with the least cost:
 * how unevenly the lines are filled — squared, so one short line costs more
 * than two slightly short ones — plus what each break costs.
 */
export function breakLines(
  title: string,
  size: number,
  width: number,
  maxLines: number,
): Lines | undefined {
  const all = pieces(title, size, width);
  const n = all.length;
  if (!n) return undefined;

  // Widths add up — nothing here kerns — so a line's width is a difference
  // of running totals, not a fresh measurement per line tried.
  const total = [0];
  all.forEach((piece) => total.push(total.at(-1)! + measure(piece.text, size)));

  // A line from piece i up to (not including) j: its text, without the spaces
  // at either end, and that text's width.
  const line = (i: number, j: number) => {
    let a = i;
    let b = j;
    while (a < b && all[a].space) a++;
    while (b > a && all[b - 1].space) b--;
    return {
      get text() {
        return all
          .slice(a, b)
          .map((p) => p.text)
          .join("");
      },
      width: total[b] - total[a],
    };
  };

  // best[k][j]: the cheapest way to set pieces 0..j as k lines.
  const best: { cost: number; from: number }[][] = [];
  for (let lines = 1; lines <= maxLines; lines++) {
    const row = new Array(n + 1).fill(undefined).map(() => ({
      cost: Infinity,
      from: -1,
    }));
    for (let j = 1; j <= n; j++) {
      const breakCost = j < n ? all[j].cost : 0;
      if (breakCost === Infinity) continue;
      for (let i = lines === 1 ? 0 : 1; i < j; i++) {
        const prior =
          lines === 1 ? (i === 0 ? 0 : Infinity) : best[lines - 2][i].cost;
        if (prior === Infinity) continue;
        const { width: used } = line(i, j);
        if (used > width) continue;
        const slack = (width - used) / width;
        const cost = prior + 100 * slack * slack + breakCost;
        if (cost < row[j].cost) row[j] = { cost, from: i };
      }
    }
    best.push(row);

    if (row[n].cost < Infinity) {
      // Walk the breaks back from the end.
      const cuts: number[] = [n];
      for (let k = lines - 1, j = n; k >= 0; k--) {
        j = best[k][j].from;
        cuts.unshift(j);
      }
      const set = cuts.slice(1).map((end, k) => line(cuts[k], end));
      return {
        lines: set.map((l) => l.text),
        width: Math.max(...set.map((l) => l.width)),
        forced: cuts
          .slice(1, -1)
          .some((cut) => all[cut].cost >= COST.character),
        splits: cuts.slice(1, -1).filter((cut) => all[cut].cost > 0).length,
      };
    }
  }
  return undefined;
}
