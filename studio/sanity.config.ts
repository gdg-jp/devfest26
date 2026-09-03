import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemas";
import { structure } from "./structure";
import { CITY_SCOPED_TYPES } from "./structure";
import { locations, mainDocuments } from "./presentation";
import { withConfirm } from "./actions/confirmPublish";

/**
 * Where the draft preview is, if this build of the Studio is meant to drive
 * one.
 *
 * Two builds come out of this directory. `sanity deploy` puts one on
 * `devfest26.sanity.studio`, which is for writing; the preview Worker serves a
 * second at `/studio` on its own origin, which is for writing *while watching*
 * — see `.github/workflows/preview.yml`. Only the second gets Presentation,
 * and that is why this is a variable rather than a constant: Presentation
 * shows the preview in an iframe, the preview is behind a session cookie, and
 * a cookie set by the Worker's origin is not sent by a frame embedded in
 * `sanity.studio`. The tab would be there and it would never load. Absent is a
 * better answer than broken.
 */
const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_ORIGIN?.trim();

export default defineConfig({
  name: "default",
  title: "DevFest 2026",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID as string,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",

  plugins: [
    structureTool({ structure }),
    ...(previewOrigin
      ? [
          presentationTool({
            title: "プレビュー",
            previewUrl: { initial: previewOrigin },
            /*
              Needed only when the two are not the same origin, which is the
              local arrangement: `sanity dev` on :3333 driving `pnpm
              preview:dev` on :4321. The deployed pair share an origin and this
              matches it anyway.
            */
            allowOrigins: [previewOrigin],
            /*
              No `previewMode`. That option exists to switch a site into
              reading drafts for the length of a session; this Worker has no
              other mode — it reads drafts on every request, for everyone it
              lets in — so there is nothing to enable.
            */
            resolve: { locations, mainDocuments },
          }),
        ]
      : []),
    visionTool(),
  ],

  document: {
    /**
     * A confirmation step in front of Publish. See `actions/confirmPublish.ts`
     * for why the button needs one.
     *
     * Matching on `action` rather than on position: the array order is not
     * contractual, and a plugin adding an action would silently wrap the wrong
     * one.
     */
    actions: (prev) =>
      prev.map((action) =>
        action.action === "publish" ? withConfirm(action) : action,
      ),
  },

  schema: {
    types: schemaTypes,

    /**
     * Creating a document from inside a city's list pre-fills its `event`
     * reference. Without this the single most likely mistake in the whole
     * Studio — saving a session with no city attached — produces content that
     * silently appears on no site at all.
     */
    templates: (prev) => [
      ...prev,
      ...CITY_SCOPED_TYPES.map((schemaType) => ({
        id: `${schemaType}-by-event`,
        title: `${schemaType} (city pre-filled)`,
        schemaType,
        parameters: [{ name: "eventId", type: "string" }],
        value: ({ eventId }: { eventId: string }) => ({
          event: { _type: "reference", _ref: eventId },
        }),
      })),
    ],
  },
});
