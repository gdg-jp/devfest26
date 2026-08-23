/**
 * The one piece of inline formatting content authors need in a frontmatter
 * string: `**emphasis**`.
 *
 * Escaping runs first, so the output is safe even once these strings come from
 * a CMS rather than from the repo. Deliberately not a Markdown parser — one
 * construct, no nesting, no links.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function inlineMarkdown(source: string): string {
  return source
    .replace(/[&<>"']/g, (c) => ESCAPES[c])
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
