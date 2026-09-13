import { defineType } from "sanity";

/**
 * A named alias for "array of string", registered so it can be named in
 * `internationalizedArray`'s `fieldTypes` — the plugin only accepts a
 * registered type name for anything beyond its built-in primitives, per its
 * README ("you cannot use anonymous objects in the fieldTypes array").
 *
 * Gives fields like `aboutPage.audienceItems` one bullet list per language,
 * rather than one language slot per bullet.
 */
export const stringList = defineType({
  name: "stringList",
  title: "String List",
  type: "array",
  of: [{ type: "string" }],
});
