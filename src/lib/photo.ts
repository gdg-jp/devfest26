/**
 * A speaker photo comes from one of two places and the components have to cope
 * with both: a file next to the Markdown (optimised by `astro:assets`), or a
 * Sanity asset (already cropped and sized by Sanity's CDN, honouring the
 * hotspot the organiser set).
 *
 * Both shapes carry `src` / `width` / `height`; `remote` is the discriminant.
 */

export interface RemotePhoto {
  src: string;
  width: number;
  height: number;
  remote: true;
}

export type SpeakerPhoto = ImageMetadata | RemotePhoto;

export function isRemotePhoto(photo: SpeakerPhoto): photo is RemotePhoto {
  return "remote" in photo;
}

/** Rendered size of the circular avatar, in CSS px. */
export const AVATAR_SIZE = 112;
