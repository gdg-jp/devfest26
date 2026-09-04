import { diffInput, wrap } from "@sanity/diff";
import type { Annotation, ObjectDiff, SanityDocument } from "sanity";

/*
  Stripped before diffing rather than after: `_rev` and `_updatedAt` differ on
  every save and `_id` differs by the `drafts.` prefix alone, so leaving them in
  would put four meaningless rows at the top of every comparison. This is the
  same list Sanity's own `DocumentDiff` removes.
*/
const SYSTEM_FIELDS = new Set(["_id", "_rev", "_createdAt", "_updatedAt"]);

/** The document reduced to the fields a comparison should look at. */
export function comparable(
  document: SanityDocument | null,
): Record<string, unknown> {
  if (!document) return {};
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => !SYSTEM_FIELDS.has(key)),
  );
}

/**
 * What publishing this draft will change.
 *
 * A `base` of null (nothing published yet) diffs against an empty object, so
 * every field arrives as an addition. That is deliberate — for a document
 * being published for the first time, "what changes" and "what it contains"
 * are the same question.
 *
 * The annotation is null throughout. Annotations are what let the Studio's
 * history view say who touched a field and when; nothing here is reading
 * history, and inventing an author would put a wrong name in the tooltips.
 */
export function publishDiff(
  base: SanityDocument | null,
  next: SanityDocument,
): ObjectDiff | null {
  const diff = diffInput<Annotation>(
    wrap<Annotation>(comparable(base), null),
    wrap<Annotation>(comparable(next), null),
  );
  /*
    `diffInput` is typed over every JSON shape. Two documents can only ever
    produce an object diff, but `ChangeList` asks for one specifically, so
    narrow rather than assert.
  */
  return diff.type === "object" ? diff : null;
}
