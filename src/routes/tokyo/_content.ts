import type { Language } from "../../i18n";
import type { IconName } from "./_components/icons";

/**
 * Everything on the Tokyo home page that is written by hand rather than read
 * from the programme: the news, the speakers picked out for the top of the
 * page, the FAQ, social links and the page's own labels.
 *
 * The page is laid out as Kansai's, section for section. The lists below are
 * empty until the organisers fill them in — a section whose list is empty is
 * left off the page rather than drawn with nothing in it. Nothing here is
 * ours to invent: every entry should come from GDG Tokyo.
 */

type Localized = Record<Language, string>;

export const localized = (text: Localized, lang: Language) => text[lang];

/* -------------------------------------------------------------------------- */
/* The day                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Whether session times are printed anywhere on Tokyo's pages. Off while the
 * timetable is not settled: the sessions carry times in the Studio, but they
 * are provisional, and a time on a card reads as a promise. Turn it on when
 * the day is final (and put Kansai's `Timetable` back on the home page).
 */
export const SHOW_TIMES = false;

/* -------------------------------------------------------------------------- */
/* Key visual                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The words on the key visual that the event document does not carry. The
 * words only the other key visual candidates used are kept with them, in
 * `design/tokyo-hero/candidates/hero-extras.ts` on the
 * `feat/tokyo-hero-designs` branch (pull request #43), not on this one.
 */
export const HERO = {
  by: { ja: "Google Developers 主催", en: "Hosted by Google Developers" },
  /**
   * What the day is, in GDG Tokyo's own words (their announcement on X,
   * 2026-11-01). `|` is where the line may break: each side stays whole.
   */
  lead: {
    ja: "Google の最先端 AI と|「つくる・動かす」を極める 1 日",
    en: "A day to master building and running things|with Google's latest AI",
  },
  organizedBy: { ja: "Organized by", en: "Organized by" },
  sessions: { ja: "セッションを見る", en: "See the sessions" },
  /** `Level`: who each half of the theme is for, on its tag. */
  meetLevel: { ja: "初心者向け", en: "For beginners" },
  beyondLevel: { ja: "中・上級者向け", en: "Intermediate & up" },
} satisfies Record<string, Localized>;

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What the overview adds to the event document: the date, the venue and the
 * fee come from the city's configuration; how to get there, and that the day
 * is free to come and go from, is said only here.
 */
export const OVERVIEW = {
  /** The line under the venue: where from, then how far — the bigger words. */
  station: { ja: "東京駅から", en: "From Tokyo Station" },
  walk: { ja: "徒歩約 1 分", en: "1-min walk" },
  exit: {
    ja: "JR 丸の内南口の目の前",
    en: "Right across from the Marunouchi South Exit",
  },
  fee: { ja: "無料・入退場自由", en: "Free · come and go freely" },
  feeNote: {
    ja: "懇親会は有料です",
    en: "The after-party is paid",
  },
} satisfies Record<string, Localized>;

export type Lane = "meet" | "beyond";

/**
 * The section between the header and the overview: what each half of the
 * theme is, and who it is for.
 *
 * TODO: 仮の文章です。GDG Tokyo の正式な説明が届きしだい差し替えてください。
 */
export const THEME: Record<
  Lane,
  { lead: Localized; body: Localized; forWhom: Localized[] }
