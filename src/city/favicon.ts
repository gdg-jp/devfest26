import type { APIRoute } from "astro";
import { faviconSvg } from "../lib/favicon";
import { buildableCities } from "../tenants";
import type { Theme } from "../data/themes";

/**
 * Served at /<city>/favicon.svg, in that city's theme colour.
 *
 * Generated rather than shipped as a file because `public/` is shared by every
 * city — there is one `/favicon.svg` and four possible colours for it. The
 * root one belongs to the front page; see `src/pages/favicon.svg.ts`.
 */
export async function getStaticPaths() {
  const cities = await buildableCities();
  return cities.map(({ slug, site }) => ({
    params: { tenant: slug },
    props: { theme: site.theme },
  }));
}

export const GET: APIRoute<{ theme: Theme }> = ({ props }) =>
  new Response(faviconSvg(props.theme), {
    headers: { "Content-Type": "image/svg+xml" },
  });
