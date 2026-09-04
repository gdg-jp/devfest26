/**
 * Tracks are structural, not editorial: the entry id is what a session's
 * frontmatter points at, and the colour is the rail that runs through the
 * timetable row, the track header and every card's session number.
 *
 * The definitions live in the `tracks` collection — `src/content/<city>/tracks/`
 * or the Studio — because how many tracks a DevFest runs, and what they are
 * called, is a local decision. Nothing here fixes the set of ids, so a city can
 * run two tracks or five without any of this changing.
 */

import type { CollectionEntry } from "astro:content";
import { byTenant } from "./collections";

export type Track = CollectionEntry<"tracks">;
export type { Fixture } from "../tenants/types";

/** Every track for one city, in the order it should be rendered. */
export async function getTracks(tenant: string): Promise<Track[]> {
  const tracks = await byTenant("tracks", tenant);
  return tracks.sort((a, b) => a.data.order - b.data.order);
}

/** Pastel rotation used to keep adjacent speaker blocks from matching. */
export const pastelCycle = ["blue", "green", "yellow", "red"] as const;

/**
 * The pale fill a track's blocks take in the timetable.
 *
 * A table rather than a calculation, because the brand's pastels are their own
 * four colours and not tints of the core four — `--pa-blue` is a cyan where
 * `--blue` is a blue, and mixing white into the latter never arrives at the
 * former. The table is closed for the same reason `src/styles/tokens.css` has
 * exactly four theme blocks: the brand guide has four core colours. A track
 * painted some other way is drawn plain rather than guessed at.
 */
const PASTELS: Record<string, string> = {
  "var(--blue)": "var(--pa-blue)",
  "var(--green)": "var(--pa-green)",
  "var(--yellow)": "var(--pa-yellow)",
  "var(--red)": "var(--pa-red)",
};

export function trackPastel(track: Track): string {
  return PASTELS[track.data.color] ?? "var(--surface)";
}
