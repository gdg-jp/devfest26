import { activeTenant } from "./active";
import { eventDates } from "./eventDates";
import { fromSanityIfEnabled } from "./source";
import { isPortal } from "../portal/active";
import type { TenantId } from "./ids";
import { registry } from "./registry";
import type { TenantConfig } from "./types";

/**
 * "DevFest 2026 in Kansai" → "Kansai". The top bar sets the city name beside
 * the logo, where the full title has no room, so it is derived from `titleEn`
 * rather than being one more field every city has to keep in sync.
 */
function editionEn(config: TenantConfig): string {
  const match = /\bin\s+(.+)$/i.exec(config.titleEn.trim());
  if (match) return match[1].trim();

  // A city that titles itself some other way still gets a usable label.
  return config.tenant.charAt(0).toUpperCase() + config.tenant.slice(1);
}

/**
 * Expands a tenant config into what the components actually read: the raw
 * fields plus every date label derived from `startsAt` / `endsAt`.
 */
function resolve(config: TenantConfig) {
  const { social, ...event } = config.event;

  return {
    ...config,
    editionEn: editionEn(config),
    event: {
      ...event,
      ...eventDates(config.event.startsAt, config.event.endsAt),
      social: social && { ...social, hours: `${social.start} – ${social.end}` },
    },
  };
}

/**
 * Top-level await: with Sanity on, the config is a network read, and every
 * component reads `site` synchronously. Awaiting once here keeps all of them
 * unchanged.
 *
 * The portal build renders no city, so it does not go asking the CMS for one —
 * it would otherwise fail a deploy over a city it never puts on a page.
 */
export const tenant = resolve(
  (isPortal ? undefined : await fromSanityIfEnabled(activeTenant)) ??
    registry[activeTenant as TenantId],
);

export type ResolvedTenant = typeof tenant;
export { activeTenant };
