import { stegaClean } from "@sanity/client/stega";
import type { ContentSourceMapParsedPath, FilterDefault } from "@sanity/client";
import { previewMode } from "./mode";

/**
 * Which strings the preview is allowed to hide edit information inside.
 *
 * Sanity's click-to-edit works by stega: every string the query returned gets
 * an invisible suffix — characters in the U+E0000 tag block, which render as
 * nothing — saying which document and which field it came from. The overlay in
 * the browser reads that back, so hovering a session title knows to open
 * `session.title`, and no component has to be annotated for it. See
 * `src/preview/visualEditing.ts` for the other half.
 *
 * The catch is that "renders as nothing" is only true of text that is
 * *rendered*. A value that is validated, compared or put in an attribute is a
 * value the suffix breaks, and the two halves of this site are unusually full
 * of those: `initial` is `z.string().max(2)` and would fail on a two-character
 * name, `stats[].tone` and `partner.rail` are enums, `venue.postalCode` ends up
 * in JSON-LD. A schema failure is not a cosmetic bug here either — the preview
 * drops the entry and lists it as a problem (`src/preview/problems.ts`), so an
 * unfiltered stega would empty the speaker section and blame the content.
 *
 * So this is an allow-list rather than a deny-list: a field earns encoding by
 * being prose somebody reads on the page. A field added to the Studio later is
 * silently not encodable, which costs an overlay; the other way round costs a
 * section.
 */

/**
 * Field names whose values are prose, by the name the *Studio document* uses.
 *
 * `text` is every Portable Text run — `bio`, `abstract`, the About body and the
 * partner and meetup descriptions all arrive as `…children[].text`, and the
 * encoder walks nothing else inside a block, so `style`, `marks` and `markDefs`
 * are out of reach by construction rather than by this list.
 *
 * Deliberately absent, each for a reason worth keeping written down:
 * `initial` (`max(2)`), `tone` / `rail` / `theme` / `status` (enums),
 * `textColor` / `darkInk` (CSS), `lang` and `locale` (attribute values),
 * `description` (only ever `<meta>` and Open Graph, so an overlay would have
 * nothing to point at), the address fields under `venue` (JSON-LD), and every
 * time-of-day string — `start`, `end`, `at`, `doorsAt` — where a hundred
 * invisible characters on "13:00" buys an overlay nobody is aiming for.
 */
const ENCODABLE = new Set([
  // Portable Text, whatever field it came from.
  "text",
  // event
  "title",
  "titleEn",
  "taglineLead",
  "taglineAccent",
  "socialLabel",
  "formatShort",
  "fee",
  "host",
  "coHosts",
  "value",
  "label",
  "note",
  // event.venue, and the plain `venue` string on meetups and external events
  "venue",
  "name",
  "area",
  "city",
  "cityEn",
  "region",
  // track
  "sub",
  "cardLabel",
  // session, talk
  "abstract",
  // speaker
  "role",
  // meetup
  "subtitle",
  "capacity",
  "cta",
  "what",
  "who",
  // partner
  "handle",
  // aboutPage
  "lead",
  "callout",
  "audienceEyebrow",
  "audienceHeading",
  "audienceItems",
  // photoSet
  "registerBackdropCredit",
  "countdownBackdropCredit",
]);

/**
 * The field a path is pointing at.
 *
 * Not `at(-1)`: an array of plain strings ends in its index, so
 * `audienceItems[0]` would be looked up as `0`, and an array of objects ends in
 * the field inside the object, which is the one that should be judged. Walking
 * back to the last *named* segment answers both — `audienceItems` for the
 * first, `tone` for `stats[].tone`.
 */
function field(path: ContentSourceMapParsedPath): string | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i];
    if (typeof segment === "string") return segment;
  }
  return undefined;
}

/**
 * The `stega.filter` the preview's client is configured with.
 *
 * Sanity's own filter runs first and is kept rather than replaced: it already
 * rejects ISO dates and URLs by their value, `slug.current`, anything starting
 * `_` or ending `Id`, and a denylist that covers `href`, `color`, `format`,
 * `locale`, `status`, `theme` and `url` — so the two together are narrower than
 * either, and this file only has to name what is left.
 */
export const encodable: FilterDefault = (props) => {
  if (!props.filterDefault(props)) return false;

  const name = field(props.sourcePath);
  return name !== undefined && ENCODABLE.has(name);
};

/**
 * The same string with any edit information taken back out.
 *
 * For the places where a string stops being text on a page: `<title>`, the
 * Open Graph tags, the JSON-LD. Nothing *looks* wrong without this — the
 * characters are invisible there too — but they would be copied into a shared
 * link's preview card and indexed by whatever reads the structured data, and
 * `<title>` is the one string a person routinely selects and pastes.
 *
 * Identity in a published build: `previewMode` is a build-time constant, so
 * this compiles away rather than being a call per page. See `./mode.ts`.
 */
export function clean<T>(value: T): T {
  return previewMode ? (stegaClean(value) as T) : value;
}
