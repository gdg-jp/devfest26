import { sanityEnabled } from "../lib/sanity/env";
import { previewMode } from "../preview/mode";
import type { TenantConfig } from "./types";

/**
 * Kept apart from `index.ts` so that the Sanity client is only imported when it
 * is actually configured — a build with no CMS never loads it.
 *
 * The preview takes its `event` document from the snapshot the rest of the page
 * is being rendered from, rather than fetching one of its own: a page that read
 * its city's name from one moment in the Studio and its sessions from another
 * would be showing something that never existed.
 */
export async function fromSanityIfEnabled(
  slug: string,
): Promise<TenantConfig | undefined> {
  if (!sanityEnabled()) return undefined;

  if (previewMode) {
    const { draftTenant } = await import("../preview/drafts");
    return draftTenant(slug);
  }

  const { tenantFromSanity } = await import("./fromSanity");
  return tenantFromSanity(slug);
}
