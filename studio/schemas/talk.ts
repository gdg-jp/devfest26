import { defineType, defineField, defineArrayMember } from "sanity";

/**
 * One presentation inside a session.
 *
 * A city only creates these if it runs several talks in one slot. Leave the
 * type unused and every session is a single talk in its own right, which is
 * how a one-talk-per-slot city reads.
 */
export const talk = defineType({
  name: "talk",
  title: "Talk",
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
      name: "title",
      title: "Title",
      type: "string",
      description: "Leave empty to inherit the session's title.",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL: /talks/<slug>.",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "start",
      title: "Start",
      type: "string",
      description: 'Wall clock on the day of the event, e.g. "13:20".',
    }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "speaker" }] })],
      validation: (Rule) => Rule.required().min(1),
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
      speaker0: "speakers.0.name",
      start: "start",
    },
    prepare({ title, speaker0, start }) {
      return {
        title: title || "TBD",
        subtitle: [speaker0, start].filter(Boolean).join(" - ") || "No speaker",
      };
    },
  },
});
