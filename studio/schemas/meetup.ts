import { defineType, defineField, defineArrayMember } from 'sanity';

export const meetup = defineType({
  name: 'meetup',
  title: 'Meetup',
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
      name: 'no',
      title: 'No.',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Closed', value: 'closed' },
          { title: 'Done', value: 'done' },
          { title: 'Planned', value: 'planned' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
    }),
    defineField({
      name: 'doorsAt',
      title: 'Doors At',
      type: 'string',
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts At',
      type: 'string',
    }),
    defineField({
      name: 'endsAt',
      title: 'Ends At',
      type: 'string',
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
    }),
    defineField({
      name: 'capacity',
      title: 'Capacity',
      type: 'string',
    }),
    defineField({
      name: 'fee',
      title: 'Fee',
      type: 'string',
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
    }),
    defineField({
      name: 'cta',
      title: 'CTA',
      type: 'string',
    }),
    defineField({
      name: 'program',
      title: 'Program',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'at', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'what', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'who', type: 'string' }),
            defineField({
              name: 'talk',
              type: 'boolean',
              title: 'LT',
              description: 'オンにした行が「LT n 本」の n に数えられます。',
            }),
            defineField({
              name: 'break',
              type: 'boolean',
              title: '休憩・間の時間',
              description: 'オンにするとその行が控えめに表示されます。',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      no: 'no',
    },
    prepare({ title, no }) {
      return {
        title: title,
        subtitle: `Meetup #${no}`,
      };
    },
  },
});
