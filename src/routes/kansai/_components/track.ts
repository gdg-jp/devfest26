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
  "var(--blue)": { ht: "var(--ht-blue)", stickers: ["arrow", "ellipsis"] },
  "var(--green)": { ht: "var(--ht-green)", stickers: ["colon", "equals"] },
  "var(--yellow)": { ht: "var(--ht-yellow)", stickers: ["slash", "chevron"] },
  "var(--red)": { ht: "var(--ht-red)", stickers: ["plus", "period"] },
};

export function trackTone(track: Track) {
  const tone = BY_COLOR[track.data.color] ?? BY_COLOR["var(--yellow)"];
  return {
    solid: track.data.color,
    ink: track.data.darkInk ? "var(--ink)" : "var(--surface)",
    ht: tone.ht,
    pa: trackPastel(track),
    stickers: tone.stickers,
  };
}

/** `13:05` → 785. */
export const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "Llion Jones 氏" → "Llion Jones", as every Kansai card prints a name. */
export const bare = (name: string) => name.replace(/\s*氏$/, "");
