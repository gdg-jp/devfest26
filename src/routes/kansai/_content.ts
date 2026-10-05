import type { Language } from "../../i18n";

/**
 * Everything on the Kansai home page that is written by hand rather than read
 * from the programme: the news, the speakers picked out for the top of the
 * page, sponsors, the FAQ and the page's own wording.
 *
 * It is all in this one file so that whoever is updating the site in the weeks
 * before the event has one place to look. Most edits are a line in `NEWS`,
 * which needs no component touched.
 */

type Localized = Record<Language, string>;

export const localized = (text: Localized, lang: Language) => text[lang];

/* -------------------------------------------------------------------------- */
/* News                                                                       */
/* -------------------------------------------------------------------------- */

export interface NewsItem {
  /** `YYYY-MM-DD`. Order does not matter — the list sorts itself. */
  date: string;
  text: Localized;
  /** Optional. An anchor on this page (`#timetable`) or a full URL. */
  href?: string;
}

/** The three most recent are shown near the top of the page. */
export const NEWS: readonly NewsItem[] = [
  {
    date: "2026-09-29",
    text: {
      ja: "参加登録者数が 460 名を超えました。現地参加は先着 500 名です。",
      en: "Over 460 people have registered. On-site seats are capped at 500.",
    },
    href: "https://gdgkwansai.connpass.com/event/388434/",
  },
  {
    date: "2026-09-29",
    text: {
      ja: "タイムテーブルを更新し、落合陽一氏・今村孝矢氏ほか全登壇者を掲載しました。",
      en: "The timetable is updated with every speaker, including Yoichi Ochiai and Takaya Imamura.",
    },
    href: "#timetable",
  },
  {
    date: "2026-09-29",
    text: {
      ja: "学生展示ブースの出展者を募集しています。",
      en: "Student demo booths are open for applications.",
    },
    href: "https://gdgs.jp/df26form-demo",
  },
  {
    date: "2026-09-28",
    text: {
      ja: "タイムテーブルを公開しました。",
      en: "The timetable is up.",
    },
    href: "#timetable",
  },
];

/* -------------------------------------------------------------------------- */
/* Speakers                                                                   */
/* -------------------------------------------------------------------------- */

export interface Featured {
  /** The slug of the speaker's page. Skipped if the programme lacks it. */
  slug: string;
  /** One line on why the name matters, drawn from the speaker's own bio. */
  hook: Localized;
  /** The hook cut to a name tag's length, for the key visual. */
  short: Localized;
  /** Which of the four brand colours frames the portrait. */
  tone: "blue" | "green" | "yellow" | "red";
}

/**
 * The carousel under the key visual, in this order: Track A's speakers,
 * bar the opening, the sponsor slot and the closing. Their sessions are the
 * ones badged on the timetable. Every hook restates something the speaker's
 * published profile already says — nothing here is ours to claim.
 */
export const FEATURED: readonly Featured[] = [
  {
    slug: "llion-jones",
    tone: "blue",
    hook: {
      ja: "Transformer 論文「Attention Is All You Need」共著者",
      en: 'Co-author of "Attention Is All You Need"',
    },
    short: { ja: "Transformer 共著者", en: "Transformer co-author" },
  },
  {
    slug: "hiroshi-ishiguro",
    tone: "green",
    hook: {
      ja: "アンドロイド研究の第一人者",
      en: "A leading figure in android research",
    },
    short: { ja: "アンドロイド研究", en: "Android researcher" },
  },
  {
    slug: "yoichi-ochiai",
    tone: "red",
    hook: {
      ja: "メディアアーティスト／大阪・関西万博 シグネチャー事業プロデューサー",
      en: "Media artist; Expo 2025 Osaka signature-pavilion producer",
    },
    short: { ja: "メディアアーティスト", en: "Media artist" },
  },
  {
    slug: "heiga",
    tone: "yellow",
    hook: {
      ja: "Google DeepMind 東京拠点リード",
      en: "Tokyo site lead, Google DeepMind",
    },
    short: { ja: "Google DeepMind", en: "Google DeepMind" },
  },
  {
    slug: "takaya-imamura",
    tone: "red",
    hook: {
      ja: "任天堂で『F-ZERO』『スターフォックス』『ゼルダの伝説』に携わったゲームクリエイター",
      en: "Game creator behind F-ZERO, Star Fox and Zelda titles at Nintendo",
    },
    short: {
      ja: "元任天堂 ゲームクリエイター",
      en: "Ex-Nintendo game creator",
    },
  },
  {
    slug: "ikuo-takeuchi",
    tone: "blue",
    hook: {
      ja: "未踏事業 統括 PM／東京大学名誉教授",
      en: "Lead PM of the MITOU programme; professor emeritus, University of Tokyo",
    },
    short: { ja: "未踏 統括 PM", en: "Lead PM, MITOU" },
  },
  {
    slug: "minoru-asada",
    tone: "green",
    hook: {
      ja: "認知発達ロボティクスの第一人者",
      en: "A founder of cognitive developmental robotics",
    },
    short: { ja: "認知発達ロボティクス", en: "Developmental robotics" },
  },
];

