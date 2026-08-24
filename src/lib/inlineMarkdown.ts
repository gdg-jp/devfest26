/**
 * The one piece of inline formatting content authors need in a frontmatter
 * string: `**emphasis**`.
 *
 * Escaping runs first, so the output is safe even once these strings come from
 * a CMS rather than from the repo. Deliberately not a Markdown parser — one
 * construct, no nesting, no links.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * The `**emphasis**` half on its own, for callers whose input is already HTML
 * and must not be escaped again — see src/lib/sanity/portableText.ts.
 *
 * The run may not contain a tag, so a stray `**` cannot swallow the markup
 * between two paragraphs; in escaped plain text `<` never appears anyway.
 */
export function emphasis(html: string): string {
  return html.replace(/\*\*([^*<]+)\*\*/g, "<strong>$1</strong>");
}

export function inlineMarkdown(source: string): string {
  return emphasis(source.replace(/[&<>"']/g, (c) => ESCAPES[c]));
}
