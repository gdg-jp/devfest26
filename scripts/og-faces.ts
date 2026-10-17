/**
 * A contact sheet of how every speaker's photo is cut for the session cards:
 *
 *   pnpm og:faces [--city tokyo] [--out dist/og-faces]
 *
 * One row per speaker on Sanity: the photo as uploaded, with the faces the
 * detector found boxed (the one the card uses in green), then the photo in
 * each frame shape a card can put it in — one speaker, two, three — with the
 * frame's notch cut out, exactly as `src/lib/og/photos.ts` cuts it.
 *
 * Photos in which no face was found are listed at the end of the run: those
 * are the ones to give a hotspot in the Studio.
 *
 * Reads the published dataset, so no token is needed. Writes index.html.
 */

import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createImageUrlBuilder } from "@sanity/image-url";
import sharp from "sharp";
import { findFaces } from "../src/lib/og/faces";
import { framedPhoto } from "../src/lib/og/photos";
import { SPEAKER_FRAMES, frameSvg } from "../src/lib/og/render";
import type { PhotoInput } from "../src/lib/og/input";

const { values } = parseArgs({
  options: {
    city: { type: "string", default: "tokyo" },
    out: { type: "string", default: "dist/og-faces" },
  },
});

const projectId = process.env.SANITY_PROJECT_ID?.trim();
const dataset = process.env.SANITY_DATASET?.trim() || "production";
if (!projectId) {
  console.error("SANITY_PROJECT_ID is not set (it is read from .env).");
  process.exit(1);
}

type SanityImage = Extract<PhotoInput, { sanity: unknown }>["sanity"]["image"];
interface Row {
  name: string;
  slug: string;
  photo: SanityImage | null;
}

const query = `*[_type == "speaker" && event->slug.current == $city]{
  "name": name[language == "ja"][0].value, "slug": slug.current, photo
} | order(name asc)`;
const url = new URL(
  `https://${projectId}.apicdn.sanity.io/v2026-01-01/data/query/${dataset}`,
);
url.searchParams.set("query", query);
url.searchParams.set("$city", JSON.stringify(values.city));
const response = await fetch(url);
if (!response.ok) {
  console.error(`${response.status} from Sanity`);
  process.exit(1);
}
const { result: speakers } = (await response.json()) as { result: Row[] };

const builder = createImageUrlBuilder({ projectId, dataset });
const frames = [
  ...SPEAKER_FRAMES.single.map((f) => ({ ...f, label: "1人" })),
  ...SPEAKER_FRAMES.pair.map((f, i) => ({ ...f, label: `2人 #${i + 1}` })),
  ...SPEAKER_FRAMES.trio.map((f, i) => ({ ...f, label: `3人 #${i + 1}` })),
];
/** Frames drawn at this fraction of their size on the card. */
const SCALE = 0.3;

const dataUri = (mime: string, body: Buffer | string) =>
  `data:${mime};base64,${Buffer.from(body).toString("base64")}`;
const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const noFace: string[] = [];
const noPhoto: string[] = [];
const rows: string[] = [];

for (const speaker of speakers) {
  const label = `${speaker.name} (${speaker.slug})`;
  if (!speaker.photo?.asset) {
    noPhoto.push(label);
    continue;
  }
  console.log(`… ${label}`);
  const photo = { sanity: { projectId, dataset, image: speaker.photo } };

  // The same download the card makes when there is no hotspot.
  const original = Buffer.from(
    await (
      await fetch(
        builder
          .image(speaker.photo)
          .width(1400)
          .fit("max")
          .format("jpg")
          .quality(90)
          .url(),
      )
    ).arrayBuffer(),
  );
  const upright = await sharp(original).rotate().toBuffer();
  const { width = 1, height = 1 } = await sharp(upright).metadata();
  const faces = await findFaces(upright);
  if (!faces.length && !speaker.photo.hotspot) noFace.push(label);

  const boxes = faces
    .map(
      (f, i) =>
        `<rect x="${f.x - f.size / 2}" y="${f.y - f.size / 2}" width="${f.size}" height="${f.size}" fill="none" stroke="${i ? "#f59e0b" : "#16a34a"}" stroke-width="${Math.max(width, height) / 120}"/>`,
    )
    .join("");
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="source">` +
    `<image href="${dataUri("image/jpeg", await sharp(upright).resize(400).jpeg().toBuffer())}" width="${width}" height="${height}"/>${boxes}</svg>`;

  const cut = await Promise.all(
    frames.map(async (frame) => {
      const src = await framedPhoto(photo, frame.w, frame.h, label);
      const svg = frameSvg(frame, src ?? "#ddd");
      return `<figure><img src="${dataUri("image/svg+xml", svg)}" width="${Math.round(frame.w * SCALE)}" height="${Math.round(frame.h * SCALE)}"><figcaption>${frame.label}</figcaption></figure>`;
    }),
  );

  const how = speaker.photo.hotspot
    ? "hotspot"
    : faces.length
      ? `顔検出 (${faces.length}件, score ${Math.round(faces[0].score)})`
      : "顔なし → 中央・やや上で切り抜き";
  rows.push(
    `<section class="${faces.length || speaker.photo.hotspot ? "" : "miss"}"><h2>${escape(speaker.name)} <small>${escape(speaker.slug)} · ${how}</small></h2>` +
      `<div class="row">${source}${cut.join("")}</div></section>`,
  );
}

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OG face crops — ${escape(values.city!)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; background: #fafafa; color: #111; }
  section { margin-bottom: 28px; padding: 12px 16px; background: #fff; border-radius: 8px; }
  section.miss { outline: 3px solid #dc2626; }
  h2 { font-size: 16px; margin: 0 0 8px; }
  small { color: #666; font-weight: 400; }
  .row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
  .source { width: 200px; height: auto; }
  figure { margin: 0; }
  figcaption { font-size: 12px; color: #666; text-align: center; }
</style></head><body>
<h1>OG face crops — ${escape(values.city!)}</h1>
<p>左: アップロードされた写真（緑 = カードが使う顔、橙 = それ以外に見つかった顔）。右: カードの各枠での切り抜き。赤枠 = 顔が見つからず、中央・やや上寄せで切り抜いた写真。</p>
${rows.join("\n")}
${noPhoto.length ? `<p>写真なし: ${noPhoto.map(escape).join(", ")}</p>` : ""}
</body></html>`;

const out = resolve(values.out!);
mkdirSync(out, { recursive: true });
await writeFile(join(out, "index.html"), html);
console.log(`\nwrote ${join(out, "index.html")}`);
if (noFace.length) {
  console.warn(
    `\nNo face found — give these a hotspot in the Studio:\n${noFace.map((n) => `  - ${n}`).join("\n")}`,
  );
}
