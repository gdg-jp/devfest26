import type { Track } from "../../../data/tracks";
import { trackPastel } from "../../../data/tracks";
import type { ProgramTrack } from "../../../data/program";
import { CATEGORIES, type Lane } from "../_content";
import type { StickerName } from "./stickers";

/**
 * How a track dresses the session and speaker pages: its solid colour for
 * chips, the halftone of it for a panel's tab, the pastel for a card's fill,
 * and a pair of stickers so the four tracks do not look alike at a glance.
 *
 * Keyed on the solid colour for the same reason `trackPastel` is: the brand
 * has four, and a track painted some other way falls back to yellow rather
 * than to a guess.
 */
const BY_COLOR: Record<string, { ht: string; stickers: StickerName[] }> = {
  "var(--blue)": { ht: "var(--ht-blue)", stickers: ["scallop", "multiply"] },
  "var(--green)": { ht: "var(--ht-green)", stickers: ["colon", "equals"] },
  "var(--yellow)": { ht: "var(--ht-yellow)", stickers: ["slash", "chevron"] },
  "var(--red)": { ht: "var(--ht-red)", stickers: ["plus", "period"] },
};

/**
 * Tokyo's theme is red, and its pages carry no blue. A track the programme
 * paints blue is drawn in the theme's red instead — Tokyo's tracks are blue
 * and green, so they stay apart at a glance. The programme's own data is
 * left as it is; only the drawing changes.
 */
const OFF_THEME: Record<string, string> = {
  "var(--blue)": "var(--red)",
  "var(--ht-blue)": "var(--ht-red)",
  "var(--pa-blue)": "var(--pa-red)",
};

/**
 * Tracks drawn in another colour than the Studio gives them, by track id,
 * everywhere but the timetable. "AI が 動く" (Track B) is yellow in the
 * Studio and on connpass's timetable, but on the pages it is drawn in its
 * half's green, beside "AI と 書く" (Track A), as Meet's two tracks share red.
 */
const REPAINT: Readonly<Record<string, string>> = {
  "341a35f5-8299-4582-9ca2-3c19a0dfc9ad": "var(--green)",
};

/** A track colour as Tokyo draws it. */
export const onTheme = <T extends string | undefined>(color: T): T =>
  (color && (OFF_THEME[color] ?? color)) as T;

/**
 * A track's colours. With `asSet`, the colour the Studio gives it, blue
 * included — the timetable draws the tracks as GDG Tokyo's own timetable on
 * connpass does, where "AI で つくる" is blue. Everywhere else, on theme and
 * with `REPAINT` applied.
 */
export function trackTone(track: Track, { asSet = false } = {}) {
  const paint = <T extends string | undefined>(color: T) =>
    asSet ? color : onTheme(color);
  const repainted = asSet ? undefined : REPAINT[track.id];
  const drawn = repainted
    ? { ...track, data: { ...track.data, color: repainted } }
    : track;
  const solid = paint(drawn.data.color);
  const tone = BY_COLOR[solid] ?? BY_COLOR["var(--yellow)"];
  return {
    solid,
    ink: track.data.darkInk ? "var(--ink)" : "var(--surface)",
    ht: tone.ht,
    pa: paint(trackPastel(drawn)),
    stickers: tone.stickers,
  };
}

/**
 * A half of the theme's colours: its first category's track's, as the theme,
 * the key visual and the register choice all draw it. `null` while that
 * track is missing from the programme.
 */
export function laneTone(program: readonly ProgramTrack[], lane: Lane) {
  const first = CATEGORIES.find((category) => category.lane === lane);
  const group = program.find(({ track }) => track.id === first?.track);
  return group ? trackTone(group.track) : null;
}

/** `13:05` → 785. */
export const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "山田 太郎 氏" → "山田 太郎", as every card prints a name. */
export const bare = (name: string) => name.replace(/\s*氏$/, "");
