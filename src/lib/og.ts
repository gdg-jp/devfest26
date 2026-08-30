import { previewMode } from "../preview/mode";

/**
 * Whether this city has an Open Graph card in `public/og/`.
 *
 * A city gets its card the moment its `event` document is published, which is
 * before anyone has run `pnpm og` for it. Checking rather than assuming means a
 * new city ships without an `og:image` instead of with a URL that 404s in every
 * preview that follows the link.
 *
 * `public/og/` is shared by every city and served from the site root, so the
 * URL is the same in a one-city build as in a full one; only the answer to
 * "is it there" differs.
 *
 * The path is resolved from the working directory rather than from
 * `import.meta.url`, and that is the whole reason this is a module of its own.
 * A build bundles this code into a chunk under `dist/<target>/.prerender/`, so
 * a URL relative to the module resolves to `dist/<target>/public/og/…` — which
 * never exists, and so quietly suppressed the tag in every build while working
 * perfectly in `astro dev`. `astro build` runs from the project root.
 *
 * Asynchronous because of where the check has to happen. In a build there is a
 * filesystem and the file either exists or does not. In the draft preview the
 * page is rendered inside a Cloudflare Worker, where `public/` is an asset
 * store rather than a directory — so there is nothing to stat, and the answer
 * is yes: the preview is `noindex` and private, nothing will ever unfurl one of
 * its links, and a tag pointing at an asset that may or may not be there costs
 * nothing. The dynamic import is what keeps `node:fs` out of the Worker bundle,
 * since `previewMode` is substituted at build time and takes the rest of this
 * function with it.
 */
export async function hasOgCard(tenant: string): Promise<boolean> {
  if (previewMode) return true;

  const [{ existsSync }, { join }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);

  return existsSync(join(process.cwd(), "public", "og", `${tenant}.png`));
}
