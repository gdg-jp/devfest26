import type { TenantId } from "./ids";
import { kansai } from "./kansai";
import { tokyo } from "./tokyo";
import type { TenantConfig } from "./types";

/**
 * Every city's config, keyed by slug.
 *
 * Separate from `index.ts` because that module resolves exactly one city and
 * does it behind a top-level await. The portal needs all of them and must not
 * wait on a CMS read to get them.
 */
export const registry: Record<TenantId, TenantConfig> = { kansai, tokyo };
