import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';
import { CITY_SCOPED_TYPES } from './structure';

export default defineConfig({
  name: 'default',
  title: 'DevFest 2026',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID as string,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({ structure }),
    visionTool(),
  ],

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
        parameters: [{ name: 'eventId', type: 'string' }],
        value: ({ eventId }: { eventId: string }) => ({
          event: { _type: 'reference', _ref: eventId },
        }),
      })),
    ],
  },
});
