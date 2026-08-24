/**
 * Every city this codebase can build.
 *
 * Kept in its own module with no dependencies so that `astro.config.mjs` and
 * `src/content.config.ts` can validate the requested tenant without pulling in
 * the tenant configs themselves.
 */

export const TENANT_IDS = ["kansai", "tokyo"] as const;

export type TenantId = (typeof TENANT_IDS)[number];

export const DEFAULT_TENANT: TenantId = "kansai";
