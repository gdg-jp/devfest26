import { defineType, defineField, defineArrayMember } from "sanity";
import { pickI18n } from "../lib/i18nPreview";

export const meetup = defineType({
  name: "meetup",
  title: "Meetup",
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
      name: "no",
      title: "No.",
      type: "number",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Open", value: "open" },
          { title: "Closed", value: "closed" },
          { title: "Done", value: "done" },
          { title: "Planned", value: "planned" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
    }),
    defineField({
      name: "doorsAt",
      title: "Doors At",
      type: "string",
    }),
    defineField({
      name: "startsAt",
      title: "Starts At",
      type: "string",
    }),
    defineField({
      name: "endsAt",
      title: "Ends At",
      type: "string",
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "capacity",
      title: "Capacity",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "fee",
      title: "Fee",
      type: "internationalizedArrayString",
    }),
    /*
      Localized for the same reason `event.links.register` is: a pre-event takes
      registrations too, and one listed on both connpass and Luma should send
      each reader to the listing written in their language. Left blank for
      English, both go to connpass.
    */
    defineField({
      name: "url",
      title: "URL",
      type: "internationalizedArrayUrl",
    }),
    defineField({
      name: "cta",
      title: "CTA",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "program",
      title: "Program",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "at",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "what",
              type: "internationalizedArrayString",
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: "who", type: "internationalizedArrayString" }),
            defineField({
              name: "talk",
              type: "boolean",
              title: "LT",
              description: "オンにした行が「LT n 本」の n に数えられます。",
            }),
            defineField({
              name: "break",
              type: "boolean",
              title: "休憩・間の時間",
              description: "オンにするとその行が控えめに表示されます。",
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "internationalizedArrayRichText",
    }),
  ],
  preview: {
    select: {
      title: "title",
      no: "no",
    },
    prepare({ title, no }) {
      return {
        title: pickI18n(title),
        subtitle: `Meetup #${no}`,
      };
    },
  },
});
