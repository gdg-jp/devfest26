import { AVATAR_SIZE } from '../photo';
import { portableTextToHtml, portableTextToPlain } from './portableText';
import { speakerPhotoUrl } from './image';
import type { SanityEntry } from '../../loaders/sanity';

/**
 * Sanity document → content-collection entry.
 *
 * These deliberately produce exactly the shape the existing zod schemas
 * already validate, so the collections keep one schema across both sources and
 * the components keep reading one set of field names.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = any;

export function speakerEntry(doc: Doc): SanityEntry {
  // Twice the rendered size, so the avatar stays sharp on a 2x display.
  const size = AVATAR_SIZE * 2;

  return {
    id: doc._id,
    data: {
      name: doc.name,
      role: doc.role,
      initial: doc.initial ?? undefined,
      photo: doc.photo
        ? { src: speakerPhotoUrl(doc.photo, size), width: size, height: size, remote: true }
        : undefined,
    },
    html: portableTextToHtml(doc.bio),
    body: portableTextToPlain(doc.bio),
  };
}

export function sessionEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    data: {
      track: doc.track,
      order: doc.order,
      title: doc.title ?? undefined,
      // GROQ dereferenced these to plain _id strings; `reference()` turns them
      // back into collection references when it parses.
      speakers: doc.speakers ?? [],
    },
    html: portableTextToHtml(doc.abstract),
    body: portableTextToPlain(doc.abstract),
  };
}

export function meetupEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    data: {
      no: doc.no,
      title: doc.title,
      subtitle: doc.subtitle ?? undefined,
      status: doc.status,
      date: doc.date ?? undefined,
      doorsAt: doc.doorsAt ?? undefined,
      startsAt: doc.startsAt ?? undefined,
      endsAt: doc.endsAt ?? undefined,
      venue: doc.venue ?? undefined,
      capacity: doc.capacity ?? undefined,
      fee: doc.fee ?? undefined,
      url: doc.url ?? undefined,
      cta: doc.cta ?? undefined,
      program: doc.program?.map((p: Doc) => ({
        at: p.at,
        what: p.what,
        who: p.who ?? undefined,
        talk: p.talk ?? undefined,
        break: p.break ?? undefined,
      })),
    },
    html: portableTextToHtml(doc.description),
    body: portableTextToPlain(doc.description),
  };
}

export function partnerEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    data: {
      name: doc.name,
      url: doc.url,
      handle: doc.handle,
      order: doc.order,
      rail: doc.rail,
    },
    html: portableTextToHtml(doc.description),
    body: portableTextToPlain(doc.description),
  };
}

export function aboutEntry(doc: Doc): SanityEntry {
  // The component looks this up by a fixed id, so the Studio's document id is
  // not used here — there is only ever one About page per city.
  return {
    id: 'about',
    data: {
      lead: doc.lead,
      callout: doc.callout ?? undefined,
      audience: doc.audienceItems?.length
        ? {
            eyebrow: doc.audienceEyebrow ?? undefined,
            heading: doc.audienceHeading,
            items: doc.audienceItems,
          }
        : undefined,
    },
    html: portableTextToHtml(doc.body),
    body: portableTextToPlain(doc.body),
  };
}
