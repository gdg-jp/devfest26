/**
 * Reads one language out of a field that may or may not be internationalized.
 *
 * Everything in this Studio that puts a document's own words on screen goes
 * through here: the list previews, the Presentation panel, and the two tools
 * under `tools/`.
 *
 * It takes `unknown` because that is honestly what it is handed. A preview's
 * `select` and a GROQ projection both hand back a value with no type behind it,
 * and the shape is not fixed either — a migrated field is `[{_key, _type,
 * language, value}]`, a field that has not been migrated yet is still a bare
 * string, and a document written before the field existed has nothing at all.
 * All three turn up, and the one thing none of them may do is reach React: an
 * object rendered as a child is the "Objects are not valid as a React child"
 * crash that takes out a whole list, which is what happens when the content is
 * migrated ahead of the schema.
 *
 * Falls back to Japanese, then to whichever item happens to be first — a
 * preview should never show nothing just because a translation is missing.
 *
 * Only strings come back. `internationalizedArrayRichText` keeps a block array
 * in the same `value` slot, and a heading is not the place to render one.
 */
export function pickI18n(value: unknown, lang = "ja"): string | undefined {
  // Not internationalized, or not migrated yet.
  if (typeof value === "string") return value || undefined;
  if (!Array.isArray(value)) return undefined;

  const items = value as { language?: unknown; value?: unknown }[];
  const item =
    items.find((candidate) => candidate?.language === lang) ?? items[0];
  return typeof item?.value === "string" ? item.value : undefined;
}
