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
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What the overview adds to the event document: the date, the venue and the
 * fee come from the city's configuration; how to get there and how many seats
 * there are is said only here, as the connpass page says it.
 */
export const OVERVIEW = {
  /** The line under the venue: where from, then how far — the bigger words. */
  station: { ja: "東京駅から", en: "From Tokyo Station" },
  walk: { ja: "徒歩約 1 分", en: "1-min walk" },
  exit: {
    ja: "JR 丸の内南口の目の前",
    en: "Right across from the Marunouchi South Exit",
  },
  seats: {
    ja: "先着 500 名 ＋ 学生枠 100 名",
    en: "500 seats + 100 for students, first come, first served",
  },
  feeNote: {
    ja: "懇親会は有料です",
    en: "The after-party is paid",
  },
} satisfies Record<string, Localized>;

export type Lane = "meet" | "beyond";

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

/**
 * The two questions that point a visitor to a category. Each answer either
 * asks the next question or names a track (one of `CATEGORIES`).
 */
export interface QuizStep {
  q: Localized;
  answers: { label: Localized; next?: QuizStep; pick?: string }[];
}

export const QUIZ: QuizStep = {
  q: { ja: "ふだん、コードを書きますか？", en: "Do you write code?" },
  answers: [
    {
      label: { ja: "書かない・ほぼ書かない", en: "Rarely or never" },
      next: {
        q: { ja: "AI でやってみたいのは？", en: "What would you do with AI?" },
        answers: [
          {
            label: {
              ja: "毎日の業務をラクにしたい",
              en: "Make my work easier",
            },
            pick: "6b6d670c-8d68-4074-8084-98cd72c593e3",
          },
          {
            label: { ja: "とにかく何か作ってみたい", en: "Build something" },
            pick: "0d305acb-ca74-47cc-b74d-057a92eda6a7",
          },
        ],
      },
    },
    {
      label: { ja: "仕事や趣味で書いている", en: "Yes, at work or for fun" },
      next: {
        q: { ja: "いちばん気になるのは？", en: "What interests you most?" },
        answers: [
          {
            label: { ja: "チームの開発スピード", en: "How fast my team ships" },
            pick: "b4cc0eef-4f68-47b3-a5f6-14501199ceff",
          },
          {
            label: {
              ja: "AI を組み込んだ設計",
              en: "Designing with AI inside",
            },
            pick: "341a35f5-8299-4582-9ca2-3c19a0dfc9ad",
          },
        ],
      },
    },
  ],
};

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
      ja: "もちろんです。デザイナー、プロダクトマネージャー、研究者、ビジネス職の方、ファッションやものづくりに関わる方など、専門を問わず歓迎します。異分野との越境が今年のテーマです。",
      en: "Of course. Designers, PMs, researchers, people in business, fashion or making — everyone is welcome. Crossing disciplines is this year's theme.",
    },
  },
  {
    q: { ja: "学生でも参加できますか？", en: "Can students attend?" },
    a: {
      ja: "はい。学年や専攻を問わず参加いただけます。学生展示ブースや学生エンジニア座談会など、学生向けの企画もあります。",
      en: "Yes, whatever your year or field. There are student demo booths and a student roundtable too.",
    },
  },
  {
    q: {
      ja: "会場に行けない場合は？",
      en: "What if I can't make it to the venue?",
    },
    a: {
      ja: "オンライン配信があります。connpass で「オンライン参加」の枠を選んでお申し込みください。",
      en: "The event is streamed online. Choose the online ticket on connpass.",
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
    overviewHeading: "開催概要",
    overviewDate: "日時",
    overviewVenue: "会場",
    overviewFee: "参加費",
    overviewMap: "Google マップで会場を見る",
    quizLead: "迷ったら 2 問でチェック",
    quizStep: (n: number, of: number) => `Q${n} / ${of}`,
    quizPicked: "あなたにおすすめ",
    quizResult: (name: string) => `おすすめは「${name}」`,
    quizAgain: "もう一度",
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
    overviewHeading: "Overview",
    overviewDate: "When",
    overviewVenue: "Where",
    overviewFee: "Admission",
    overviewMap: "See the venue on Google Maps",
    quizLead: "Not sure where to start? Two questions",
    quizStep: (n: number, of: number) => `Q${n} / ${of}`,
    quizPicked: "Your pick",
    quizResult: (name: string) => `Try ${name}`,
    quizAgain: "Start over",
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
