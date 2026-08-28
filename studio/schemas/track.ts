import { defineType, defineField } from "sanity";

/**
 * A track is a document rather than a row inside `event`, so that a session can
 * point at one by reference: the Track dropdown on a session is then generated
 * from what this city actually has, and adding Track D is a Studio action
 * rather than a code change.
 */
export const track = defineType({
  name: "track",
  title: "Track",
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
      name: "order",
      title: "Order",
      description: "並び順。小さいほど上に出ます。",
      type: "number",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "sub",
      title: "Sub",
      description: "ラベルの下に出る一行説明。",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "color",
      title: "Color",
      description: "見出しピルの塗り。CSS 値（例: var(--blue)）。",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "textColor",
      title: "Text Color",
      description: "白地の小さな文字に載せたときに読める色。",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "darkInk",
      title: "Dark Ink",
      description: "見出しの文字を黒にする（黄色など、白が読めない塗り向け）。",
      type: "boolean",
    }),
    defineField({
      name: "pending",
      title: "Pending",
      description:
        "まだ正式なトラックではない。破線で表示し、タイムテーブルのトラック数から除外します。",
      type: "boolean",
    }),
    defineField({
      name: "cardLabel",
      title: "Card Label",
      description:
        "各カードの上に、セッション番号の代わりに出す文字列（例: Unscheduled）。",
      type: "string",
    }),
  ],
  orderings: [
    {
      name: "order",
      title: "Order",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "label",
      subtitle: "sub",
    },
  },
});
