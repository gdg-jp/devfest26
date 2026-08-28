import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";
import { BACKDROP_QUALITY } from "../photo";
import { dataset, projectId } from "./env";

/**
 * Speaker photos are served straight off Sanity's CDN rather than through
 * `astro:assets`. The reason is the hotspot: organisers set the focal point in
 * the Studio, and the crop follows it — which is what a circular avatar needs
 * and what a build-time centre crop cannot do.
 */
export function speakerPhotoUrl(
  source: SanityImageSource,
  size: number,
): string {
  if (!projectId) throw new Error("Sanity is not configured");

  return createImageUrlBuilder({ projectId, dataset })
    .image(source)
    .width(size)
    .height(size)
    .fit("crop")
    .auto("format")
    .url();
}

/**
 * A gutter photo prop, cropped square to the hotspot. Same reasoning as the
 * avatars: the organiser picks the focal point, not the build.
 */
export function propPhotoUrl(source: SanityImageSource, size: number): string {
  if (!projectId) throw new Error("Sanity is not configured");

  return createImageUrlBuilder({ projectId, dataset })
    .image(source)
    .width(size)
    .height(size)
    .fit("crop")
    .auto("format")
    .url();
}

/**
 * A section backdrop, cropped to the shape of the surface it sits behind. Not
 * retina-doubled: it renders blended into the tenant colour, where a second
 * copy of the pixels would buy nothing visible.
 */
export function backdropUrl(
  source: SanityImageSource,
  width: number,
  ratio: number,
): string {
  if (!projectId) throw new Error("Sanity is not configured");

  return createImageUrlBuilder({ projectId, dataset })
    .image(source)
    .width(width)
    .height(Math.round(width * ratio))
    .fit("crop")
    .quality(BACKDROP_QUALITY)
    .auto("format")
    .url();
}
