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
 *
 * Every city-scoped mapper carries `tenant` through from the query. One build
 * now holds several cities in one store, and that field is what tells them
 * apart — see `byTenant` in `src/data/collections.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = any;

export function speakerEntry(doc: Doc): SanityEntry {
  // Twice the rendered size, so the avatar stays sharp on a 2x display.
  const size = AVATAR_SIZE * 2;

  return {
    id: doc._id,
    data: {
      tenant: doc.tenant,
      name: doc.name,
      role: doc.role,
      initial: doc.initial ?? undefined,
      slug: doc.slug ?? undefined,
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
      tenant: doc.tenant,
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
  const speakers = doc.speakers?.filter(
    (id: unknown): id is string => typeof id === "string",
  );
  const talks = doc.talks?.filter(
    (id: unknown): id is string => typeof id === "string",
  );

  return {
    id: doc._id,
    // GROQ dereferenced `track`, `speakers` and `talks` to plain `_id` strings;
    // `reference()` turns them back into collection references when it parses.
    data: {
      tenant: doc.tenant,
      track: doc.track,
      title: doc.title ?? undefined,
      // Empty in the Studio means "the talks name them", not "nobody", so it
      // has to reach the schema as absent rather than as an empty array.
      speakers: speakers?.length ? speakers : undefined,
      talks: talks?.length ? talks : undefined,
      slug: doc.slug ?? undefined,
      start: doc.start ?? undefined,
      end: doc.end ?? undefined,
    },
    html: portableTextToHtml(doc.abstract),
    body: portableTextToPlain(doc.abstract),
  };
}

export function talkEntry(doc: Doc): SanityEntry {
  const speakers =
    doc.speakers?.filter(
      (id: unknown): id is string => typeof id === "string",
    ) ?? [];

  return {
    id: doc._id,
    data: {
      tenant: doc.tenant,
      session: typeof doc.session === "string" ? doc.session : undefined,
      order: typeof doc.order === "number" ? doc.order : undefined,
      title: doc.title ?? undefined,
      speakers,
      slug: doc.slug ?? undefined,
      start: doc.start ?? undefined,
    },
    html: portableTextToHtml(doc.abstract),
    body: portableTextToPlain(doc.abstract),
  };
}

export function meetupEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    data: {
      tenant: doc.tenant,
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
      tenant: doc.tenant,
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
  // Keyed by document id, not by a fixed "about": one build holds several
  // cities, and a fixed id would have each city's About page overwrite the
  // last one's. The component finds it by tenant instead.
  return {
    id: doc._id,
    data: {
      tenant: doc.tenant,
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
 * One photo set per city, found by tenant like the About page.
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
    id: doc._id,
    data: {
      tenant: doc.tenant,
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

/**
 * A DevFest the portal links to but does not host. It belongs to no city, so
 * unlike every mapper above there is no `event` reference behind it — the
 * fields here are the whole of what the portal card shows.
 */
export function externalEventEntry(doc: Doc): SanityEntry {
  return {
    id: doc._id,
    data: {
      title: doc.title,
      region: doc.region,
      startsAt: doc.startsAt,
      endsAt: doc.endsAt ?? undefined,
      city: doc.city ?? undefined,
      venue: doc.venue ?? undefined,
      theme: doc.theme,
      url: doc.url,
      note: doc.note ?? undefined,
      slug: doc.slug ?? undefined,
    },
    html: "",
    body: "",
  };
}
