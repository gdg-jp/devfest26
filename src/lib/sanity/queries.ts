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
  _id, order, title, abstract, start, end,
  "slug": slug.current,
  "track": track->_id,
  "speakers": speakers[]->_id,
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
export const EVENT = `*[_type == "event" && slug.current == $tenant][0]{
  "tenant": slug.current,
  theme, title, titleEn, description,
  taglineLead, taglineAccent,
  lang, locale,
  startsAt, endsAt,
  socialLabel, socialStart, socialEnd,
  venue, format, formatShort, fee, host, coHosts,
  stats, links, nav, footerNav, timetable
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
