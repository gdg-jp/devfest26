/**
 * Tracks are structural, not editorial: the id is what a session's frontmatter
 * points at, and the colour is the rail that runs through the timetable row,
 * the track header and every card's session number.
 *
 * The definitions themselves are per-city and live in `src/tenants/<city>.ts`,
 * because how many tracks a DevFest runs is a local decision. The *vocabulary*
 * of ids is fixed (see `TrackId`) so the content schema can validate against it.
 */

import { tenant } from "../tenants";

export type { Track, TrackId, TimetableRow } from "../tenants/types";

export const tracks = tenant.tracks;

/** Timetable rows — the day at track granularity, which is all that is fixed. */
export const timetable = tenant.timetable;

/** Pastel rotation used to keep adjacent speaker blocks from matching. */
export const pastelCycle = ["blue", "green", "yellow", "red"] as const;
