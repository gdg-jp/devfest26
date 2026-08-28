import { defineType, defineField } from "sanity";

/**
 * One photo set per city.
 *
 * Deliberately not a gallery: these photos are surfaces, not a section. The
 * backdrops print into the city's colour behind the countdown and the closing
 * call to action, and the props sit in the page's decorative gutter, which is
 * hidden below 1500px. Everything is optional — a city without photos renders
 * none of it.
 */
export const photoSet = defineType({
  name: "photoSet",
  title: "Photos",
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
      name: "registerBackdrop",
      title: "Register backdrop",
      type: "image",
      options: { hotspot: true },
      description:
        "Behind the closing call to action, printed into the city's colour. Wants a wide shot of the room. It only ever darkens the colour, so the copy on top stays legible whatever the photo does — but keep the middle calm anyway, because that is where the copy sits.",
    }),
    defineField({
      name: "registerBackdropCredit",
      title: "Register backdrop credit",
      type: "string",
      description:
        "Photographer, printed once in the footer. Decorative use does not waive the credit.",
    }),
    defineField({
      name: "countdownBackdrop",
      title: "Countdown backdrop",
      type: "image",
      options: { hotspot: true },
      description:
        "Behind the countdown band, which is a wide strip: only the middle quarter of the photo survives the crop, so put the subject there. The digits sit on opaque cards, so a busy photo costs nothing — a group shot works well.",
    }),
    defineField({
      name: "countdownBackdropCredit",
      title: "Countdown backdrop credit",
      type: "string",
      description: "Photographer, printed once in the footer.",
    }),
    defineField({
      name: "props",
      title: "Gutter props",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      validation: (Rule) => Rule.max(4),
      description:
        "Small square photos tucked into the page margins, tilted like the drawn stickers. Wants a dense subject that still reads at 160px — hands, badges, merch, drinks. Order matters: each section claims a fixed position in this list, so add to the end rather than reordering.",
    }),
  ],
  preview: {
    select: {
      event: "event.title",
      media: "registerBackdrop",
    },
    prepare: ({ event, media }) => ({
      title: "Photos",
      subtitle: event,
      media,
    }),
  },
});
