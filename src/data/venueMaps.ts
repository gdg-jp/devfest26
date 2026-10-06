import type { TenantId } from "../tenants/ids";

/**
 * Each city's venue map, drawn beside the overview's spec.
 *
 * The URL is Google Maps' own embed: open the venue in Google Maps, Share →
 * Embed a map, and take what is inside the iframe's `src="…"` — not the whole
 * tag. The type holds it to that host, since whatever is here becomes an
 * iframe on the city's home page.
 *
 * Kept here rather than in the CMS, and a city with no entry simply has no
 * map: the overview falls back to its stats beside the spec, as before. Adding
 * a city is one line.
 */

type MapEmbedUrl = `https://www.google.com/maps/embed?${string}`;

export const venueMaps: Partial<Record<TenantId, MapEmbedUrl>> = {
  // ＪＰタワー ホール＆カンファレンス (KITTE 4F)
  tokyo:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1620.4396813265437!2d139.7636810276845!3d35.67997233716514!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f48!3m3!1m2!1s0x60188bfa3084ecc3%3A0x7f8e4818b3214f19!2zSlDjgr_jg6_jg7wg44Ob44O844Or77yG44Kr44Oz44OV44Kh44Os44Oz44K5!5e0!3m2!1sja!2sjp!4v1791170588148!5m2!1sja!2sjp",
};
