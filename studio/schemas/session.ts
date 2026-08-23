import { defineType, defineField, defineArrayMember } from 'sanity';

export const session = defineType({
  name: 'session',
  title: 'Session',
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
      name: 'track',
      title: 'Track',
      type: 'string',
      options: {
        list: [
          { title: 'Track A', value: 'a' },
          { title: 'Track B', value: 'b' },
          { title: 'Track C', value: 'c' },
          { title: 'Unscheduled', value: 'unscheduled' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'speakers',
      title: 'Speakers',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'speaker' }] })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'abstract',
      title: 'Abstract',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      track: 'track',
      order: 'order',
    },
    prepare({ title, track, order }) {
      return {
        title: title || 'TBD',
        subtitle: `${track} - ${order}`,
      };
    },
  },
});
