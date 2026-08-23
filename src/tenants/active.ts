import { DEFAULT_TENANT, TENANT_IDS, type TenantId } from './ids';

/**
 * Which city this build is for. Set `TENANT` in the build environment:
 *
 *     TENANT=tokyo SITE_URL=https://... pnpm build
 *
 * An unknown value fails loudly rather than silently falling back — a typo in
 * a deploy pipeline would otherwise publish the wrong city's site.
 *
 * Build-time only: read from `process.env`, so nothing that imports this may be
 * pulled into a client bundle.
 */
function resolve(): TenantId {
  const requested = process.env.TENANT?.trim();
  if (!requested) return DEFAULT_TENANT;

  if (!(TENANT_IDS as readonly string[]).includes(requested)) {
    throw new Error(
      `Unknown TENANT "${requested}". Known tenants: ${TENANT_IDS.join(', ')}.`,
    );
  }

  return requested as TenantId;
}

export const activeTenant = resolve();
