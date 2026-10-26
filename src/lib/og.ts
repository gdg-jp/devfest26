/**
 * The Open Graph card, as the pages see it.
 *
 * Each city's card is made by the build that makes the city's pages — see
 * `src/lib/ogCards.ts` — and saved inside that city's own directory under a
 * name taken from what the card says: `/kansai/og.3f9c1e0a2b.png`, and
 * `/en/kansai/og.….png` beside the English pages. Two things follow from that,
 * and they are why it works this way rather than the way it used to, a PNG per
 * city committed to `public/og/` by hand:
 *
 * - The card is drawn from what the build read from Sanity, at the same moment
 *   as the page around it. A committed image was drawn from whatever was there
 *   the last time somebody remembered to run a script — and for Tokyo that was
 *   the placeholder config the city started from, months before the CMS had
 *   its real date and venue.
 * - A card whose content changes gets a new URL. Link previews are cached by
 *   image URL — by X, Facebook, Slack — so a card that changed under a fixed
 *   name would go on showing the old one for as long as each of them pleased.
 *
 * The name cannot be known while a page is being rendered: the card is a
 * screenshot of another page in the same build. So pages write a placeholder,
 * and the build swaps in the real name once the card exists.
 *
 * Dependency-free, because `astro.config.ts` reads it too.
 */

/**
 * Whether this build makes cards, substituted in by `src/lib/ogCards.ts`.
 *
 * False in `astro dev`, in the draft preview, and in a local build with no
 * Chrome to take the screenshot with — a page there carries no `og:image`
 * rather than one that points at nothing. A CI build without Chrome fails
 * instead of quietly publishing pages with no card.
 */
declare const __OG_CARDS__: boolean | undefined;

export const makesOgCards: boolean =
  typeof __OG_CARDS__ === "boolean" ? __OG_CARDS__ : false;

/** Written where the card's hash will go, and replaced after the build. */
export const OG_CARD_PENDING = "__OG_CARD__";

/** The card's file name inside its city's directory. */
export const ogCardFile = (hash: string) => `og.${hash}.png`;
