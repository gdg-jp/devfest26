import type { SanityClient, SanityDocument } from "sanity";

/*
  Derived rather than imported. `sanity` exports a `Transaction` of its own —
  an entry in a document's history — and importing that name here compiles
  until it doesn't.
*/
type ClientTransaction = ReturnType<SanityClient["transaction"]>;

const DRAFTS = "drafts.";

export function publishedIdOf(id: string): string {
  return id.startsWith(DRAFTS) ? id.slice(DRAFTS.length) : id;
}

function isReferenceLike(
  value: unknown,
): value is Record<string, unknown> & { _ref: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { _ref?: unknown })._ref === "string"
  );
}

/**
 * The document as it will exist once published.
 *
 * This mirrors `strengthenOnPublish` in Sanity's own publish operation
 * (`sanity/lib/datastores`): a reference picked while its target was still
 * unpublished is stored weak and tagged `_strengthenOnPublish`, and publishing
 * is what promotes it back to a strong reference. Reproducing that here is not
 * optional — writing the draft's value verbatim would leave every such
 * reference permanently weak, and weak references are exactly what the site's
 * queries cannot survive: `speakers[]->_id` on a dangling reference resolves to
 * null rather than failing, so the page renders wrong instead of the build
 * breaking.
 */
function strengthen(value: unknown): unknown {
  if (isReferenceLike(value)) {
    const marker = value._strengthenOnPublish as { weak?: boolean } | undefined;
    if (!marker) return value;

    const drop = new Set(["_strengthenOnPublish"]);
    /*
      `_strengthenOnPublish.weak` records what the *schema* asked for. A field
      declared `weak: true` stays weak; only a field that wanted a strong
      reference gets `_weak` removed.
    */
    if (!marker.weak) drop.add("_weak");

    return Object.fromEntries(
      Object.entries(value).filter(([key]) => !drop.has(key)),
    );
  }

  if (Array.isArray(value)) return value.map(strengthen);

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, strengthen(item)]),
    );
  }

  return value;
}

/** The value the publish transaction will write for a draft. */
export function publishedValueOf(draft: SanityDocument): SanityDocument {
  const value = strengthen(draft) as Record<string, unknown>;
  /*
    Dropped so the Content Lake stamps its own, exactly as the built-in action
    does. `strengthen` returned a fresh object, so this touches no snapshot.
  */
  delete value._updatedAt;
  return { ...value, _id: publishedIdOf(draft._id) } as SanityDocument;
}

/**
 * Every document this one will require to exist once published.
 *
 * Only strong references count: a weak reference is precisely a reference the
 * Content Lake will not check. The walk runs over the *strengthened* value
 * rather than the draft, because that is the value whose integrity is going to
 * be validated.
 */
export function dependenciesOf(draft: SanityDocument): string[] {
  const found = new Set<string>();

  const walk = (value: unknown): void => {
    if (isReferenceLike(value)) {
      /*
        Stop here rather than recursing. A reference's own fields are its
        bookkeeping (`_type`, `_key`, `_weak`) and hold no further references.
      */
      if (value._weak !== true) found.add(publishedIdOf(value._ref));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(walk);
    }
  };

  walk(publishedValueOf(draft));
  found.delete(publishedIdOf(draft._id));
  return [...found];
}

export interface Resolution {
  /** Draft ids that will be published, in the order they were resolved. */
  included: string[];
  /** Of those, the ones pulled in to satisfy a reference rather than chosen. */
  pulledIn: string[];
  /** References that can be satisfied neither by a draft nor by a published document. */
  dangling: { from: string; ref: string }[];
}

/**
 * Expands a selection to everything it depends on.
 *
 * Publishing a session whose speaker is still a draft fails, because the
 * strong reference is validated against the published dataset. Publishing the
 * two together in one transaction succeeds, because integrity is checked once,
 * against the state the whole transaction produces. So the selection the
 * author makes is a starting point, and this closes it over its references
 * before anything is written.
 */
export function resolveSelection(
  selected: Iterable<string>,
  draftsByPublishedId: ReadonlyMap<string, SanityDocument>,
  alreadyPublished: ReadonlySet<string>,
): Resolution {
  const included: string[] = [];
  const pulledIn: string[] = [];
  const dangling: { from: string; ref: string }[] = [];
  const seen = new Set<string>();

  const queue = [...selected];
  const chosen = new Set(queue);

  while (queue.length > 0) {
    const draftId = queue.shift() as string;
    const publishedId = publishedIdOf(draftId);
    if (seen.has(publishedId)) continue;
    seen.add(publishedId);

    const draft = draftsByPublishedId.get(publishedId);
    if (!draft) continue;

    included.push(draft._id);
    if (!chosen.has(draft._id)) pulledIn.push(draft._id);

    for (const ref of dependenciesOf(draft)) {
      if (alreadyPublished.has(ref)) continue;

      const dependency = draftsByPublishedId.get(ref);
      if (dependency) {
        queue.push(dependency._id);
      } else {
        /*
          Neither published nor drafted. Usually the target was deleted while
          something still pointed at it. The transaction would fail anyway;
          saying so up front is friendlier than surfacing a Content Lake error.
        */
        dangling.push({ from: draft._id, ref });
      }
    }
  }

  return { included, pulledIn, dangling };
}

/**
 * One transaction for the whole batch.
 *
 * Each document is written exactly the way Sanity's own publish action writes
 * it, including the `ifRevisionID` guard against a published document someone
 * else has moved on since it was read. Batching them buys the atomicity:
 * referential integrity is validated against the result of the transaction, so
 * documents that reference each other can go out together, and a batch that
 * cannot satisfy its references writes nothing at all rather than half of it.
 */
export function buildPublishTransaction(
  client: SanityClient,
  drafts: readonly SanityDocument[],
  publishedRevisions: ReadonlyMap<string, string>,
): ClientTransaction {
  return drafts.reduce((tx, draft) => {
    const publishedId = publishedIdOf(draft._id);
    const revision = publishedRevisions.get(publishedId);

    if (revision) {
      /*
        A no-op patch used only for its precondition — the same trick the
        built-in action uses. `createOrReplace` cannot carry `ifRevisionID`, so
        the check rides in front of it inside the same transaction.
      */
      tx.patch(publishedId, {
        unset: ["_revision_lock_pseudo_field_"],
        ifRevisionID: revision,
      });
    }

    return tx.createOrReplace(publishedValueOf(draft)).delete(draft._id);
  }, client.transaction());
}
