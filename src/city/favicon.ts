import type { APIRoute } from "astro";
import { faviconSvg } from "../lib/favicon";
import { buildableCities } from "../tenants";
import { themeProps } from "./params";
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

export const GET: APIRoute<{ theme: Theme }> = async ({ params, props }) => {
  // Static builds carry the theme in as a prop; on demand there is only the
  // path. See `src/city/params.ts`.
  const theme = props.theme ?? (await themeProps(params))?.theme;
  if (!theme) return new Response(null, { status: 404 });

  return new Response(faviconSvg(theme), {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
