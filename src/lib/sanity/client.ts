import { createClient, type SanityClient } from '@sanity/client';
import { apiVersion, dataset, projectId, readToken, sanityEnabled } from './env';

let cached: SanityClient | undefined;

export function sanityClient(): SanityClient {
  if (!sanityEnabled) {
    throw new Error(
      'Sanity is not configured. Set SANITY_PROJECT_ID to build from the CMS.',
    );
  }

  cached ??= createClient({
    projectId,
    dataset,
    apiVersion,
    token: readToken,
    // Builds are one-shot and want the freshest published content, not the
    // edge cache that a request-time client would prefer.
    useCdn: false,
    perspective: readToken ? 'drafts' : 'published',
  });

  return cached;
}
