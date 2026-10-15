import type { ResolvedTenant } from "../tenants";
import type { ProgramSession, Speaker } from "../data/program";
import type { CardInput, PhotoInput } from "./og/input";
import { isRemotePhoto } from "./photo";
import { dataset, projectId } from "./sanity/env";
import { hasCityRoute } from "./cityRoutes";
import { tenantPath } from "./url";
import { messages } from "../i18n";
import { currentLanguage } from "../i18n/language";
import { previewMode } from "../preview/mode";

/**
 * A session's Open Graph card, as the site describes it: what goes on it, and
 * where it is published.
 *
 * The card is drawn by `src/lib/og/` from a `CardInput` — plain data, the same
 * shape a hand-written JSON file has. This is where a session on the site's
 * programme becomes one. The city's route draws it
 * (`src/routes/tokyo/og/sessions/[slug].png.ts`), the session page points
 * `og:image` at it, and the export route hands it to the command line
 * (`scripts/og.ts`), all through `sessionCard` here, so all three read the
 * session the same way.
 *
 * Kept free of Node: the session page imports it, and in the draft preview
 * that page runs in a Worker.
 */

/** Bump when the drawing changes, so every card's URL changes with it. */
const DESIGN_VERSION = 7;

/** The pattern a city's directory adds to have session cards. */
const route = (tenant: string) => `/${tenant}/og/sessions/[slug].png`;

/** Everyone on the slot, in running order, nobody twice. */
export const sessionSpeakers = (session: ProgramSession): Speaker[] => [
  ...new Map(
    session.talks
      .flatMap((talk) => talk.speakers)
      .map((speaker) => [speaker.id, speaker]),
  ).values(),
];

function photoOf(speaker: Speaker): PhotoInput | undefined {
  const { photo } = speaker.data;
  if (!photo) return undefined;
  if (isRemotePhoto(photo)) {
    const id = projectId();
    return photo.source && id
      ? { sanity: { projectId: id, dataset: dataset(), image: photo.source } }
      : undefined;
  }
  // `astro:assets` keeps the file's own path on the import, unenumerated.
  return (photo as { fsPath?: string }).fsPath;
}

const capitalise = (word: string) =>
  word.slice(0, 1).toUpperCase() + word.slice(1);

/**
 * The card for a session, or nothing when it should not have one: a slot
 * without a title is not worth a picture of its own and keeps the city's.
 */
export function sessionCard(
  site: ResolvedTenant,
  session: ProgramSession,
): CardInput | undefined {
  const title = session.entry.data.title;
  if (!title) return undefined;

  return {
    id: session.slug,
    edition: `${capitalise(site.tenant)} ${site.event.startsAt.slice(0, 4)}`,
    title,
    speakers: sessionSpeakers(session).map((speaker) => ({
      name: speaker.data.name,
      role: speaker.data.role,
      initial: speaker.data.initial,
      photo: photoOf(speaker),
    })),
    lang: currentLanguage(),
    theme: site.theme,
  };
}

async function fingerprint(card: CardInput): Promise<string> {
  const text = JSON.stringify({ v: DESIGN_VERSION, ...card });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest).slice(0, 5)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface CardImage {
  /** Root-relative, with a query that changes whenever the picture does. */
  path: string;
  alt: string;
}

/**
 * Where this session's card is published, or nothing when its city draws none.
 *
 * The query is a digest of everything drawn on the card. The file is
 * republished on every build, but whoever unfurls a link — X, Slack, Facebook —
 * caches the image by URL and for far longer than the site's own headers say,
 * so a new title or photo has to arrive at a new URL to be seen.
 *
 * Never in the draft preview, which leaves the image routes out: they need
 * Node to draw.
 */
export async function sessionCardImage(
  site: ResolvedTenant,
  session: ProgramSession,
): Promise<CardImage | undefined> {
  if (previewMode || !hasCityRoute(route(site.tenant))) return undefined;

  const card = sessionCard(site, session);
  if (!card) return undefined;

  const separator = messages(currentLanguage()).common.nameSeparator;
  const names = card.speakers.map((s) => s.name).join(separator);
  return {
    path: `${tenantPath(site.tenant, `/og/sessions/${session.slug}.png`)}?v=${await fingerprint(card)}`,
    alt: names ? `${card.title}｜${names}` : card.title,
  };
}
