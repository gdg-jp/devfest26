import { createClient, type SanityClient } from "@sanity/client";
import {
  apiVersion,
  dataset,
  projectId,
  readToken,
  sanityEnabled,
} from "./env";

let cached: SanityClient | undefined;

export function sanityClient(): SanityClient {
  if (!sanityEnabled()) {
    throw new Error(
      "Sanity is not configured. Set SANITY_PROJECT_ID to build from the CMS.",
    );
  }

  const token = readToken();

  cached ??= createClient({
    projectId: projectId(),
    dataset: dataset(),
    apiVersion: apiVersion(),
    token,
    // Builds are one-shot and want the freshest published content, not the
    // edge cache that a request-time client would prefer. The draft preview
    // wants the same thing for the opposite reason: a draft saved a moment ago
    // is the entire point of it.
    useCdn: false,
    perspective: token ? "drafts" : "published",
  });

  return cached;
}
