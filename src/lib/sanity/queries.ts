/**
 * Every city-scoped query is scoped by `event->slug.current in $tenants`.
 *
 * `$tenants` is the set of cities this build was asked for — see
 * `src/tenants/selection.ts`. That is what carries the separation the
 * per-city Markdown directories used to give structurally: a job running
 * `TARGETS=kansai` never fetches a single Tokyo document, so no amount of bad
 * Tokyo data can reach it. Within a build that did ask for several cities, the
 * `tenant` each projection carries is what keeps them apart downstream.
 *
 * The filter is written once here rather than at each call site, because a
 * query that forgot it would leak silently.
 */

const SCOPE = "event->slug.current in $tenants";

/** Which city a document belongs to, as its content-collection entry sees it. */
const TENANT = `"tenant": event->slug.current`;

/**
 * One field of an internationalized array (see
 * `sanity-plugin-internationalized-array`), in the build's language —
 * falling back to Japanese when that language's item is missing, so a
 * session that has not been translated yet still has a title rather than a
 * blank one. `$lang` is bound by every query that uses this; see
 * `src/loaders/sanity.ts` and `src/tenants/discovery.ts`.
 */
const t = (field: string) =>
  `"${field}": coalesce(${field}[language == $lang][0].value, ${field}[language == "ja"][0].value)`;

/**
 * The same field, always in English rather than the build's language —
 * still falling back to Japanese if English is not filled in yet. For the
 * handful of things that are English regardless of which site is building:
 * the OG card (`src/city/OgPreview.astro`) and the topbar's compact city
 * badge (`editionEn` in `src/tenants/index.ts`), both drawn from
 * `titleEn`/`subtitleEn` below.
 */
const en = (field: string, as: string) =>
  `"${as}": coalesce(${field}[language == "en"][0].value, ${field}[language == "ja"][0].value)`;

/**
 * The same query with the city filter taken back out.
 *
 * The draft preview is one deployment holding every city at once, and it reads
 * at request time rather than at build time — so there is no `TARGETS` to scope
 * to and nothing to bind `$tenants` from without a round trip of its own. It
 * fetches the lot in one query and lets the `tenant` field separate them, which
 * is the second half of the scoping this module's header describes.
 *
 * Written here, next to `SCOPE`, and refusing to return a query it did not
 * actually change: a filter that silently failed to be removed would bind
 * nothing and return nothing, and an empty preview looks exactly like a preview
 * of an empty CMS.
 */
export function everyCity(query: string): string {
  const filter = ` && ${SCOPE}`;
  if (!query.includes(filter)) {
    throw new Error(
      `A city-scoped query was expected to contain "${filter}", and does not.`,
    );
  }
  return query.replace(filter, "");
}

export const SPEAKERS = `*[_type == "speaker" && ${SCOPE}]{
  _id, ${t("name")}, ${t("role")}, initial, photo, ${t("bio")},
  "slug": slug.current,
  ${TENANT}
}`;

export const TRACKS = `*[_type == "track" && ${SCOPE}]{
  _id, order, ${t("label")}, ${t("sub")}, color, textColor, darkInk, pending, ${t("cardLabel")},
  ${TENANT}
}`;

/**
 * References stay as raw `_id`s: that is the handle the content collections
 * use for an entry, so `reference()` resolves them without a second lookup.
 * `slug` is separate and only ever a URL segment.
 */
export const SESSIONS = `*[_type == "session" && ${SCOPE}]{
  _id, ${t("title")}, ${t("abstract")}, start, end,
  "slug": slug.current,
  "track": track->_id,
  "speakers": speakers[]->_id,
  "talks": talks[]->_id,
  ${TENANT}
}`;

export const TALKS = `*[_type == "talk" && ${SCOPE}]{
  _id, order, ${t("title")}, ${t("abstract")}, start,
  "slug": slug.current,
  "session": session->_id,
  "speakers": speakers[]->_id,
  ${TENANT}
}`;

export const MEETUPS = `*[_type == "meetup" && ${SCOPE}]{
  _id, no, ${t("title")}, ${t("subtitle")}, status, date, doorsAt, startsAt, endsAt,
  ${t("venue")}, ${t("capacity")}, ${t("fee")}, ${t("url")}, ${t("cta")},
  "program": program[]{at, ${t("what")}, ${t("who")}, talk, break},
  ${t("description")},
  ${TENANT}
}`;

