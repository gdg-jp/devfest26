import { defineType, defineField, defineArrayMember } from "sanity";

export const event = defineType({
  name: "event",
  title: "Event (Tenant)",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      description:
        "サブタイトル（副題）。設定した場合、ヒーローセクションでタイトルの下に改行して表示されます。",
    }),
    defineField({
      name: "titleEn",
      title: "Title (English)",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subtitleEn",
      title: "Subtitle (English)",
      type: "string",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "isPublic",
      title: "Public",
      type: "boolean",
      initialValue: true,
      description:
        "サイトへの公開・非公開を切り替えます。オフにするとサイトや開催地一覧に表示されません。",
    }),
    defineField({
      name: "lang",
      title: "Language",
      type: "string",
      initialValue: "ja",
      description: "<html lang>。日本語なら ja。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "locale",
      title: "Locale",
      type: "string",
      initialValue: "ja_JP",
      description: "og:locale。日本語なら ja_JP。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "theme",
      title: "Theme",
      type: "string",
      options: {
        list: [
          { title: "Blue", value: "blue" },
          { title: "Green", value: "green" },
          { title: "Yellow", value: "yellow" },
          { title: "Red", value: "red" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "taglineLead",
      title: "Tagline Lead",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "taglineAccent",
      title: "Tagline Accent",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "startsAt",
      title: "Starts At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endsAt",
      title: "Ends At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "socialLabel",
      title: "Social Label",
      type: "string",
    }),
    defineField({
      name: "socialStart",
      title: "Social Start",
      type: "string",
    }),
    defineField({
      name: "socialEnd",
      title: "Social End",
      type: "string",
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "object",
      fields: [
        defineField({
          name: "name",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "area",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "cityEn",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "city",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "region",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({ name: "addressLocality", type: "string" }),
        defineField({ name: "addressRegion", type: "string" }),
        defineField({ name: "streetAddress", type: "string" }),
        defineField({ name: "postalCode", type: "string" }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "format",
      title: "Format",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "formatShort",
      title: "Format (Short)",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "fee",
      title: "Fee",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "host",
      title: "Host",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "coHosts",
      title: "Co-Hosts",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "stats",
      title: "Stats",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "value",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "tone",
              type: "string",
              options: {
                list: [
                  { title: "Blue", value: "blue" },
                  { title: "Green", value: "green" },
                  { title: "Yellow", value: "yellow" },
                  { title: "Red", value: "red" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.min(4).max(4),
    }),
    defineField({
      name: "links",
      title: "Links",
      type: "object",
      fields: [
        defineField({
          name: "register",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "community",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "connpass",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "cocJa",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "cocEn",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "nav",
      title: "Nav",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "href",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "footerNav",
      title: "Footer Nav",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "href",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "fixtures",
      title: "Fixtures",
      description:
        "タイムテーブルのうち、セッション以外の行。受付・休憩・写真撮影・懇親会など。" +
        "セッションは自分の開始時刻から自動で並ぶので、ここには書きません。",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "start",
              title: "Start",
              type: "string",
              description: '"13:00" の形式。',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "end",
              title: "End",
              type: "string",
              description:
                '"13:45" の形式。セッションと違い必須：前のセッションがここで終わる。',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: "note", title: "Note", type: "string" }),
            defineField({
              name: "tracks",
              title: "Tracks",
              type: "array",
              description:
                "空なら全トラック。休憩の開始がトラックで違う場合は、時刻ごとに 2 行に分けてそれぞれのトラックを選びます。",
              of: [
                defineArrayMember({
                  type: "reference",
                  to: [{ type: "track" }],
                  // Only this city's own tracks, the same way a session's
                  // track field is filtered. A document being edited has a
                  // `drafts.` prefix on its id while its tracks point at the
                  // published one, so the prefix comes off — otherwise the
                  // list is empty exactly while somebody is editing.
                  options: {
                    filter: ({ document }) => ({
                      filter: "event._ref == $eventId",
                      params: {
                        eventId: document._id.replace(/^drafts\./, ""),
                      },
                    }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { label: "label", start: "start", end: "end" },
            prepare({ label, start, end }) {
              return { title: label, subtitle: `${start} - ${end}` };
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "slug.current",
      isPublic: "isPublic",
    },
    prepare({ title, subtitle, isPublic }) {
      return {
        title,
        subtitle: `${subtitle || ""}${isPublic === false ? " (非公開)" : ""}`,
      };
    },
  },
});
