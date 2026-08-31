import {
  createClient,
  type ClientConfig,
  type SanityClient,
} from "@sanity/client";
import {
  apiVersion,
  dataset,
  projectId,
  readToken,
  sanityEnabled,
  studioUrl,
} from "./env";
import { previewMode } from "../../preview/mode";
import { encodable } from "../../preview/stega";

let cached: { key: string; client: SanityClient } | undefined;

export function sanityClient(): SanityClient {
  if (!sanityEnabled()) {
    throw new Error(
      "Sanity is not configured. Set SANITY_PROJECT_ID to build from the CMS.",
    );
  }

  const token = readToken();

  const config: ClientConfig = {
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
    /*
      Click-to-edit, and only in the preview. Turning this on makes the client
      ask for a Content Source Map alongside the result and hide an invisible
      "this came from that field" marker inside each string it is allowed to —
      which is what lets the overlay in the browser open the right field
      without a single component being annotated. `filter` is what "allowed
      to" means, and it is not optional: see `src/preview/stega.ts`.

      `false` rather than absent in a published build, so the shape of this
      object does not depend on the branch. `previewMode` is a build-time
      constant either way, so the published build drops the import along with
      the branch.
    */
    stega: previewMode
      ? { enabled: true, studioUrl: studioUrl(), filter: encodable }
      : false,
  };

  /*
    Kept until the configuration it was built from changes, rather than for the
    lifetime of the module — which is the same reason `env.ts` exports
    functions rather than constants. A Worker isolate outlives every request it
    serves, so a client built once on the first of them would go on answering
    with a token that has since been rotated away, or go on answering
    `published` after a token arrived. Reusing it while nothing has changed is
    what matters here; the client holds a connection pool and a warm config,
    and a build asks for it once per document.
  */
  const key = JSON.stringify(config);
  if (cached?.key !== key) cached = { key, client: createClient(config) };

  return cached.client;
}
