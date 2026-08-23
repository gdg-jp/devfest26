import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { dataset, projectId } from './env';

/**
 * Speaker photos are served straight off Sanity's CDN rather than through
 * `astro:assets`. The reason is the hotspot: organisers set the focal point in
 * the Studio, and the crop follows it — which is what a circular avatar needs
 * and what a build-time centre crop cannot do.
 */
export function speakerPhotoUrl(source: SanityImageSource, size: number): string {
  if (!projectId) throw new Error('Sanity is not configured');

  return createImageUrlBuilder({ projectId, dataset })
    .image(source)
    .width(size)
    .height(size)
    .fit('crop')
    .auto('format')
    .url();
}
