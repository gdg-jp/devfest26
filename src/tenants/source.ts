import { sanityEnabled } from "../lib/sanity/env";
import type { TenantConfig } from "./types";

/**
 * Kept apart from `index.ts` so that the Sanity client is only imported when it
 * is actually configured — a build with no CMS never loads it.
 */
export async function fromSanityIfEnabled(
  slug: string,
): Promise<TenantConfig | undefined> {
  if (!sanityEnabled) return undefined;

  const { tenantFromSanity } = await import("./fromSanity");
  return tenantFromSanity(slug);
}
