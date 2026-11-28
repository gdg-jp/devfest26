import type { Venue } from "../../tenants/types";

/**
 * The venue's address on one line. The Studio's locality and street can share
 * a district ("千代田区丸の内" + "丸の内２丁目…"); each part joins on where
 * the last one left off.
 */
export const venueAddress = (venue: Venue) =>
  [venue.addressLocality, venue.streetAddress].reduce<string>(
    (joined, part) => {
      if (!part) return joined;
      const overlap = [...Array(Math.min(joined.length, part.length)).keys()]
        .map((i) => i + 1)
        .filter((n) => joined.endsWith(part.slice(0, n)))
        .pop();
      return joined + part.slice(overlap ?? 0);
    },
    venue.addressRegion ?? "",
  );
