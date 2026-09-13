import { defineType, defineField } from "sanity";
import { pickI18n } from "../lib/i18nPreview";

export const speaker = defineType({
  name: "speaker",
  title: "Speaker",
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
      name: "name",
      title: "Name",
      description:
        "漢字表記とローマ字表記が違う場合に備え、言語ごとに入力できます。",
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "The URL: /speakers/<slug>.",
      options: {
        source: (doc) =>
          pickI18n(
            doc.name as { language: string; value: string }[] | undefined,
          ) ?? "",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: {
        hotspot: true,
      },
      description:
        "The hotspot sets the focal point for the circular avatar crop.",
    }),
    defineField({
      name: "initial",
      title: "Initial",
      type: "string",
      validation: (Rule) => Rule.max(2),
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "internationalizedArrayRichText",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "role",
      media: "photo",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: pickI18n(title) ?? "(no name)",
        subtitle: pickI18n(subtitle),
        media,
      };
    },
  },
});
