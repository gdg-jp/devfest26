/**
 * Speaker photos are addressed by basename from content frontmatter
 * (`photo: llion-jones`), so the Markdown stays free of relative asset paths.
 * A name with no matching file fails the build rather than rendering a hole.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/speakers/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const base = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  byName.set(base, mod.default);
}

export function speakerPhoto(name: string): ImageMetadata {
  const image = byName.get(name);
  if (!image) {
    throw new Error(
      `Speaker photo "${name}" not found in src/assets/speakers/. ` +
        `Available: ${[...byName.keys()].sort().join(', ')}`,
    );
  }
  return image;
}
