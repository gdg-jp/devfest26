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
      name: "order",
      title: "Order",
      type: "number",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
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
      track: "track.label",
      order: "order",
    },
    prepare({ title, track, order }) {
      return {
        title: title || "TBD",
        subtitle: `${track ?? "No track"} - ${order}`,
      };
    },
  },
});
