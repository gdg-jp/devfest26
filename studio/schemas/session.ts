import { defineType, defineField, defineArrayMember } from "sanity";

export const session = defineType({
  name: "session",
  title: "Session",
  type: "document",
  fields: [
    defineField({
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "event" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "track",
      title: "Track",
      type: "reference",
      to: [{ type: "track" }],
      // The dropdown offers only the tracks belonging to the city this session
      // is already attached to, so a Kansai session cannot land on a Tokyo
      // track. Pick the event first and the list fills itself in.
      options: {
        filter: ({ document }) => ({
          filter: "event._ref == $eventId",
          params: {
            eventId: (document.event as { _ref?: string } | undefined)?._ref,
          },
        }),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL: /sessions/<slug>.",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "start",
      title: "Start",
      type: "string",
      description:
        'Wall clock on the day, e.g. "13:00". This is what orders the track ' +
        "and what places the session on the timetable, so there is no separate " +
        "order field. Leave it empty while the slot is undecided: the session " +
        "keeps its page and is listed under the timetable as 時間調整中.",
      validation: (Rule) =>
        Rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
          name: "HH:MM",
        }).warning('A time reads "HH:MM", zero-padded.'),
    }),
    defineField({
      name: "end",
      title: "End",
      type: "string",
      description:
        "Optional. Left empty, the session runs until the next thing on its " +
        "track starts — another session, or a fixture on the event. Fill it " +
        "in only when the gap that follows is deliberate.",
      validation: (Rule) =>
        Rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
          name: "HH:MM",
        }).warning('A time reads "HH:MM", zero-padded.'),
    }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "speaker" }] })],
      // Not required: a session that is split into talks names its speakers
      // there instead. The build fails if neither names anyone.
      description: "Leave empty when this session's talks name the speakers.",
    }),
    defineField({
      name: "talks",
      title: "Talks",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "talk" }],
          options: {
            filter: ({ document }) => ({
              filter: "event._ref == $eventId",
              params: {
                eventId: (document.event as { _ref?: string } | undefined)
                  ?._ref,
              },
            }),
          },
        }),
      ],
      description:
        "Optional: split this slot into multiple presentations. Ordered by drag-and-drop.",
    }),
    defineField({
      name: "abstract",
      title: "Abstract",
      type: "array",
      of: [{ type: "block" }],
    }),
  ],
  preview: {
    select: {
      title: "title",
      track: "track.label",
      start: "start",
    },
    prepare({ title, track, start }) {
      return {
        title: title || "TBD",
        subtitle: `${track ?? "No track"} - ${start || "時間未定"}`,
      };
    },
  },
});
