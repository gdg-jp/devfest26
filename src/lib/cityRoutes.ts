import { buildableCities, type ResolvedTenant } from "../tenants";
import {
  getProgramSessions,
  getProgramSpeakers,
  getStandaloneTalks,
  type ProgramSession,
  type ProgramTalk,
  type SpeakerProgram,
} from "../data/program";
import { messages } from "../i18n";
import { currentLangPrefix, currentLanguage } from "../i18n/language";
import { previewMode } from "../preview/mode";

/**
 * What a city page needs to find out which city it is for — whether it is one
 * of the shared pages in `src/routes/[tenant]/` or one of a city's own in
 * `src/routes/<slug>/`.
 */

/**
 * The patterns a city answers from its own directory — `/kansai`,
 * `/kansai/sessions/[slug]` — substituted in by `astro.config.ts` from the
 * file tree. See `src/lib/routeTable.ts`.
 */
declare const __CITY_ROUTES__: readonly string[] | undefined;

const owned = (
  typeof __CITY_ROUTES__ === "undefined" ? [] : __CITY_ROUTES__
).map(
  (pattern) =>
    new RegExp(
      `^${pattern
        .split("/")
        .map((segment) =>
          segment.startsWith("[...")
            ? ".*"
            : segment.startsWith("[")
              ? "[^/]+"
              : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/")}$`,
    ),
);

/**
 * A shared route's paths, less the ones a city answers itself.
 *
 * `src/routes/kansai/index.astro` is `/kansai` and so is `[tenant]` with
 * `tenant: "kansai"`. Astro would pick the former either way, since a static
 * segment outranks a parameter — but it would render both, then warn, and a
 * warning nobody reads is how a real collision goes unnoticed. So the shared
 * route steps aside here, and `astro.config.ts` makes any collision that is
 * left an error.
 *
 * `route` is the calling route's own pattern, `/[tenant]/sessions/[slug]`.
 */
export function exceptOwned<
  T extends { params: Record<string, string | undefined> },
>(route: string, paths: T[]): T[] {
  if (owned.length === 0) return paths;

  return paths.filter(({ params }) => {
    const path = route.replace(
      /\[(?:\.\.\.)?(\w+)\]/g,
      (_, name: string) => params[name] ?? "",
    );
    return !owned.some((pattern) => pattern.test(path));
  });
}

/**
 * The city a page in `src/routes/<slug>/` belongs to, read off its own URL.
 *
 * Those pages are static routes — `/kansai`, not `/[tenant]` — so there is no
 * `getStaticPaths` to hand them their city and no `params` to look it up by.
 * Reading the slug off the path rather than writing it into the page means a
 * page copied from one city's directory into another's cannot go on showing
 * the first city's name.
 *
 * `undefined` when the city is not one this build renders; answer with
 * `missingCity`.
 */
export async function ownCity(url: URL): Promise<ResolvedTenant | undefined> {
  const slug = url.pathname.slice(currentLangPrefix().length).split("/")[1];
  return (await buildableCities()).find((city) => city.slug === slug)?.site;
}

/**
 * What a page in `src/routes/<slug>/` answers when its city is not in this
 * build.
 *
 * With `TARGETS` naming cities, `astro.config.ts` leaves other cities'
 * directories out and this never happens. With no `TARGETS` it takes them all
 * in, since only discovery knows which cities exist, and a directory whose
 * city has gone from Sanity — or whose configuration does not resolve — lands
 * here. A static build writes no file for a response with no body, so the page
 * is simply absent, as the shared route's would be. The preview says so.
 *
 * 204 rather than 404: Astro answers an empty 404 with its own error page, and
 * would write that out in place of the page instead of writing nothing.
 */
export function missingCity(url: URL): Response {
  const slug = url.pathname.slice(currentLangPrefix().length).split("/")[1];

  if (!previewMode) {
    console.warn(
      `[routes] Skipping ${url.pathname}: src/routes/${slug}/ is here, but ` +
        `"${slug}" is not a city this build renders.`,
    );
    return new Response(null, { status: 204 });
  }

  return notFound(messages(currentLanguage()).notFound.city(slug));
}

