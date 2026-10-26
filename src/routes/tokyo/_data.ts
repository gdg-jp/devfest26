import {
  getProgramSessions,
  getProgramSpeakers,
  type SpeakerProgram,
} from "../../data/program";
import { getTracks } from "../../data/tracks";
import { FEATURED, type Featured } from "./_content";

/**
 * What the home page's sections read from the programme, worked out once.
 *
 * Counts are derived rather than typed: a number in a hero that disagrees with
 * the timetable underneath it is worse than no number.
 */

export interface FeaturedSpeaker extends Featured {
  program: SpeakerProgram;
  /** The first talk they give, which is the one a card names. */
  talk: { title: string | undefined; href: string; start: string | undefined };
}

export async function homeData(tenant: string) {
  const [sessions, speakers, tracks] = await Promise.all([
    getProgramSessions(tenant),
    getProgramSpeakers(tenant),
    getTracks(tenant),
  ]);

  const featured: FeaturedSpeaker[] = FEATURED.flatMap((pick) => {
    const program = speakers.find((entry) => entry.slug === pick.slug);
    const first = program?.appearances[0];
    if (!program || !first) return [];
    return [
      {
        ...pick,
        program,
        talk: {
          title: first.talk.title ?? first.session.entry.data.title,
          href: first.talk.href,
          start: first.session.start,
        },
      },
    ];
  });

  const featuredSlugs = new Set(featured.map((f) => f.slug));

  // Sessions a featured speaker is on — badged on the timetable.
  const featuredSessions = sessions
    .filter((session) =>
      session.talks.some((talk) =>
        talk.speakers.some((speaker) =>
          featuredSlugs.has(speaker.data.slug ?? speaker.id),
        ),
      ),
    )
    .map((session) => session.slug);

  return {
    sessions,
    speakers,
    featured,
    featuredSessions,
    counts: {
      sessions: sessions.length,
      speakers: speakers.length,
      tracks: tracks.filter((track) => !track.data.pending).length,
    },
  };
}
