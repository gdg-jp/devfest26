import type { APIRoute } from "astro";
import { faviconSvg } from "../lib/favicon";

/**
 * Served at /favicon.svg — the front page's icon.
 *
 * The front page is not a city, so it takes the DevFest primary. Each city has
 * one of its own at `/<city>/favicon.svg`, generated in that city's theme
 * colour; an endpoint rather than a file in `public/`, because `public/` is
 * shared by every city and there is only one root path to put a file at.
 */
export const GET: APIRoute = () =>
  new Response(faviconSvg("blue"), {
    headers: { "Content-Type": "image/svg+xml" },
  });
