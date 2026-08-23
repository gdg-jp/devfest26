import type { APIRoute } from 'astro';
import { faviconSvg } from '../lib/favicon';
import { site } from '../data/site';

/**
 * Served at /favicon.svg. An endpoint rather than a file in public/, because
 * public/ is shared by every tenant and the icon has to follow this city's
 * theme.
 */
export const GET: APIRoute = () =>
  new Response(faviconSvg(site.theme), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
