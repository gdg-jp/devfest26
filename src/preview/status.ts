import type { APIRoute } from "astro";
import { buildableCities } from "../tenants";
import { getProgramSessions, getProgramSpeakers } from "../data/program";
import { getPortalEvents } from "../portal/events";
import { readToken } from "../lib/sanity/env";
import { draftProblems, draftsTakenAt } from "./drafts";
import { combine, recordInto, recording, report } from "./problems";

/**
 * What this preview can and cannot show, as JSON.
 *
 * It renders the programme before answering. That is the whole design: almost
 * every check in this codebase runs while a page is being built — a session
 * with nobody on it, a talk pointing at another city's slot, two entries
 * claiming one URL — so an endpoint that only read the snapshot would report
 * "nothing wrong" about content that no page can actually draw. Walking every
 * city here is what makes the answer complete, and it costs one Sanity round
 * trip because they all come out of the same snapshot.
 *
 * The bar at the foot of every page reads this. `src/preview/Bar.astro`.
 */
export const GET: APIRoute = async () => {
  try {
    /*
      This walk's own recording. Two of these can be in flight at once — the
      bar on every page fetches this, and an organiser with three tabs is not
      an unusual thing — and each one has to answer with what it found rather
      than with whatever the other one had reached by then.
    */
    const walk = recording();

    const cities = await recordInto(walk, async () => {
      const cities = await buildableCities();

      /*
        A deployment without a read token never gets this far — the gate serves
        its setup page instead, because a preview showing published content is
        the one failure that teaches an editor to distrust the thing. A local
        `wrangler dev` may legitimately not have one, and then this is what says
        so, on every page, rather than letting somebody spend an afternoon
        wondering why their draft is not in there.
      */
      if (!readToken()) {
        report(
          "preview",
          "SANITY_READ_TOKEN がないため、下書きではなく公開済みの内容を表示しています。",
        );
      }

      for (const city of cities) {
        await getProgramSessions(city.slug);
        await getProgramSpeakers(city.slug);
      }
      await getPortalEvents();

      return cities;
    });

    // The documents that could not be read, plus the pages that could not be
    // assembled from the ones that could.
    const { problems: found, dropped } = combine(await draftProblems(), walk);

    return json({
      at: new Date(await draftsTakenAt()).toISOString(),
      drafts: Boolean(readToken()),
      cities: cities.map((city) => city.slug),
      problems: found,
      dropped,
    });
  } catch (error) {
    // The endpoint that reports failures is the last thing that should fail.
    // If reading Sanity itself broke, saying so here is more use than a 500 no
    // one sees the body of.
    return json(
      {
        at: null,
        cities: [],
        problems: [
          {
            where: "preview",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        dropped: 0,
      },
      500,
    );
  }
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=UTF-8",
    },
    status,
  });
