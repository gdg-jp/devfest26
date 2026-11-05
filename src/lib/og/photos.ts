import { readFile } from "node:fs/promises";
import { createImageUrlBuilder } from "@sanity/image-url";
import { cropToFace } from "./faces";
import type { PhotoInput } from "./input";
import type { Framing } from "./faces";

/**
 * A speaker's photo, cut to the frame it fills, as a JPEG data URI.
 *
 * An organiser who set a hotspot in the Studio has said where the person is,
 * and Sanity's CDN cuts to it. Every other photo — Sanity without a hotspot,
 * a URL, a file — is fetched whole and cut around the face found in it; see
 * `./faces.ts`.
 *
 * A frame with a `framing` of its own comes first of all: a hotspot knows
 * nothing of that frame's notch. Such a frame is cut from the whole upload,
 * past any crop set in the Studio, which leaves the frame no room to move in.
 *
 * A photo cut without a face found in it is named in the build log, once per
 * speaker: those are the ones to give a hotspot in the Studio. `who` is the
 * name it is reported under.
 *
 * Nothing here throws. A photo that cannot be had is reported and left out,
 * and the frame shows the speaker's initial instead: a card without the face
 * is still a card, and a failed deploy is not.
 */
export async function framedPhoto(
  photo: PhotoInput,
  width: number,
  height: number,
  who = "a speaker",
  framing?: Framing,
): Promise<string | undefined> {
  try {
    let jpeg: Buffer;
    if (typeof photo !== "string") {
      const { projectId, dataset, image } = photo.sanity;
      const url = createImageUrlBuilder({ projectId, dataset }).image(
        framing ? { asset: image.asset } : image,
      );
      jpeg =
        image.hotspot && !framing
          ? await download(
              // JPEG rather than `auto`: satori reads JPEG and PNG, not WebP.
              url
                .width(width)
                .height(height)
                .fit("crop")
                .format("jpg")
                .quality(85)
                .url(),
            )
          : reported(
              who,
              await cropToFace(
                await download(
                  url.width(1400).fit("max").format("jpg").quality(90).url(),
                ),
                width,
                height,
                framing,
              ),
            );
    } else {
      const source = /^https?:\/\//.test(photo)
        ? await download(photo)
        : await readFile(photo);
      jpeg = reported(who, await cropToFace(source, width, height, framing));
    }
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (error) {
    console.warn(`[og] Drawing an initial instead of a photo: ${error}`);
    return undefined;
  }
}

const unfound = new Set<string>();

function reported(
  who: string,
  { jpeg, face }: Awaited<ReturnType<typeof cropToFace>>,
): Buffer {
  if (!face && !unfound.has(who)) {
    unfound.add(who);
    console.warn(
      `[og] No face found in ${who}'s photo; cut from the centre. Give it a hotspot in the Studio if that misses.`,
    );
  }
  return jpeg;
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
