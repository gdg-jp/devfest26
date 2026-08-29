import type { LocalTenantId } from "./ids";
import { kansai } from "./kansai";
import { tokyo } from "./tokyo";
import type { TenantConfig } from "./types";

/**
 * Every city that exists as a checked-in config, keyed by slug.
 *
 * The Markdown fallback, and only that: with Sanity on, cities come from the
 * CMS and nothing here is read. See `src/tenants/discovery.ts`.
 */
export const registry: Record<LocalTenantId, TenantConfig> = { kansai, tokyo };
