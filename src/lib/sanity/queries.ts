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
  _id, name, role, initial, photo, bio,
  "slug": slug.current,
  ${TENANT}
}`;

export const TRACKS = `*[_type == "track" && ${SCOPE}]{
  _id, order, label, sub, color, textColor, darkInk, pending, cardLabel,
  ${TENANT}
}`;

/**
 * References stay as raw `_id`s: that is the handle the content collections
 * use for an entry, so `reference()` resolves them without a second lookup.
 * `slug` is separate and only ever a URL segment.
 */
export const SESSIONS = `*[_type == "session" && ${SCOPE}]{
  _id, title, abstract, start, end,
  "slug": slug.current,
  "track": track->_id,
  "speakers": speakers[]->_id,
  "talks": talks[]->_id,
  ${TENANT}
}`;

export const TALKS = `*[_type == "talk" && ${SCOPE}]{
  _id, order, title, abstract, start,
  "slug": slug.current,
  "session": session->_id,
  "speakers": speakers[]->_id,
  ${TENANT}
}`;

export const MEETUPS = `*[_type == "meetup" && ${SCOPE}]{
  _id, no, title, subtitle, status, date, doorsAt, startsAt, endsAt,
  venue, capacity, fee, url, cta, program, description,
  ${TENANT}
}`;

export const PARTNERS = `*[_type == "partner" && ${SCOPE}]{
  _id, name, url, handle, order, rail, description,
  ${TENANT}
}`;

export const ABOUT = `*[_type == "aboutPage" && ${SCOPE}]{
  _id, lead, body, callout, audienceEyebrow, audienceHeading, audienceItems,
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
 * One city's own configuration — matched on its own slug, not a reference.
 *
 * This is tier 2: everything a city's pages need and the front page does not.
 * The tier-1 projection the front page reads lives in
 * `src/tenants/discovery.ts`, which runs without this client so that CI can
 * ask what cities exist before installing anything.
 */
const EVENT_FIELDS = `
  theme, title, subtitle, titleEn, subtitleEn, description,
  taglineLead, taglineAccent,
  lang, locale,
  startsAt, endsAt,
  socialLabel, socialStart, socialEnd,
  venue, format, formatShort, fee, host, coHosts,
  stats, links, nav, footerNav,
  fixtures[]{start, end, label, note, "tracks": tracks[]->_id},
  isPublic`;

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
  _id, title, region, startsAt, endsAt, city, venue, theme, url, note,
  "slug": slug.current
}`;
