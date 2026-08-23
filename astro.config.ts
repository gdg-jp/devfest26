import { defineConfig } from 'astro/config';
import { activeTenant } from './src/tenants/active';

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
  // One directory per city, so building a second tenant locally does not
  // silently overwrite the first one's output.
  outDir: `./dist/${activeTenant}`,
  // The content store is persistent and keyed by collection name, not by
  // tenant, so a shared cache carries the previous city's entries into this
  // build. Give each city its own — without this, `pnpm build:all` produces a
  // second site contaminated with the first one's sessions and speakers.
  cacheDir: `./node_modules/.astro/${activeTenant}`,
  build: {
    // The OG card is screenshotted straight off disk, where a `/_astro/...`
    // stylesheet href resolves to nothing. Inlining makes that build
    // self-contained; normal builds keep the default split.
    inlineStylesheets: process.env.OG_PREVIEW ? 'always' : 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
