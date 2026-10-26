import type { Track } from "../../../data/tracks";
import { trackPastel } from "../../../data/tracks";
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

/** A track colour as Tokyo draws it. */
export const onTheme = <T extends string | undefined>(color: T): T =>
  (color && (OFF_THEME[color] ?? color)) as T;

export function trackTone(track: Track) {
  const solid = onTheme(track.data.color);
  const tone = BY_COLOR[solid] ?? BY_COLOR["var(--yellow)"];
  return {
    solid,
    ink: track.data.darkInk ? "var(--ink)" : "var(--surface)",
    ht: tone.ht,
    pa: onTheme(trackPastel(track)),
    stickers: tone.stickers,
  };
}

/** `13:05` → 785. */
export const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "山田 太郎 氏" → "山田 太郎", as every card prints a name. */
export const bare = (name: string) => name.replace(/\s*氏$/, "");