export const PARTNERS = `*[_type == "partner" && ${SCOPE}]{
  _id, name, url, handle, order, rail, ${t("description")},
  ${TENANT}
}`;

export const ABOUT = `*[_type == "aboutPage" && ${SCOPE}]{
  _id, ${t("lead")}, ${t("body")}, ${t("callout")}, ${t("audienceEyebrow")}, ${t("audienceHeading")}, ${t("audienceItems")},
  ${TENANT}
}`;

export const PHOTOS = `*[_type == "photoSet" && ${SCOPE}]{
  _id,
  registerBackdrop, registerBackdropCredit,
  countdownBackdrop, countdownBackdropCredit,
  props,
  ${TENANT}
}`;

/**
 * A city's outward links, of which exactly one is localized.
 *
 * `register` is the only link on the site whose *destination* is a language
 * rather than a translation of one: a Japanese reader is sent to the connpass
 * listing and an English reader to the Luma one, because those are two
 * audiences on two platforms rather than one page written twice. `t` coalesces
 * to the Japanese value, so a city that has filled in only that one sends both
 * languages there — which is the right answer, since the alternative is a
 * button pointing at nothing.
 *
 * `connpass` and `luma` are the chapter's own pages rather than this event's,
 * and the footer shows both side by side instead of choosing between them — so
 * neither is localized. `community`, `cocJa` and `cocEn` name their language in
 * the field, or have none.
 *
 * Written as its own constant because a comment cannot live inside the template
 * literal below: it would be GROQ, not TypeScript.
 */
const LINKS = `"links": links{${t("register")}, community, connpass, luma, cocJa, cocEn}`;

/**
 * One city's own configuration — matched on its own slug, not a reference.
 *
 * This is tier 2: everything a city's pages need and the front page does not.
 * The tier-1 projection the front page reads lives in
 * `src/tenants/discovery.ts`, which runs without this client so that CI can
 * ask what cities exist before installing anything.
 */
const EVENT_FIELDS = `
  theme, ${t("title")}, ${t("subtitle")}, ${en("title", "titleEn")}, ${en("subtitle", "subtitleEn")}, ${t("description")},
  ${t("taglineLead")}, ${t("taglineAccent")},
  startsAt, endsAt,
  ${t("socialLabel")}, socialStart, socialEnd,
  "venue": venue{
    ${t("name")}, ${t("area")}, cityEn, ${t("city")}, ${t("region")},
    addressLocality, addressRegion, streetAddress, postalCode
  },
  ${t("format")}, ${t("formatShort")}, ${t("fee")}, host, coHosts,
  stats, ${LINKS},
  "nav": nav[]{href, ${t("label")}},
  "footerNav": footerNav[]{href, ${t("label")}},
  "fixtures": fixtures[]{start, end, ${t("label")}, ${t("note")}, "tracks": tracks[]->_id},
  isPublic, gaMeasurementId`;

export const EVENT = `*[_type == "event" && slug.current == $tenant][0]{
  "tenant": slug.current,${EVENT_FIELDS}
}`;

/**
 * Every city's `event` document at once — both tiers in one projection.
 *
 * The preview reads this instead of `EVENT`, and reads it once per render. That
 * is what lets a single request answer three separate questions from one moment
 * in the Studio: which cities exist (tier 1, `src/tenants/discovery.ts`), what
 * each one's pages need (tier 2, `src/tenants/fromSanity.ts`), and which slug
 * the URL is asking for. `slug` is projected alongside `tenant` because tier 1
 * knows the field by that name.
 */
export const EVENTS = `*[_type == "event"] | order(startsAt asc){
  "slug": slug.current,
  "tenant": slug.current,${EVENT_FIELDS}
}`;

/**
 * DevFests the portal links to but does not host — another chapter's event, a
 * past edition, anything with a page of its own somewhere else. These belong
 * to no city, so they carry no `event` reference and no scope filter.
 */
export const EXTERNAL_EVENTS = `*[_type == "externalEvent"]{
  _id, ${t("title")}, ${t("region")}, startsAt, endsAt, ${t("city")}, ${t("venue")}, theme, url, ${t("note")},
  "slug": slug.current
}`;
