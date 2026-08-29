/**
 * The cities that exist as checked-in TypeScript configs, for builds with no
 * CMS behind them.
 *
 * With Sanity on, the list of cities is not knowable statically — it is
 * whatever `event` documents the Studio holds, discovered at build time by
 * `src/tenants/discovery.ts`. These ids are the Markdown fallback and nothing
 * more.
 *
 * Kept in its own module with no dependencies so that `astro.config.ts`,
 * `src/content.config.ts` and the CI scripts can read it without pulling in
 * the tenant configs themselves.
 */

export const LOCAL_TENANT_IDS = ["kansai", "tokyo"] as const;

export type LocalTenantId = (typeof LOCAL_TENANT_IDS)[number];

/**
 * A city slug. Not a union: with Sanity on, a slug is whatever an organiser
 * typed into the Studio, so nothing can check it at compile time. What checks
 * it is discovery — an unknown slug fails the build there.
 */
export type TenantId = string;

export const DEFAULT_TENANT: LocalTenantId = "kansai";

/** `portal` is the root page, so no city may claim it as a path segment. */
export const PORTAL_TARGET = "portal";