/** The featured speaker the carousel opens on, centred. */
export const FEATURED_START = "hiroshi-ishiguro";

/**
 * Seats per ticket type on connpass (現地参加 / オンライン参加), as of
 * 2026-09-30. Capacities, not counts — they only change if the organisers
 * change the event page.
 */
export const CAPACITY = { onsite: 500, online: 200 } as const;

/* -------------------------------------------------------------------------- */
/* Sponsors                                                                   */
/* -------------------------------------------------------------------------- */

export interface Sponsor {
  name: string;
  url: string;
  logo: string;
  /** Intrinsic size of `logo`, so it can be reserved before it loads. */
  width: number;
  height: number;
  note?: Localized;
}

export const SPONSORS: readonly Sponsor[] = [
  {
    name: "Findy株式会社",
    url: "https://findy.co.jp/",
    logo: "https://img.gdgs.jp/ueP38FwZ?w=320&f=webp",
    width: 320,
    height: 373,
  },
  {
    name: "転職ドラフト株式会社",
    url: "https://job-draft.jp/",
    logo: "https://img.gdgs.jp/W8tJx10T?w=640&f=webp",
    width: 640,
    height: 161,
    note: { ja: "ビールスポンサー", en: "Beer sponsor" },
  },
];

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

export interface Faq {
  q: Localized;
  a: Localized;
}

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
      ja: "当日 10 月 18 日 18:00 までです。ただし各枠とも先着順のため、定員に達した時点で締め切ります。",
      en: "At 18:00 on October 18, unless a ticket type fills up first — all are first come, first served.",
    },
  },
  {
    q: { ja: "懇親会はありますか？", en: "Is there an after-party?" },
    a: {
      ja: "18:25 から懇親会を予定しています。登壇者や参加者と直接話せる時間です。",
      en: "Yes, from 18:25 — a chance to talk with the speakers and other attendees.",
    },
  },
];

export const SOCIAL = {
  hashtag: "#DevFestKansai",
  x: "https://x.com/gdgkwansai",
  instagram: "https://www.instagram.com/gdg_greater_kwansai/",
};

/* -------------------------------------------------------------------------- */
/* The page's own wording                                                     */
/* -------------------------------------------------------------------------- */

