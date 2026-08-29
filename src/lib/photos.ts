import { byTenant } from "../data/collections";
import type { Photo } from "./photo";

/**
 * A city's photo set, or nothing.
 *
 * Photos trail the events they come from: a city in its first year has none,
 * and a city mid-preparation has some. Rather than make every section repeat
 * that reasoning, the lookups below always answer, and answer `undefined` when
 * there is no photo to show.
 */

async function photoSet(tenant: string) {
  // At most one per city — and none at all for a city that has taken no
  // photographs yet, which is a miss rather than an error.
  return (await byTenant("photos", tenant))[0];
}

type Backdrop = { image: Photo; credit?: string };

/** The photo printed into the tenant colour behind the closing CTA. */
export async function registerBackdrop(
  tenant: string,
): Promise<Backdrop | undefined> {
  return (await photoSet(tenant))?.data.registerBackdrop;
}

/** The photo behind the countdown band, under the opaque digit cards. */
export async function countdownBackdrop(
  tenant: string,
): Promise<Backdrop | undefined> {
  return (await photoSet(tenant))?.data.countdownBackdrop;
}

/**
 * The nth gutter prop, counting from 0. Sections claim a fixed index, so
 * adding a photo to the end of the list in the Studio fills the next empty
 * slot without moving the ones already placed.
 */
export async function propPhoto(
  tenant: string,
  index: number,
): Promise<Photo | undefined> {
  return (await photoSet(tenant))?.data.props?.[index]?.image;
}

/** Every credit worth printing, de-duplicated, for the footer colophon. */
export async function photoCredits(tenant: string): Promise<string[]> {
  const set = await photoSet(tenant);
  const credits = [
    set?.data.registerBackdrop?.credit,
    set?.data.countdownBackdrop?.credit,
  ].filter((c): c is string => Boolean(c));

  return [...new Set(credits)];
}
