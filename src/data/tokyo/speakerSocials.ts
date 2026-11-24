/**
 * Tokyo speakers' accounts elsewhere, keyed by the speaker's slug in Sanity.
 *
 * Kept here rather than in the Studio: the CMS holds what a speaker page is
 * built from, and a handful of handles is not worth a schema change. Most were
 * taken from the speaker pages of Google I/O Extended Tokyo 2026
 * (https://ioe-tokyo-2026.web.app/#speakers), where much of the line-up also
 * spoke; the rest came from the organisers. A speaker missing here simply
 * shows no links.
 */

export type SocialType = "x" | "linkedin";

export interface SpeakerSocial {
  type: SocialType;
  /**
   * What follows the service's profile URL: the X handle without the `@`, or
   * the LinkedIn `/in/` slug.
   */
  handle: string;
}

/** How each service is linked, named and drawn (a 24×24 filled path). */
const SERVICES: Record<
  SocialType,
  {
    name: string;
    url: (handle: string) => string;
    /** The pill's text. LinkedIn slugs are not meant to be read. */
    text: (handle: string) => string;
    icon: string;
  }
> = {
  x: {
    name: "X",
    url: (handle) => `https://x.com/${handle}`,
    text: (handle) => `@${handle}`,
    icon: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12Z",
  },
  linkedin: {
    name: "LinkedIn",
    url: (handle) => `https://www.linkedin.com/in/${handle}`,
    text: () => "LinkedIn",
    icon: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  },
};

const x = (handle: string): SpeakerSocial => ({ type: "x", handle });
const linkedin = (handle: string): SpeakerSocial => ({
  type: "linkedin",
  handle,
});

export const TOKYO_SPEAKER_SOCIALS: Record<string, SpeakerSocial[]> = {
  adamrocker: [x("adamrocker")],
  "asei-sugiyama": [x("K_Ryuichirou")],
  "david-landup": [linkedin("david-landup-859455144")],
  "eiji-kitamura": [x("agektmr")],
  haren: [x("HarenB16221")],
  "jun-sakata": [x("sakajunquality")],
  "kazumasa-iwao": [x("maxcandy416")],
  "kazunori-sato": [x("kazunori_279")],
  khinezar: [x("koalakhine")],
  "kimihiko-kitase": [x("kkitase")],
  kitakkun: [x("kitakkun_pb")],
  kwakasa: [x("kwakasa")],
  lacolaco: [x("laco2net")],
  "lucas-goldner": [x("LucasGoldner")],
  mario: [x("vloomy_mario")],
  mayahjp: [x("mayahjp")],
  munetoshi: [x("mntsh")],
  myakura: [x("myakura")],
  naoya: [x("Getty708")],
  ohtaman: [x("ohtaman")],
  ryunen344: [x("RyuNen344")],
  "saku-01": [x("sakupi01")],
  "shoji-matsukawa": [x("shojimatsukawa")],
  "shotaro-ishihara": [x("upura0")],
  takahirom: [x("new_runnable")],
  tsho: [x("tshowis")],
  "yanzm-2": [x("yanzm")],
  "yoichiro-tanaka-2": [x("yoichiro")],
  "yukio-andoh-2": [x("yukio_andoh")],
};

export const socialUrl = (social: SpeakerSocial) =>
  SERVICES[social.type].url(social.handle);

export const socialText = (social: SpeakerSocial) =>
  SERVICES[social.type].text(social.handle);

/** For screen readers: the service, then what the pill says. */
export const socialLabel = (social: SpeakerSocial) => {
  const { name } = SERVICES[social.type];
  const text = socialText(social);
  return text === name ? name : `${name}: ${text}`;
};

export const socialIcon = (social: SpeakerSocial) => SERVICES[social.type].icon;

export const speakerSocials = (slug: string) =>
  TOKYO_SPEAKER_SOCIALS[slug] ?? [];
