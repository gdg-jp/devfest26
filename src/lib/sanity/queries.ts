/**
 * Every content query is scoped by `event->slug.current == $tenant`.
 *
 * With the Markdown loaders the scoping is structural — a city's content is in
 * its own directory and cannot leak. Sanity has no such guarantee, so the
 * filter is the guarantee, and it is written once here rather than at each
 * call site.
 */

const SCOPE = 'event->slug.current == $tenant';

export const SPEAKERS = `*[_type == "speaker" && ${SCOPE}]{
  _id, name, role, initial, photo, bio
}`;

export const SESSIONS = `*[_type == "session" && ${SCOPE}]{
  _id, track, order, title, abstract,
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

/** The tenant document itself — matched on its own slug, not a reference. */
export const EVENT = `*[_type == "event" && slug.current == $tenant][0]{
  "tenant": slug.current,
  theme, title, titleEn, description,
  taglineLead, taglineAccent,
  startsAt, endsAt,
  socialLabel, socialStart, socialEnd,
  venue, format, formatShort, fee, host, coHosts,
  stats, links, nav, footerNav, tracks, timetable
}`;