/**
 * The other half of `getStaticPaths`.
 *
 * A static build walks every city and every session up front and hands each
 * page its subject as a prop. The draft preview renders one page at a time, on
 * demand, and has only the URL — so each route asks here for the same thing
 * `getStaticPaths` would have handed it, for the one path being asked for.
 *
 * Deliberately built out of the same functions: `buildableCities`,
 * `getProgramSessions`, `getProgramSpeakers`, `getStandaloneTalks`. The point
 * is not to look up a path but to answer *exists, and is on the programme* the
 * same way the build does — so a session the build would not have published
 * does not appear here either, and a preview URL means what its published
 * counterpart would mean.
 */

/** The `[tenant]` and `[slug]` segments, as an on-demand render receives them. */
type Params = Record<string, string | undefined>;

async function cityOf(params: Params) {
  if (!params.tenant) return undefined;
  return (await buildableCities()).find((city) => city.slug === params.tenant);
}

/** `/[tenant]` */
export async function cityProps(
  params: Params,
): Promise<{ site: ResolvedTenant } | undefined> {
  const city = await cityOf(params);
  return city && { site: city.site };
}

/** `/[tenant]/sessions/[slug]` */
export async function sessionProps(
  params: Params,
): Promise<{ site: ResolvedTenant; session: ProgramSession } | undefined> {
  const city = await cityOf(params);
  if (!city) return undefined;

  const session = (await getProgramSessions(city.slug)).find(
    (candidate) => candidate.slug === params.slug,
  );
  return session && { site: city.site, session };
}

/** `/[tenant]/speakers/[slug]` */
export async function speakerProps(
  params: Params,
): Promise<(SpeakerProgram & { site: ResolvedTenant }) | undefined> {
  const city = await cityOf(params);
  if (!city) return undefined;

  const speaker = (await getProgramSpeakers(city.slug)).find(
    (candidate) => candidate.slug === params.slug,
  );
  return speaker && { site: city.site, ...speaker };
}

/** `/[tenant]/talks/[slug]` */
export async function talkProps(params: Params): Promise<
  | {
      site: ResolvedTenant;
      session: ProgramSession;
      talk: ProgramTalk;
    }
  | undefined
> {
  const city = await cityOf(params);
  if (!city) return undefined;

  const found = (await getStandaloneTalks(city.slug)).find(
    ({ talk }) => talk.slug === params.slug,
  );
  return found && { site: city.site, ...found };
}

/** `/[tenant]/favicon.svg` */
export async function themeProps(params: Params) {
  const city = await cityOf(params);
  return city && { theme: city.site.theme };
}

/**
 * What a URL that resolves to nothing gets.
 *
 * Plain, because this is not a page of the site: a preview URL only fails to
 * resolve when the content behind it has not been written yet or has just been
 * renamed, and the useful thing to say is which of the two it looks like.
 * `/preview/status` next door has the detail.
 */
export function notFound(what: string): Response {
  const t = messages(currentLanguage());
  return new Response(
    `<!doctype html><html lang="${t.meta.htmlLang}"><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<meta name="robots" content="noindex, nofollow">` +
      `<title>${escapeHtml(t.notFound.title)}</title>` +
      `<style>body{background:#f7f8fc;color:#172033;font:16px/1.7 system-ui,"Noto Sans JP",sans-serif;margin:0}` +
      `main{background:#fff;border:1px solid #dde1eb;border-radius:16px;max-width:640px;margin:8vh auto;padding:32px}` +
      `h1{font-size:1.3rem;margin-top:0}a{color:#235bd8}</style>` +
      `<main><h1>${escapeHtml(t.notFound.heading(what))}</h1>` +
      `<p>${escapeHtml(t.notFound.body)}</p>` +
      `<p><a href="/preview/status">${escapeHtml(t.notFound.statusLink)}</a></p></main></html>`,
    {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      status: 404,
    },
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] as string,
  );
}
