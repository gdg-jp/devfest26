import { defineType, defineField } from "sanity";
import { RocketIcon } from "@sanity/icons/Rocket";

/**
 * The one document that starts a build.
 *
 * Nothing else in this dataset does. Sanity's webhook is filtered to
 * `_type == "deploy"`, so publishing a session changes what the API answers
 * and leaves the site alone; the site changes when「サイトに反映」writes here.
 * Two things follow from that, and both are the point:
 *
 * - **One click is one build.** Sanity's webhooks fire per *document*, so
 *   publishing twelve drafts in one transaction would be twelve builds if the
 *   webhook watched content. This document is rewritten once per click.
 * - **Publishing and deploying are separate decisions.** An organiser can
 *   publish an afternoon's worth of edits and put them on the site when they
 *   are ready, rather than the moment each one is saved.
 *
 * A singleton at a fixed id, because the webhook's job is to notice that *it*
 * changed. See the root README under 公開フロー for the webhook itself.
 *
 * Registered here rather than left unschema'd so the fields have names and the
 * history is readable, and `readOnly` so it is written by the tool and not by
 * hand — an `event` document edited by hand is a mistake, this one edited by
 * hand is a deploy nobody asked for.
 */
export const DEPLOY_ID = "siteDeploy";

export const deploy = defineType({
  name: "deploy",
  title: "サイトへの反映",
  type: "document",
  icon: RocketIcon,
  readOnly: true,
  fields: [
    defineField({
      name: "requestedAt",
      title: "Requested At",
      type: "datetime",
      description:
        "最後に「サイトに反映」が押された時刻。webhook が見ているのはこの書き換えそのものです。",
    }),
    defineField({
      name: "requestedBy",
      title: "Requested By",
      type: "string",
      description:
        "押した人。データセットは公開なので、この名前も公開情報になります。",
    }),
    defineField({
      name: "targets",
      title: "Targets",
      type: "array",
      of: [{ type: "string" }],
      description:
        "作り直す開催地の slug。空なら全部という意味で、トップページは常に一緒に作り直されます。",
    }),
    defineField({
      name: "history",
      title: "History",
      type: "array",
      description:
        "開催地ごとの、最後に反映を押した時刻。「未反映 3 件」はこれと公開済みドキュメントの _updatedAt を比べて数えています。",
      of: [
        defineField({
          name: "record",
          type: "object",
          fields: [
            defineField({ name: "slug", title: "Slug", type: "string" }),
            defineField({ name: "at", title: "At", type: "datetime" }),
          ],
          preview: {
            select: { title: "slug", subtitle: "at" },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "requestedBy", subtitle: "requestedAt" },
  },
});
