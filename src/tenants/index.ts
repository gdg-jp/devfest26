import { activeTenant } from "./active";
import { eventDates } from "./eventDates";
import { fromSanityIfEnabled } from "./source";
import type { TenantId } from "./ids";
import { kansai } from "./kansai";
import { tokyo } from "./tokyo";
import type { TenantConfig } from "./types";

const registry: Record<TenantId, TenantConfig> = { kansai, tokyo };

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
 */
export const tenant = resolve(
  (await fromSanityIfEnabled(activeTenant)) ??
    registry[activeTenant as TenantId],
);

export type ResolvedTenant = typeof tenant;
export { activeTenant };
