/**
 * Whether this build is the portal — the root page listing every city's event
 * — rather than one city's site.
 *
 * The counterpart to `src/tenants/active.ts`, and kept just as dependency-free
 * so `astro.config.ts` can read it before anything else loads. Set `PORTAL` in
 * the build environment:
 *
 *     PORTAL=1 pnpm exec astro build
 *
 * The three builds are assembled into one site at deploy time — the portal at
 * the root, each city under its own path. See `.github/workflows/build.yml`.
 */
export const isPortal = Boolean(process.env.PORTAL?.trim());
