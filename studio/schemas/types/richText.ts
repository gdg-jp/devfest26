import { defineType } from "sanity";

/**
 * A named alias for "array of block", registered the same way `stringList`
 * is. Using `block` directly in `fieldTypes` would give each language a
 * single block instead of an array of them — one paragraph, not a document.
 * This gives every internationalized rich-text field (`aboutPage.body`,
 * `session.abstract`, and the rest) the same multi-paragraph editing the
 * Japanese-only fields already had.
 */
export const richText = defineType({
  name: "richText",
  title: "Rich Text",
  type: "array",
  of: [{ type: "block" }],
});
