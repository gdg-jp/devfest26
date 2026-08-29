import type { APIRoute } from "astro";
import { faviconSvg } from "../lib/favicon";
import { site } from "../data/site";
import { isPortal } from "../portal/active";

/**
 * Served at /favicon.svg. An endpoint rather than a file in public/, because
 * public/ is shared by every tenant and the icon has to follow this city's
 * theme. The portal is not a city, so it takes the DevFest primary.
 */
export const GET: APIRoute = () =>
  new Response(faviconSvg(isPortal ? "blue" : site.theme), {
    headers: { "Content-Type": "image/svg+xml" },
  });
