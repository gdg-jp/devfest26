/**
 * Reads one language out of an internationalized-array field's raw value, for
 * a document list preview. Falls back to Japanese, then to whichever item
 * happens to be first — a preview should never show nothing just because a
 * translation is still missing.
 */
export function pickI18n(
  items: { language: string; value: string }[] | undefined,
  lang = "ja",
): string | undefined {
  if (!items?.length) return undefined;
  return items.find((item) => item.language === lang)?.value ?? items[0]?.value;
}
