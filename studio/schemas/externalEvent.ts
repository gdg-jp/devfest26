import { defineType, defineField } from "sanity";

/**
 * A DevFest the front page links to but this codebase does not build: another
 * chapter's event, a past edition, anything whose page lives somewhere else.
 *
 * The only type here with no `event` reference. It belongs to no city — it is
 * a row on the front page, and the front page is about all of them.
 */
export const externalEvent = defineType({
  name: "externalEvent",
  title: "External Event",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "カードの見出し。例: DevFest 2025 in Kansai",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      description:
        "一覧の中で重複しない識別子。都市の slug（kansai など）とも重複させないでください。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "region",
      title: "Region",
      type: "string",
      description: "日付の横に出る地域名。例: 関西 / 東京 / 福岡",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "startsAt",
      title: "Starts At",
      type: "datetime",
      description: "並び順もこれで決まります。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endsAt",
      title: "Ends At",
      type: "datetime",
      description: "2 日以上にわたる場合のみ。単日なら空のままで構いません。",
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
      description: "例: 大阪",
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "string",
      description: "会場名。未定なら空のままで構いません。",
    }),
    defineField({
      name: "theme",
      title: "Theme",
      type: "string",
      description: "カード左端のアクセント。DevFest のコア 4 色から選びます。",
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
      name: "url",
      title: "URL",
      type: "url",
      description:
        "カードのリンク先。このイベントのページはこのサイトには無いので、必須です。",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "text",
      rows: 2,
      description: "会場の下に 1 行。他の項目で表せないことがあれば。",
    }),
  ],

  orderings: [
    {
      name: "startsAtDesc",
      title: "開催日（新しい順）",
      by: [{ field: "startsAt", direction: "desc" }],
    },
  ],

  preview: {
    select: { title: "title", subtitle: "region", date: "startsAt" },
    prepare: ({ title, subtitle, date }) => ({
      title,
      subtitle: [subtitle, date?.slice(0, 10)].filter(Boolean).join(" ／ "),
    }),
  },
});