> = {
  meet: {
    lead: {
      ja: "AI と気軽に、まずはつくってみる。",
      en: "Pick up AI and make something.",
    },
    body: {
      ja: "コードを書いたことがなくても大丈夫。AI を相棒に、アイデアをかたちにする楽しさを体験するセッションです。毎日の業務をラクにするコツから、ちょっとしたアプリづくりまで、明日から試せるヒントを持ち帰れます。",
      en: "No code needed. Sessions on the fun of turning an idea into something real with AI beside you — from making everyday work easier to building a small app — with tips you can try tomorrow.",
    },
    forWhom: [
      { ja: "AI をこれから触ってみたい方", en: "New to AI" },
      { ja: "ふだんはあまりコードを書かない方", en: "Rarely write code" },
      { ja: "とにかく何かつくってみたい方", en: "Want to build something" },
    ],
  },
  beyond: {
    lead: {
      ja: "ノリの先にある、設計と実践へ。",
      en: "Past the vibes, into design and practice.",
    },
    body: {
      ja: "Vibe Coding のその先へ。AI を組み込んだプロダクトの設計や、チーム開発で AI を使いこなすための実践知を、現場のエンジニアが深掘りします。",
      en: "Beyond vibe coding: engineers from the field dig into designing products with AI inside, and what it takes for a team to ship with it.",
    },
    forWhom: [
      { ja: "日常的にコードを書いている方", en: "Write code every day" },
      {
        ja: "AI をプロダクトに組み込みたい方",
        en: "Building AI into a product",
      },
      {
        ja: "チームの開発スピードを上げたい方",
        en: "Want your team to ship faster",
      },
    ],
  },
};

/** The theme's two halves, which the four categories split between. */
export const LANES: Record<Lane, { title: string; sub: Localized }> = {
  meet: {
    title: "Meet the Vibes",
    sub: { ja: "入門・ものづくり体験", en: "First steps & making" },
  },
  beyond: {
    title: "Beyond the Vibes",
    sub: { ja: "実践・アーキテクチャ設計", en: "Practice & architecture" },
  },
};

export interface Category {
  /** The track's entry id — the category's name and colour are the track's. */
  track: string;
  lane: Lane;
  /** Drawn beside the name. One of `ICONS` in `_components/icons.ts`. */
  icon: IconName;
}

/** In the order they are drawn. A category whose track is missing is skipped. */
export const CATEGORIES: readonly Category[] = [
  {
    track: "6b6d670c-8d68-4074-8084-98cd72c593e3",
    lane: "meet",
    icon: "wrench",
  },
  {
    track: "0d305acb-ca74-47cc-b74d-057a92eda6a7",
    lane: "meet",
    icon: "sparkles",
  },
  {
    track: "b4cc0eef-4f68-47b3-a5f6-14501199ceff",
    lane: "beyond",
    icon: "code",
  },
  {
    track: "341a35f5-8299-4582-9ca2-3c19a0dfc9ad",
    lane: "beyond",
    icon: "bot",
  },
];

/* -------------------------------------------------------------------------- */
/* News                                                                       */
/* -------------------------------------------------------------------------- */

export interface NewsItem {
  /** `YYYY-MM-DD`. Order does not matter — the list sorts itself. */
  date: string;
  text: Localized;
  /** Optional. An anchor on this page (`#sessions`) or a full URL. */
  href?: string;
}

/** The three most recent are shown near the top of the page. */
export const NEWS: readonly NewsItem[] = [];

/* -------------------------------------------------------------------------- */
/* Speakers                                                                   */
/* -------------------------------------------------------------------------- */

export interface Featured {
  /** The slug of the speaker's page. Skipped if the programme lacks it. */
  slug: string;
  /** One line on why the name matters, drawn from the speaker's own bio. */
  hook: Localized;
  /** Which brand colour frames the portrait. Tokyo's palette has no blue. */
  tone: "green" | "yellow" | "red";
}

/**
 * The carousel under the hero, in this order. Their sessions are the ones
 * badged on the timetable. Every hook should restate something the speaker's
 * published profile already says.
 */
export const FEATURED: readonly Featured[] = [];

/** The featured speaker the carousel opens on, centred. */
export const FEATURED_START = "";

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

export interface Faq {
  q: Localized;
  a: Localized;
}

/**
 * Kansai's (`src/routes/kansai/_content.ts`), at the organisers' request, with
 * the deadline moved to Tokyo's day and the after-party question taken out.
 * Tokyo's theme is not crossing disciplines, so the non-engineers' answer
 * points to Meet the Vibes instead. Tokyo has no booths, so the students'
 * answer is about consent instead; it
 * has no "can't make it" question, and adds one on support in English.
 */
