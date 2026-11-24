/**
 * Tokyo speakers' accounts elsewhere, keyed by the speaker's slug in Sanity.
 *
 * Kept here rather than in the Studio: the CMS holds what a speaker page is
 * built from, and a handful of handles is not worth a schema change. Taken
 * from the speaker pages of Google I/O Extended Tokyo 2026
 * (https://ioe-tokyo-2026.web.app/#speakers), where most of the line-up also
 * spoke. A speaker missing here simply shows no links.
 */

export interface SpeakerSocial {
  type: "x";
  /** The handle without the `@`. */
  handle: string;
}

const x = (handle: string): SpeakerSocial => ({ type: "x", handle });

export const TOKYO_SPEAKER_SOCIALS: Record<string, SpeakerSocial[]> = {
  adamrocker: [x("adamrocker")],
  "asei-sugiyama": [x("K_Ryuichirou")],
  "eiji-kitamura": [x("agektmr")],
  haren: [x("HarenB16221")],
  "kazunori-sato": [x("kazunori_279")],
  lacolaco: [x("laco2net")],
  "lucas-goldner": [x("LucasGoldner")],
  naoya: [x("Getty708")],
  ohtaman: [x("ohtaman")],
  "saku-01": [x("sakupi01")],
  takahirom: [x("new_runnable")],
  tsho: [x("tshowis")],
  "yanzm-2": [x("yanzm")],
  "yoichiro-tanaka-2": [x("yoichiro")],
  "yukio-andoh-2": [x("yukio_andoh")],
};

export const socialUrl = (social: SpeakerSocial) =>
  `https://x.com/${social.handle}`;

export const speakerSocials = (slug: string) =>
  TOKYO_SPEAKER_SOCIALS[slug] ?? [];
