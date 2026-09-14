import { defineType, defineField, defineArrayMember } from "sanity";
import { pickI18n } from "../lib/i18nPreview";

export const event = defineType({
  name: "event",
  title: "Event (Tenant)",
  type: "document",
  fields: [
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
      description:
        "サブタイトル（副題）。設定した場合、ヒーローセクションでタイトルの下に改行して表示されます。",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      // `title` is now an array, so the slugify source has to read the
      // Japanese value out of it directly.
      options: {
        source: (doc) => pickI18n(doc.title) ?? "",
      },
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
      name: "description",
      title: "Description",
      type: "internationalizedArrayText",
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
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "taglineAccent",
      title: "Tagline Accent",
      type: "internationalizedArrayString",
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
      type: "internationalizedArrayString",
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
          type: "internationalizedArrayString",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "area",
          type: "internationalizedArrayString",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "cityEn",
          title: "City (English, full form)",
          type: "string",
          description:
            '"Osaka, Japan" — the OG card / Hero label. Not a translation of ' +
            '"City" below: that one is the short place name used mid-sentence ' +
            '("held in Osaka on..."), this is the fuller form used for a ' +
            "standalone lockup. Shared across languages; edit it once here.",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "city",
          title: "City",
          type: "internationalizedArrayString",
          description: "大阪 — the short place name, used mid-sentence.",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "region",
          type: "internationalizedArrayString",
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
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "formatShort",
      title: "Format (Short)",
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "fee",
      title: "Fee",
      type: "internationalizedArrayString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "host",
      title: "Host",
      type: "string",
      description: "組織名。言語をまたいで同じ表記を使うので翻訳しません。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "coHosts",
      title: "Co-Hosts",
      type: "string",
      description: "組織名。言語をまたいで同じ表記を使うので翻訳しません。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "stats",
      title: "Stats",
      description:
        "ラベルは Tracks / Sessions のように、言語を問わず英語のまま表示します。",
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
        /*
          The only link on the site that differs by language rather than being
          translated: a Japanese reader is sent to connpass and an English one
          to Luma, because those are different audiences on different platforms
          rather than two renderings of one page. Localizing the URL itself is
          what says that — the projection coalesces to the Japanese value, so a
          city with no Luma listing sends everyone to connpass instead of to a
          link that does not exist.
        */
        defineField({
          name: "register",
          type: "internationalizedArrayUrl",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "community",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
        /*
          The chapter's own pages, in the footer. Both are shown side by side
          when both exist, rather than one standing in for the other: this is a
          list of where the chapter can be found, and a reader of either
          language may want either. `luma` is optional because a chapter that
          only uses connpass is the normal case.
        */
        defineField({
          name: "connpass",
          type: "url",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "luma",
          type: "url",
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
              type: "internationalizedArrayString",
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
              type: "internationalizedArrayString",
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
              type: "internationalizedArrayString",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "note",
              title: "Note",
              type: "internationalizedArrayString",
            }),
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
              return {
                title: pickI18n(label) ?? "(no label)",
                subtitle: `${start} - ${end}`,
              };
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
        title: pickI18n(title) ?? "(no title)",
        subtitle: `${subtitle || ""}${isPublic === false ? " (非公開)" : ""}`,
      };
    },
  },
});
