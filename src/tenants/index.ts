import { activeTenant } from './active';
import { eventDates } from './eventDates';
import { fromSanityIfEnabled } from './source';
import type { TenantId } from './ids';
import { kansai } from './kansai';
import { tokyo } from './tokyo';
import type { TenantConfig } from './types';

const registry: Record<TenantId, TenantConfig> = { kansai, tokyo };

/**
 * Expands a tenant config into what the components actually read: the raw
 * fields plus every date label derived from `startsAt` / `endsAt`.
 */
function resolve(config: TenantConfig) {
  const { social, ...event } = config.event;

  return {
    ...config,
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
  (await fromSanityIfEnabled(activeTenant)) ?? registry[activeTenant as TenantId],
);

export type ResolvedTenant = typeof tenant;
export { activeTenant };
