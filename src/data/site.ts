/**
 * The active city's configuration.
 *
 * This is a façade over `src/tenants/` so that components keep a single stable
 * import. Which city it resolves to is decided by the `TENANT` environment
 * variable at build time — see `src/tenants/active.ts`.
 */

import { tenant } from "../tenants";

export const site = tenant;

export type Site = typeof site;
