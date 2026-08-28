import { getEntry } from "astro:content";
import type { Photo } from "./photo";

/**
 * The city's photo set, or nothing.
 *
 * Photos trail the events they come from: a city in its first year has none,
 * and a city mid-preparation has some. Rather than make every section repeat
 * that reasoning, the lookups below always answer, and answer `undefined` when
 * there is no photo to show.
 */

async function photoSet() {
  // Tokyo has no `photos/photos.md` and no `photoSet` document. Astro treats a
  // missing entry in a collection that exists as a miss, not an error.
  return await getEntry("photos", "photos");
}

type Backdrop = { image: Photo; credit?: string };

/** The photo printed into the tenant colour behind the closing CTA. */
export async function registerBackdrop(): Promise<Backdrop | undefined> {
  return (await photoSet())?.data.registerBackdrop;
}

/** The photo behind the countdown band, under the opaque digit cards. */
export async function countdownBackdrop(): Promise<Backdrop | undefined> {
  return (await photoSet())?.data.countdownBackdrop;
}

/**
 * The nth gutter prop, counting from 0. Sections claim a fixed index, so
 * adding a photo to the end of the list in the Studio fills the next empty
 * slot without moving the ones already placed.
 */
export async function propPhoto(index: number): Promise<Photo | undefined> {
  return (await photoSet())?.data.props?.[index]?.image;
}

/** Every credit worth printing, de-duplicated, for the footer colophon. */
export async function photoCredits(): Promise<string[]> {
  const set = await photoSet();
  const credits = [
    set?.data.registerBackdrop?.credit,
    set?.data.countdownBackdrop?.credit,
  ].filter((c): c is string => Boolean(c));

  return [...new Set(credits)];
}