export const FAQ: readonly Faq[] = [
  {
    q: { ja: "参加費はかかりますか？", en: "Is there a fee?" },
    a: {
      ja: "無料です。現地参加・オンライン参加のどちらも参加費はかかりません。現地参加の方には限定グッズを 1 点プレゼントします。",
      en: "No. Both on-site and online attendance are free, and on-site attendees get a gift.",
    },
  },
  {
    q: {
      ja: "エンジニアではありませんが、参加できますか？",
      en: "I'm not an engineer. Can I still come?",
    },
    a: {
      ja: "はい、参加できます。デザイナー、プロダクトマネージャー、ビジネス職の方など、職種や専門を問わず歓迎します。コードを書かない方には、AI でのものづくりを体験できる「Meet the Vibes」のセッションがおすすめです。",
      en: "Yes. Designers, PMs, people in business — whatever your role, you are welcome. If you don't write code, try the Meet the Vibes sessions, where you get to make things with AI.",
    },
  },
  {
    q: { ja: "学生でも参加できますか？", en: "Can students attend?" },
    a: {
      ja: "はい。学年や専攻を問わず参加いただけます。なお、未成年の方は保護者の同意を得たうえでお申し込みください。",
      en: "Yes, whatever your year or field. If you are under 18, please get a parent's or guardian's consent before you register.",
    },
  },
  {
    q: {
      ja: "英語のサポートはありますか？",
      en: "Is there support in English?",
    },
    a: {
      // TODO: 仮の文章。サポートの範囲（通訳・字幕・スタッフ対応など）が決まりしだい差し替える
      ja: "はい。英語でのサポートを用意しています。内容は決まりしだいこのページでお知らせします。",
      en: "Yes, there is support in English. Details will be posted on this page as they are settled.",
    },
  },
  {
    q: {
      ja: "申し込みの締め切りはいつですか？",
      en: "When does registration close?",
    },
    a: {
      ja: "当日 11 月 29 日 18:00 までです。ただし各枠とも先着順のため、定員に達した時点で締め切ります。",
      en: "At 18:00 on November 29, unless a ticket type fills up first — all are first come, first served.",
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Social                                                                     */
/* -------------------------------------------------------------------------- */

/** Each one is left out of the footer while it is empty. */
export const SOCIAL = {
  hashtag: "",
  x: "",
  instagram: "",
};

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The header's links and the menu's, as Kansai has them — sessions (where
 * Kansai has its timetable), speakers, FAQ in the bar; every section in the menu. Worked out here rather
 * than read from the city's config, so a section that is not on the page yet
 * (no news, no FAQ) has no link to it either. Until there is a FAQ, the bar's
 * third link goes to the code of conduct in its place.
 */
export function navigation(lang: Language): {
  bar: NavItem[];
  menu: NavItem[];
} {
  const n = COPY[lang].nav;
  const hasFaq = FAQ.length > 0;
  const faqOrCoc = hasFaq
    ? { href: "#faq", label: n.faq }
    : { href: "#coc", label: n.coc };
  return {
    bar: [
      { href: "#overview", label: n.overview },
      { href: "#sessions", label: n.sessions },
      { href: "#speakers", label: n.speakers },
      faqOrCoc,
    ],
    menu: [
      { href: "#overview", label: n.overview },
      ...(NEWS.length > 0 ? [{ href: "#news", label: n.news }] : []),
      ...(FEATURED.length > 0
        ? [{ href: "#featured", label: n.featured }]
        : []),
      { href: "#sessions", label: n.sessions },
      { href: "#speakers", label: n.speakers },
      { href: "#sponsors", label: n.sponsors },
      ...(hasFaq ? [{ href: "#faq", label: n.faq }] : []),
      { href: "#coc", label: n.coc },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* The page's own labels                                                      */
/* -------------------------------------------------------------------------- */

export const COPY = {
  ja: {
    nav: {
      overview: "開催概要",
      news: "お知らせ",
      featured: "注目スピーカー",
      sessions: "セッション",
      speakers: "スピーカー",
      sponsors: "スポンサー",
      faq: "FAQ",
      coc: "行動規範",
    },
    themeHeading: "テーマ",
    themeFor: "こんな方におすすめ",
    overviewHeading: "開催概要",
    overviewDate: "日時",
    overviewVenue: "会場",
    overviewFee: "参加費",
    overviewMap: "Google マップで会場を見る",
    featuredHeading: "注目のスピーカー",
    prev: "前へ",
    next: "次へ",
    register: "無料で参加登録",
    registerShort: "参加登録",
    newsHeading: "News",
    newsSub: "お知らせ",
    featuredBadge: "注目",
    sessionsHeading: "セッション",
    sessionsNote:
      "※ タイムテーブルは確定後に掲載します。セッション内容、登壇形式は変更となる場合があります。",
    partnersHeading: "共催・協力団体",
    preEventHeading: "Pre-event",
    preEventCta: "詳細・申し込み",
    faqHeading: "FAQ",
    safetyHeading: "Safety",
    cocHeading: "安心して参加いただくために",
    cocLede:
      "GDG では、すべての参加者が安心してナレッジ共有に集中できる環境を重視しています。ハラスメント行為は一切許容されません。会場だけでなく、SNS やブログ等での発信においても行動規範を遵守してください。",
    cocJa: "行動規範（日本語）",
    cocEn: "Code of Conduct (English)",
    menu: "メニュー",
    close: "閉じる",
    footerFollow: "最新情報",
    backToSessions: "セッション一覧",
    backToSpeakers: "スピーカー一覧",
    titleTba: "タイトル調整中",
    minutes: (n: number) => `${n} 分`,
    aboutSub: "セッション概要",
    speakersSub: "登壇者",
    profile: "プロフィールを見る",
    sameTimeSub: "同じ時間帯のセッション",
    sameThemeSub: (track: string) => `${track} のほかのセッション`,
    prevSession: "前のセッション",
    nextSession: "次のセッション",
    trackSub: (track: string) => `${track} の前後`,
    allSessions: "セッション一覧を見る",
    appearancesSub: "登壇するセッション",
    moreSpeakersSub: "ほかのスピーカー",
    allSpeakers: "すべてのスピーカー",
  },
  en: {
    nav: {
      overview: "Overview",
      news: "News",
      featured: "Featured",
      sessions: "Sessions",
      speakers: "Speakers",
      sponsors: "Sponsors",
      faq: "FAQ",
      coc: "Code of Conduct",
    },
    themeHeading: "Theme",
    themeFor: "Good for you if you",
    overviewHeading: "Overview",
    overviewDate: "When",
    overviewVenue: "Where",
    overviewFee: "Admission",
    overviewMap: "See the venue on Google Maps",
    featuredHeading: "Featured speakers",
    prev: "Previous",
    next: "Next",
    register: "Register for free",
    registerShort: "Register",
    newsHeading: "News",
    newsSub: "Latest",
    featuredBadge: "Pick",
    sessionsHeading: "Sessions",
    sessionsNote:
      "The timetable will be published once it is final. Sessions and formats may change.",
    partnersHeading: "Co-hosts & partners",
    preEventHeading: "Pre-event",
    preEventCta: "Details & sign-up",
    faqHeading: "FAQ",
    safetyHeading: "Safety",
    cocHeading: "A safe place for everyone",
    cocLede:
      "GDG events are harassment-free. Please follow the Code of Conduct at the venue and when posting online.",
    cocJa: "行動規範（日本語）",
    cocEn: "Code of Conduct (English)",
    menu: "Menu",
    close: "Close",
    footerFollow: "Follow",
    backToSessions: "All sessions",
    backToSpeakers: "All speakers",
    titleTba: "Title to be announced",
    minutes: (n: number) => `${n} min`,
    aboutSub: "About the session",
    speakersSub: "On stage",
    profile: "View profile",
    sameTimeSub: "Running at the same time",
    sameThemeSub: (track: string) => `More from ${track}`,
    prevSession: "Previous",
    nextSession: "Next",
    trackSub: (track: string) => `Before and after on ${track}`,
    allSessions: "See all sessions",
    appearancesSub: "On the programme",
    moreSpeakersSub: "More speakers",
    allSpeakers: "All speakers",
  },
} satisfies Record<Language, Record<string, unknown>>;

export const copy = (lang: Language) => COPY[lang];
