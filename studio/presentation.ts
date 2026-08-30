import { map } from "rxjs";
import { getPublishedId } from "sanity";
import {
  defineDocuments,
  type DocumentLocationResolver,
  type DocumentLocationsState,
} from "sanity/presentation";

/**
 * Which URL each document appears at, and which document each URL is showing.
 *
 * Presentation needs both directions. Opening a session in the Studio should
 * move the preview to that session's page (`locations`), and navigating the
 * preview to a page should select the document behind it in the form beside it
 * (`mainDocuments`). Neither is inferable: the site's routes live in
 * `astro.config.ts` and are resolved by `src/city/params.ts`, which the Studio
 * cannot see.
 *
 * So this file is a copy of the site's URL shapes, and the thing to keep true:
 *
 *     /                             the front page
 *     /{city}                       a city
 *     /{city}/sessions/{slug}
 *     /{city}/speakers/{slug}
 *     /{city}/talks/{slug}
 *
 * `{city}` is the `event` document's slug, reached through the `event`
 * reference every city-scoped document carries. `{slug}` is the document's own
 * slug, falling back to its id — `slugOf` in `src/data/program.ts` does exactly
 * that, so a session saved before anyone gave it a slug still has a page and
 * this still points at it.
 */

/**
 * One GROQ query for every type, run as a live subscription.
 *
 * The resolver-function form rather than the shorter `defineLocations({select,
 * resolve})`, and the reason is `event->`. That shorthand is evaluated by the
 * *preview* store, which understands dot paths into the document and nothing
 * else — a dereference silently resolves to nothing, so every city-scoped
 * document reported that it had no city. This form runs real GROQ, where
 * following the reference is the whole point.
 *
 * `coalesce(title, name)` because a speaker is the one type whose heading is
 * called something else, and one query for all of them is worth more than an
 * exactly-shaped one per type.
 */
const QUERY = `*[_id == $id][0]{
  "title": coalesce(title, name),
  "slug": slug.current,
  "tenant": event->slug.current
}`;

interface Doc {
  title?: string | null;
  slug?: string | null;
  tenant?: string | null;
}

/** Where a document appears, given what the query found and its published id. */
type Place = (doc: Doc, id: string) => DocumentLocationsState;

/**
 * What a document with no city attached gets.
 *
 * The single most likely half-finished state in this Studio — the schema
 * templates exist to prevent it (see `sanity.config.ts`) — and a blank
 * locations panel would leave an editor guessing. Naming it is the fix.
 */
const noCity: DocumentLocationsState = {
  message: "都市（event）が設定されていないため、まだどのページにも出ません。",
  tone: "caution",
};

const cityHome = (tenant: string) => ({
  title: `${tenant} のトップ`,
  href: `/${tenant}`,
});

/**
 * A city-scoped type that gets a page of its own.
 *
 * Two locations, not one: the page itself, and the city home, because that is
 * where the card for it is and where an editor tends to be looking when they
 * open the document.
 */
const ownPage =
  (kind: string, path: string): Place =>
  (doc, id) =>
    doc.tenant
      ? {
          locations: [
            {
              title: doc.title || kind,
              href: `/${doc.tenant}/${path}/${doc.slug || id}`,
            },
            cityHome(doc.tenant),
          ],
        }
      : noCity;

/**
 * A city-scoped type that is rendered into the city's front page rather than
 * getting one of its own — a track header, a partner, the About section.
 */
const citySection =
  (label: string): Place =>
  (doc) =>
    doc.tenant
      ? {
          locations: [
            { ...cityHome(doc.tenant), title: `${label}（${doc.tenant}）` },
          ],
        }
      : noCity;

const PLACES: Record<string, Place> = {
  event: (doc) =>
    doc.slug
      ? { locations: [{ title: doc.title || doc.slug, href: `/${doc.slug}` }] }
      : {
          message: "スラッグが未設定のため、まだ URL がありません。",
          tone: "caution",
        },

  session: ownPage("セッション", "sessions"),
  talk: ownPage("トーク", "talks"),
  speaker: ownPage("スピーカー", "speakers"),

  track: citySection("トラック"),
  aboutPage: citySection("About"),
  partner: citySection("パートナー"),
  meetup: citySection("ミートアップ"),
  photoSet: citySection("写真"),

  // The one type with no city: it belongs to the front page, which lists the
  // DevFests this site does not host.
  externalEvent: (doc) => ({
    locations: [{ title: doc.title || "トップページ", href: "/" }],
  }),
};

export const locations: DocumentLocationResolver = (params, context) => {
  const place = PLACES[params.type];
  if (!place) return undefined;

  /*
    The published id, because that is the handle the site uses. A preview
    reads with `perspective: "drafts"`, which hands back the draft's content
    under the published document's id, so `slugOf` in the site sees the
    published id and the URL is built from it — see `src/preview/drafts.ts`.
  */
  const id = getPublishedId(params.id);

  return context.documentStore
    .listenQuery(
      QUERY,
      { id },
      {
        // The Studio's own perspective, so an unpublished draft resolves to
        // the URL it will have rather than to nothing.
        perspective: params.perspectiveStack,
        variant: params.variant,
        tag: "presentation.locations",
      },
    )
    .pipe(map((doc: Doc | null) => place(doc ?? {}, id)));
};

/**
 * The reverse: the document a preview URL is showing.
 *
 * `slug.current == $slug || _id` covers the same fallback the locations above
 * do, and the draft id alongside it because a document that has never been
 * published only exists as `drafts.<id>` — which is precisely the document
 * somebody is previewing.
 *
 * `/` is deliberately absent. The front page is assembled from every city and
 * every external event, so there is no one document it is showing.
 */
const cityScoped = (type: string, path: string) => ({
  route: `/:tenant/${path}/:slug`,
  // Every value bound rather than interpolated, `type` included. It is a
  // literal three lines below and could be spliced in safely today, but a
  // query built by concatenation is a query the next person extends by
  // concatenation, and the next value may come off the URL.
  filter:
    "_type == $type && event->slug.current == $tenant && " +
    '(slug.current == $slug || _id == $slug || _id == "drafts." + $slug)',
  params: ({ params }: { params: Record<string, string> }) => ({
    type,
    tenant: params.tenant,
    slug: params.slug,
  }),
});

export const mainDocuments = defineDocuments([
  {
    route: "/:tenant",
    filter: '_type == "event" && slug.current == $tenant',
    params: ({ params }) => ({ tenant: params.tenant }),
  },
  cityScoped("session", "sessions"),
  cityScoped("speaker", "speakers"),
  cityScoped("talk", "talks"),
]);
