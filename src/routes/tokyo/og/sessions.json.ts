import type { APIRoute } from "astro";
import { buildableCities } from "../../../tenants";
import { getProgramSessions } from "../../../data/program";
import { sessionCard } from "../../../lib/sessionCard";

/**
 * Every Tokyo session's card, as data — what `scripts/og.ts` reads to draw
 * cards from the site's own programme without a full build's worth of PNGs.
 *
 * Only with `OG_EXPORT` set, which only the command line sets. Otherwise this
 * answers with no body, and a static build writes no file for that: the
 * published site has no `sessions.json`.
 */
const CITY = "tokyo";

export const GET: APIRoute = async () => {
  if (!process.env.OG_EXPORT) return new Response(null, { status: 204 });

  const city = (await buildableCities()).find(({ slug }) => slug === CITY);
  const cards = city
    ? (await getProgramSessions(CITY)).flatMap((session) => {
        const card = sessionCard(city.site, session);
        return card ? [card] : [];
      })
    : [];

  return new Response(JSON.stringify(cards, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
