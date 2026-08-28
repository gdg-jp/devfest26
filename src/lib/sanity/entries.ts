import {
  AVATAR_SIZE,
  BACKDROP_WIDTH,
  COUNTDOWN_BACKDROP_RATIO,
  PROP_SIZE,
  REGISTER_BACKDROP_RATIO,
} from "../photo";
import { portableTextToHtml, portableTextToPlain } from "./portableText";
import { backdropUrl, propPhotoUrl, speakerPhotoUrl } from "./image";
import type { SanityEntry } from "../../loaders/sanity";

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
        ? {
            src: speakerPhotoUrl(doc.photo, size),
            width: size,
            height: size,
            remote: true,
          }
        : undefined,
    },
    html: portableTextToHtml(doc.bio),
    body: portableTextToPlain(doc.bio),
  };
}

export function trackEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    data: {
      order: doc.order,
      label: doc.label,
      sub: doc.sub,
      color: doc.color,
      textColor: doc.textColor,
      darkInk: doc.darkInk ?? undefined,
      pending: doc.pending ?? undefined,
      cardLabel: doc.cardLabel ?? undefined,
    },
    html: "",
    body: "",
  };
}

export function sessionEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    // GROQ dereferenced `track` and `speakers` to plain `_id` strings;
    // `reference()` turns them back into collection references when it parses.
    data: {
      track: doc.track,
      order: doc.order,
      title: doc.title ?? undefined,
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
    id: "about",
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

/**
 * One photo set per city, looked up by a fixed id like the About page.
 *
 * Positions are not editable here on purpose: where a prop sits in the gutter
 * is a layout decision that lives with the layout, so the Studio supplies an
 * ordered list and each section picks the index it wants.
 */
export function photoSetEntry(doc: Doc): SanityEntry {
  const backdrop = (image: Doc | undefined, credit: unknown, ratio: number) =>
    image
      ? {
          image: {
            src: backdropUrl(image, BACKDROP_WIDTH, ratio),
            width: BACKDROP_WIDTH,
            height: Math.round(BACKDROP_WIDTH * ratio),
            remote: true,
          },
          credit: (credit as string | null) ?? undefined,
        }
      : undefined;

  return {
    id: "photos",
    data: {
      registerBackdrop: backdrop(
        doc.registerBackdrop,
        doc.registerBackdropCredit,
        REGISTER_BACKDROP_RATIO,
      ),
      countdownBackdrop: backdrop(
        doc.countdownBackdrop,
        doc.countdownBackdropCredit,
        COUNTDOWN_BACKDROP_RATIO,
      ),
      props: doc.props?.map((p: Doc) => ({
        // Twice the rendered size, so a tilted prop stays sharp on a 2x display.
        image: {
          src: propPhotoUrl(p, PROP_SIZE * 2),
          width: PROP_SIZE * 2,
          height: PROP_SIZE * 2,
          remote: true,
        },
      })),
    },
    html: "",
    body: "",
  };
}
