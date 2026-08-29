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
export type { TimetableRow } from "../tenants/types";

/** Every track for one city, in the order it should be rendered. */
export async function getTracks(tenant: string): Promise<Track[]> {
  const tracks = await byTenant("tracks", tenant);
  return tracks.sort((a, b) => a.data.order - b.data.order);
}

/** Pastel rotation used to keep adjacent speaker blocks from matching. */
export const pastelCycle = ["blue", "green", "yellow", "red"] as const;
