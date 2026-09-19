import {
  defineType,
  defineField,
  defineArrayMember,
  getPublishedId,
} from "sanity";
import { pickI18n } from "../lib/i18nPreview";

/**
 * Only what belongs to the city this session is attached to, for the reference
 * fields that offer the city's own documents: a Kansai session cannot land on
 * a Tokyo track.
 *
 * The city is looked up in the dataset, through the session's own `_id`,
 * rather than read off the `document` handed to this callback. Studio binds
 * that document once, when the reference field mounts, and never rebinds it —
 * so on a session created before a city was picked it stays empty for as long
 * as the pane is open, and the field kept searching for a `$eventId` that was
 * never sent. A parameter with no value is dropped on the way to the search
 * API, which then rejects a query that mentions it, and the field read
 * "Invalid reference filter" until the page was reloaded. `_id` is the one
 * part of the document that cannot go stale, and the search already runs under
 * the drafts perspective, so the lookup sees the draft's city as soon as it is
 * saved.
 *
 * The `coalesce` covers the moment before that. A session created from a
 * city's list has its `event` filled in by a template (see
 * `sanity.config.ts`) and is not in the dataset yet, and the document as it
 * was at mount is then the only place that city exists.
 */
const sameCity = (document: { _id: string; event?: unknown }) => ({
  filter:
    "defined(event._ref) && " +
    "event._ref == coalesce(*[_id == $docId][0].event._ref, $eventId)",
  params: {
    docId: getPublishedId(document._id),
    eventId: (document.event as { _ref?: string } | undefined)?._ref ?? null,
  },
});

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
      // The dropdown offers only this city's tracks. Pick the event first and
      // the list fills itself in — see `sameCity`.
      options: {
        filter: ({ document }) => sameCity(document),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL: /sessions/<slug>.",
      options: {
        source: (doc) => pickI18n(doc.title) ?? "",
        maxLength: 96,
      },
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
          // This city's talks only, the same way the track field is filtered.
          options: {
            filter: ({ document }) => sameCity(document),
          },
        }),
      ],
      validation: (Rule) => Rule.unique(),
      description:
        "Optional: split this slot into multiple presentations. Ordered by drag-and-drop.",
    }),
    defineField({
      name: "abstract",
      title: "Abstract",
      type: "internationalizedArrayRichText",
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
        title: pickI18n(title) || "TBD",
        subtitle: `${pickI18n(track) ?? "No track"} - ${start || "時間未定"}`,
      };
    },
  },
});
