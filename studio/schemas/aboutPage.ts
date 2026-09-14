import { defineType, defineField } from "sanity";

export const aboutPage = defineType({
  name: "aboutPage",
  title: "About Page",
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
      name: "lead",
      title: "Lead",
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "internationalizedArrayRichText",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "callout",
      title: "Callout",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "audienceEyebrow",
      title: "Audience Eyebrow",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "audienceHeading",
      title: "Audience Heading",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "audienceItems",
      title: "Audience Items",
      description: "**強調**で該当部分をハイライトできます。",
      type: "internationalizedArrayStringList",
      // Optional as a whole, but a language whose list is empty would render
      // an empty panel. `Rule.min(1)` on the array itself would only say
      // "at least one language", which is a different thing.
      validation: (Rule) =>
        Rule.custom((items?: { language?: string; value?: string[] }[]) => {
          const empty = (items ?? [])
            .filter((item) => !item?.value?.length)
            .map((item) => item?.language ?? "?");

          return empty.length === 0
            ? true
            : `Give ${empty.join(", ")} at least one item, or remove the language entirely — an empty list renders an empty panel.`;
        }),
    }),
  ],
});
