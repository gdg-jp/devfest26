import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The pages under `src/routes/`, read off the file tree the way Astro reads
 * `src/pages/`.
 *
 * The rules are Astro's own, so nobody has to learn them twice: a file is a
 * page and its path is its URL, `index` names the directory it sits in, a
 * `[bracketed]` segment is a parameter, and anything whose name starts with
 * `_` is not a page at all — a component, a stylesheet, a helper kept beside
 * the page that uses it.
 *
 * The one addition is what the top level means:
 *
 *     src/routes/index.astro      → /               the front page
 *     src/routes/[tenant]/…       → /<any city>/…   shared by every city
 *     src/routes/kansai/…         → /kansai/…       Kansai's own, optional
 *
 * A city's own directory answers ahead of `[tenant]` for any path both have —
 * the same rule by which `src/pages/about.astro` beats `src/pages/[slug].astro`
 * — and adds whatever `[tenant]` does not have. Its `_style.css`, if there is
 * one, is loaded on every page of that city, shared or its own.
 *
 * Why these are injected rather than filed under `src/pages/` is explained in
 * `astro.config.ts`. This module only reads the tree; which parts of it a build
 * takes in is decided there.
 */

/** Relative to the project root. */
const ROUTES = "src/routes";

/** What Astro accepts as a page or an endpoint. */
const PAGE = /\.(astro|ts|js)$/;

/** The shape of a city slug, as `src/tenants/discovery.ts` holds it. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The shared directory, whose parameter every city fills in. */
const SHARED = "[tenant]";

/** A city's stylesheet, loaded on every page of that city. */
const STYLESHEET = "_style.css";

export interface RouteFile {
  /** `/[tenant]/sessions/[slug]`, before any language prefix. */
  pattern: string;
  /** `./src/routes/[tenant]/sessions/[slug].astro`, as `injectRoute` wants. */
  entrypoint: string;
}

export interface CityDirectory {
  routes: RouteFile[];
  /** `/src/routes/kansai/_style.css`, importable from a page script. */
  stylesheet?: string;
  /** Every stylesheet and component in the directory, pages or not. */
  styled: string[];
}

export interface RouteTable {
  /** The front page, and anything else at the top level. */
  portal: RouteFile[];
  /** `[tenant]/`, every city's pages. */
  shared: RouteFile[];
  /** Each city's own directory, by slug. */
  cities: Map<string, CityDirectory>;
}

/** Every file under `dir`, as `/`-separated paths relative to `root`. */
function walk(root: string, dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      return entry.isDirectory() ? walk(root, path) : [path];
    })
    .sort();
}

/** `src/routes/[tenant]/sessions/[slug].astro` → `["[tenant]", "sessions", "[slug].astro"]` */
const segmentsOf = (file: string) => file.slice(ROUTES.length + 1).split("/");

/**
 * The pages among `files`.
 *
 * Anything else that is not marked private is a mistake — most likely a
 * component that was meant to sit beside a page — and would otherwise go
 * unnoticed, never becoming a page and never being told why.
 */
function pagesOf(files: string[]): RouteFile[] {
  const pages = files.filter(
    (file) => !segmentsOf(file).some((segment) => segment.startsWith("_")),
  );

  return pages.map((file) => {
    if (!PAGE.test(file)) {
      throw new Error(
        `${file} is not a page. Only .astro, .ts and .js files under ` +
          `${ROUTES}/ become pages; give anything else a name that starts ` +
          `with "_", as Astro does in src/pages/.`,
      );
    }

    const segments = segmentsOf(file.replace(PAGE, ""));
    if (segments.at(-1) === "index") segments.pop();
    return { pattern: `/${segments.join("/")}`, entrypoint: `./${file}` };
  });
}

/** Reads `src/routes/` under the project root. */
export function routeTable(root: string): RouteTable {
  const files = walk(root, ROUTES);
  const under = (dir: string) =>
    files.filter(
      (file) => segmentsOf(file)[0] === dir && segmentsOf(file).length > 1,
    );

  const cities = new Map<string, CityDirectory>();
  const dirs = new Set(
    files
      .map(segmentsOf)
      .filter((segments) => segments.length > 1)
      .map(([first]) => first),
  );

  for (const slug of dirs) {
    if (slug === SHARED || slug.startsWith("_")) continue;

    if (!SLUG.test(slug)) {
      throw new Error(
        `${ROUTES}/${slug}/ is not a city. A directory at the top of ` +
          `${ROUTES}/ is either ${SHARED}/, shared by every city, or one ` +
          `city's slug exactly as Sanity has it — lowercase letters, digits ` +
          `and hyphens.`,
      );
    }

    const own = under(slug);
    const stylesheet = own.find(
      (file) => file === `${ROUTES}/${slug}/${STYLESHEET}`,
    );

    cities.set(slug, {
      routes: pagesOf(own),
      stylesheet: stylesheet && `/${stylesheet}`,
      styled: own.filter((file) => /\.(css|astro)$/.test(file)),
    });
  }

  return {
    portal: pagesOf(files.filter((file) => segmentsOf(file).length === 1)),
    shared: pagesOf(under(SHARED)),
    cities,
  };
}
