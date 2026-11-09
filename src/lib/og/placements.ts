import type { Framing } from "./faces";

/**
 * The photos placed by hand: session slug, then speaker slug.
 *
 * The automatic cut centres a face and knows nothing of the notch, which on a
 * two- or three-speaker card can take the top of a head or a chin. Where it
 * does, the placement goes here rather than on the frame, so that nobody else
 * who lands in that frame moves. Per session because the same photo can land
 * in a different frame on another card.
 */
export const PLACEMENTS: Record<string, Record<string, Framing>> = {
  "a-new-normal-in-web-frontend-dev": {
    lacolaco: {
      at: { x: 0.5, y: 0.47, size: 0.46 },
      faceHeight: 0.39,
      eyeLine: 0.4,
      across: 0.46,
      bleed: "stretch",
    },
  },
  "ai-agent-in-google-cloud": {
    mario: { faceHeight: 0.34, eyeLine: 0.5, across: 0.42 },
    "asei-sugiyama": { faceHeight: 0.47, eyeLine: 0.64, bleed: "blur" },
  },
  engineering: {
    "kazunori-sato": { faceHeight: 0.38, eyeLine: 0.56, bleed: "blur" },
  },
  "unlocking-ai": {
    tsho: { faceHeight: 0.46, eyeLine: 0.4, across: 0.5, bleed: "stretch" },
    ohtaman: { faceHeight: 0.38, eyeLine: 0.56, bleed: "blur" },
  },
  "ws-design-sprint": {
    "kanto-kotegawa": { faceHeight: 0.42, eyeLine: 0.57, bleed: "blur" },
  },
};
