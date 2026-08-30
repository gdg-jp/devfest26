import { buildableCities, type ResolvedTenant } from "../tenants";
import {
  getProgramSessions,
  getProgramSpeakers,
  getStandaloneTalks,
  type ProgramSession,
  type ProgramTalk,
  type SpeakerProgram,
} from "../data/program";

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
  return new Response(
    `<!doctype html><html lang="ja"><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<meta name="robots" content="noindex, nofollow">` +
      `<title>見つかりません — DevFest 2026 Preview</title>` +
      `<style>body{background:#f7f8fc;color:#172033;font:16px/1.7 system-ui,"Noto Sans JP",sans-serif;margin:0}` +
      `main{background:#fff;border:1px solid #dde1eb;border-radius:16px;max-width:640px;margin:8vh auto;padding:32px}` +
      `h1{font-size:1.3rem;margin-top:0}a{color:#235bd8}</style>` +
      `<main><h1>${escapeHtml(what)}はここにありません</h1>` +
      `<p>下書きにまだ無いか、スラッグが変わったか、公開されていない都市のページです。</p>` +
      `<p><a href="/preview/status">プレビューの状態を見る</a></p></main></html>`,
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
