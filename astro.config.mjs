// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Absolute URLs (canonical, Open Graph, JSON-LD) need the production origin.
 * Set SITE_URL in the deploy environment; without it those tags are simply
 * omitted rather than pointing somewhere wrong.
 */
const site = process.env.SITE_URL;

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
