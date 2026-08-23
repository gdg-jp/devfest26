import { defineType, defineField, defineArrayMember } from 'sanity';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    defineField({
      name: 'event',
      title: 'Event',
      type: 'reference',
      to: [{ type: 'event' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lead',
      title: 'Lead',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'callout',
      title: 'Callout',
      type: 'string',
    }),
    defineField({
      name: 'audienceEyebrow',
      title: 'Audience Eyebrow',
      type: 'string',
    }),
    defineField({
      name: 'audienceHeading',
      title: 'Audience Heading',
      type: 'string',
    }),
    defineField({
      name: 'audienceItems',
      title: 'Audience Items',
      description: '**強調**で該当部分をハイライトできます。',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      // Optional as a whole, but an empty list would render an empty panel.
      validation: (Rule) => Rule.min(1),
    }),
  ],
});
