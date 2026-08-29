/**
 * Every city-scoped query is scoped by `event->slug.current == $tenant`.
 *
 * With the Markdown loaders the scoping is structural — a city's content is in
 * its own directory and cannot leak. Sanity has no such guarantee, so the
 * filter is the guarantee, and it is written once here rather than at each
 * call site.
 *
 * The two portal queries at the bottom are the deliberate exceptions: the
 * portal is the page that is about every city at once.
 */

const SCOPE = "event->slug.current == $tenant";

export const SPEAKERS = `*[_type == "speaker" && ${SCOPE}]{
  _id, name, role, initial, photo, bio,
  "slug": slug.current
}`;

export const TRACKS = `*[_type == "track" && ${SCOPE}]{
  _id, order, label, sub, color, textColor, darkInk, pending, cardLabel
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
  "speakers": speakers[]->_id
}`;

export const TALKS = `*[_type == "talk" && ${SCOPE}]{
  _id, order, title, abstract, start,
  "slug": slug.current,
  "session": session->_id,
  "speakers": speakers[]->_id
}`;

export const MEETUPS = `*[_type == "meetup" && ${SCOPE}]{
  _id, no, title, subtitle, status, date, doorsAt, startsAt, endsAt,
  venue, capacity, fee, url, cta, program, description
}`;

export const PARTNERS = `*[_type == "partner" && ${SCOPE}]{
  _id, name, url, handle, order, rail, description
}`;

export const ABOUT = `*[_type == "aboutPage" && ${SCOPE}]{
  _id, lead, body, callout, audienceEyebrow, audienceHeading, audienceItems
}`;

export const PHOTOS = `*[_type == "photoSet" && ${SCOPE}]{
  _id,
  registerBackdrop, registerBackdropCredit,
  countdownBackdrop, countdownBackdropCredit,
  props
}`;

/** The tenant document itself — matched on its own slug, not a reference. */
export const EVENT = `*[_type == "event" && slug.current == $tenant][0]{
  "tenant": slug.current,
  theme, title, titleEn, description,
  taglineLead, taglineAccent,
  startsAt, endsAt,
  socialLabel, socialStart, socialEnd,
  venue, format, formatShort, fee, host, coHosts,
  stats, links, nav, footerNav, timetable
}`;

/**
 * Every city, for the portal's list. Unscoped on purpose: this is the one
 * query that is about all of them at once.
 */
export const EVENTS = `*[_type == "event"] | order(startsAt asc){
  "slug": slug.current,
  title, theme, startsAt, endsAt, venue
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
