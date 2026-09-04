import type { SanityDocument } from "sanity";

/** A published city, as one line in the list. */
export interface City {
  publishedId: string;
  slug: string;
  title: string;
}

/** One city's entry in the deploy document's history. */
export interface DeployRecord {
  _key: string;
  _type: "record";
  slug: string;
  at: string;
}

export interface DeployDocument extends SanityDocument {
  requestedAt?: string;
  requestedBy?: string;
  targets?: string[];
  history?: DeployRecord[];
}

/**
 * When each city was last asked for.
 *
 * The tool counts a city's published documents changed since this moment and
 * calls them 未反映. It is the time of the *request*, not of a build that
 * finished — a build that failed leaves the count at zero while the site is
 * still stale. That is a real gap, and the reason the tool shows the state of
 * the build next to the counts rather than only the counts.
 */
export function lastDeployedAt(
  document: DeployDocument | null,
): ReadonlyMap<string, string> {
  const times = new Map<string, string>();
  for (const record of document?.history ?? []) {
    if (record?.slug && record?.at) times.set(record.slug, record.at);
  }
  return times;
}

/**
 * The document「サイトに反映」writes.
 *
 * Written to a fixed id, and rewritten in full rather than patched: what the
 * webhook reacts to is that this document changed, and one document rewritten
 * once per click is what keeps one click to one build.
 *
 * `history` carries the cities that were *not* part of this request forward
 * unchanged. Overwriting it with only the requested cities would reset every
 * other city's 未反映 count to zero without having rebuilt it.
 */
export function nextDeployDocument(
  previous: DeployDocument | null,
  id: string,
  targets: readonly string[],
  requestedBy: string,
  at: string,
): DeployDocument {
  const history = new Map<string, DeployRecord>();
  for (const record of previous?.history ?? []) {
    if (record?.slug) history.set(record.slug, record);
  }
  for (const slug of targets) {
    if (slug) history.set(slug, { _key: slug, _type: "record", slug, at });
  }

  return {
    _id: id,
    _type: "deploy",
    requestedAt: at,
    requestedBy,
    targets: [...targets],
    history: [...history.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
  } as DeployDocument;
}