export const COPY = {
  ja: {
    featuredHeading: "注目のスピーカー",
    factDate: "日時",
    factVenue: "会場",
    venueArea: "大阪・梅田",
    kvBy: "Google Developers 主催",
    kvCatch: [
      "AI 時代の*「考える」*を取り戻す。",
      "*異分野*と*越境*の AI カンファレンス",
    ],
    venueAccess: "JR大阪駅直結",
    venueCampus: "国際工科専門職大学 大阪キャンパス",
    venueShort: "IPUT Osaka",
    organizedBy: "Organized by",
    organizer: "GDG Greater Kwansai",
    prev: "前へ",
    next: "次へ",
    kicker: "異分野と越境の AI カンファレンス",
    catchLead: "AI 時代の",
    catchMark: "「考える」",
    catchTail: "を取り戻す。",
    kvFree: "参加無料",
    kvOnsite: (n: number) => `現地 先着 ${n} 名`,
    kvOnline: "オンライン配信あり",
    kvOnlineShort: "オンラインあり",
    kvMore: (n: number) => `ほか ${n} 名`,
    kvDaysLeft: (n: number) => `あと ${n} 日`,
    kvToday: "本日開催",
    kvAdmission: "入場券",
    kvLineup: "出演",
    kvTicketCta: "参加登録する",
    kvTimetableCta: "タイムテーブルをチェック",
    kvTheme: ["DevFest Kansai", "AI × Robotics", "AI × Fashion", "AI × Game"],
    register: "無料で参加登録",
    registerShort: "参加登録",
    disciplines: ["AI", "Robotics", "Fashion", "Game"],
    marquee: [
      "Gemini",
      "Robotics",
      "Fashion",
      "Game",
      "Agents",
      "Flutter",
      "Web UI",
      "Kubernetes",
      "UX",
      "Product",
      "Android",
      "Cloud",
    ],
    newsHeading: "News",
    newsSub: "お知らせ",
    featuredBadge: "注目",
    timetableNote:
      "※ タイムテーブル、セッション内容、登壇形式は変更となる場合があります。",
    undated: "時間調整中",
    partnersHeading: "共催・協力団体",
    preEventHeading: "Pre-event",
    preEventCta: "詳細・申し込み",
    faqHeading: "FAQ",
    cocHeading: "安心して参加いただくために",
    cocLede:
      "GDG では、すべての参加者が安心してナレッジ共有に集中できる環境を重視しています。ハラスメント行為は一切許容されません。会場だけでなく、SNS やブログ等での発信においても行動規範を遵守してください。",
    cocJa: "行動規範（日本語）",
    cocEn: "Code of Conduct (English)",
    stickyNote: (date: string) => `${date} 開催・参加無料`,
    menu: "メニュー",
    close: "閉じる",
    skipSplash: "スキップ",
    footerFollow: "最新情報",
  },
  en: {
    featuredHeading: "Featured speakers",
    factDate: "Date",
    factVenue: "Venue",
    venueArea: "Umeda, Osaka",
    kvBy: "Hosted by Google Developers",
    kvCatch: [
      "Take back *thinking* in the age of AI.",
      "An AI conference *across disciplines*",
    ],
    venueAccess: "Connected to JR Osaka Station",
    venueCampus: "International Professional University of Technology in Osaka",
    venueShort: "IPUT Osaka",
    organizedBy: "Organized by",
    organizer: "GDG Greater Kwansai",
    prev: "Previous",
    next: "Next",
    kicker: "An AI conference across disciplines",
    catchLead: "Take back ",
    catchMark: "thinking",
    catchTail: " in the age of AI.",
    kvFree: "Free",
    kvOnsite: (n: number) => `${n} seats on site`,
    kvOnline: "Streamed online",
    kvOnlineShort: "Also online",
    kvMore: (n: number) => `+${n} more`,
    kvDaysLeft: (n: number) => `${n} days to go`,
    kvToday: "Today",
    kvAdmission: "Admission",
    kvLineup: "Lineup",
    kvTicketCta: "Get your ticket",
    kvTimetableCta: "Check the timetable",
    kvTheme: ["DevFest Kansai", "AI × Robotics", "AI × Fashion", "AI × Game"],
    register: "Register for free",
    registerShort: "Register",
    disciplines: ["AI", "Robotics", "Fashion", "Game"],
    marquee: [
      "Gemini",
      "Robotics",
      "Fashion",
      "Game",
      "Agents",
      "Flutter",
      "Web UI",
      "Kubernetes",
      "UX",
      "Product",
      "Android",
      "Cloud",
    ],
    newsHeading: "News",
    newsSub: "Latest",
    featuredBadge: "Pick",
    timetableNote: "The timetable, sessions and formats may change.",
    undated: "Time to be confirmed",
    partnersHeading: "Co-hosts & partners",
    preEventHeading: "Pre-event",
    preEventCta: "Details & sign-up",
    faqHeading: "FAQ",
    cocHeading: "A safe place for everyone",
    cocLede:
      "GDG events are harassment-free. Please follow the Code of Conduct at the venue and when posting online.",
    cocJa: "行動規範（日本語）",
    cocEn: "Code of Conduct (English)",
    stickyNote: (date: string) => `${date} · Free`,
    menu: "Menu",
    close: "Close",
    skipSplash: "Skip",
    footerFollow: "Follow",
  },
} satisfies Record<Language, Record<string, unknown>>;

export const copy = (lang: Language) => COPY[lang];
