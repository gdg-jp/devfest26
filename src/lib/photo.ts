/**
 * A photo comes from one of two places and the components have to cope with
 * both: a file next to the Markdown (optimised by `astro:assets`), or a Sanity
 * asset (already cropped and sized by Sanity's CDN, honouring the hotspot the
 * organiser set).
 *
 * Both shapes carry `src` / `width` / `height`; `remote` is the discriminant.
 */

export interface RemotePhoto {
  src: string;
  width: number;
  height: number;
  remote: true;
}

export type Photo = ImageMetadata | RemotePhoto;

/** The original name, kept because the speaker avatars read best with it. */
export type SpeakerPhoto = Photo;

export function isRemotePhoto(photo: Photo): photo is RemotePhoto {
  return "remote" in photo;
}

/** Rendered size of the circular avatar, in CSS px. */
export const AVATAR_SIZE = 112;

/**
 * Rendered width of a gutter photo prop, in CSS px.
 *
 * One size, because these only ever appear on wide screens: see the gutter
 * arithmetic in PhotoSticker.astro for why 160 and not more.
 */
export const PROP_SIZE = 160;

/**
 * Backdrop width, in CSS px, and the quality it is encoded at.
 *
 * Still modest for a full-bleed image: a backdrop is blended into the tenant
 * colour, which collapses it towards a single hue and hides most of what extra
 * resolution would buy. Quality is the half that matters now, because the
 * blend keeps enough of the picture that block artefacts would show.
 */
export const BACKDROP_WIDTH = 1600;
export const BACKDROP_QUALITY = 70;

/**
 * Each backdrop surface has its own shape, given as height / width.
 *
 * The register panel is a block of centred copy and roughly a widescreen
 * frame; the countdown is a thin band, so its photo is cropped to a strip
 * before it ever reaches the browser rather than having `object-fit` throw
 * most of the file away.
 */
export const REGISTER_BACKDROP_RATIO = 9 / 16;
export const COUNTDOWN_BACKDROP_RATIO = 1 / 4;
