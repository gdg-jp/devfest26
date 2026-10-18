import type { APIRoute, GetStaticPaths } from "astro";
import { buildableCities } from "../../../../tenants";
import { getProgramSessions } from "../../../../data/program";
import { sessionCard } from "../../../../lib/sessionCard";
import { renderCard } from "../../../../lib/og/render";

/**
 * Each Tokyo session's Open Graph card, drawn at build time.
 *
 * Here rather than in `src/routes/[tenant]/` because this is what opts a city
 * in: the session page asks whether this route exists for its city — see
 * `sessionCardImage` in `src/lib/sessionCard.ts` — and points `og:image` here
 * only if it does. Another city copies this file into its own directory.
 *
 * The published site is static, so "on demand" is "on every build": a build
 * reads the same programme the pages do, and an edit in the Studio reaches the
 * card the next time the city is built. A slot with no title draws nothing and
 * keeps the city's card. The draft preview leaves this route out entirely — it
 * runs in a Worker, and drawing needs Node.
 *
 * Not while `OG_EXPORT` is set: that build is the command line's, which only
 * wants the data (`./sessions.json.ts`) and draws the cards itself.
 */
const CITY = "tokyo";

export const getStaticPaths = (async () => {
  if (process.env.OG_EXPORT) return [];
  const city = (await buildableCities()).find(({ slug }) => slug === CITY);
  if (!city) return [];

  return (await getProgramSessions(CITY)).flatMap((session) => {
    const card = sessionCard(city.site, session);
    return card ? [{ params: { slug: session.slug }, props: { card } }] : [];
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderCard(props.card)), {
    headers: { "Content-Type": "image/png" },
  });
