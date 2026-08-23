import { toHTML } from '@portabletext/to-html';

/**
 * Portable Text → the HTML string the content layer stores as `rendered.html`.
 *
 * Doing the conversion in the loader rather than in a component is what keeps
 * `<Content />` working unchanged: the components cannot tell whether the prose
 * came from Markdown or from Sanity.
 */
export function portableTextToHtml(blocks: unknown): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';

  return toHTML(blocks, {
    components: {
      marks: {
        link: ({ children, value }) => {
          const href = String(value?.href ?? '');
          const external = /^https?:\/\//.test(href);
          const rel = external ? ' target="_blank" rel="noopener"' : '';
          return `<a href="${escapeAttr(href)}"${rel}>${children}</a>`;
        },
      },
    },
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * The same blocks as plain text.
 *
 * Speaker bios are rendered as a bare paragraph rather than through
 * `<Content />`, and the Markdown loader fills `entry.body` for exactly that.
 * The Sanity loader has to fill it too or bios silently vanish.
 */
export function portableTextToPlain(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';

  return blocks
    .filter((b) => (b as { _type?: string })?._type === 'block')
    .map((b) =>
      ((b as { children?: { text?: string }[] }).children ?? [])
        .map((child) => child.text ?? '')
        .join(''),
    )
    .join('\n\n')
    .trim();
}
