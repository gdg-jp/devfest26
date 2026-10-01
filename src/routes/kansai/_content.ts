import type { Language } from "../../i18n";

/**
 * Everything on the Kansai home page that is written by hand rather than read
 * from the programme: the news, the speakers picked out for the top of the
 * page, the FAQ, how to reach the venue, and the page's own wording.
 *
 * It is all in this one file so that whoever is updating the site in the week
 * before the event has one place to look. Most edits are a line in `NEWS` or a
 * number in the city's `stats`; neither needs a component touched.
 */

type Localized = Record<Language, string>;

export interface NewsItem {
  /** `YYYY-MM-DD`. Newest first is not required — the list sorts itself. */
  date: string;
  text: Localized;
  /** Optional. An anchor on this page (`#timetable`) or a full URL. */
  href?: string;
}

/**
 * News, newest first on the page. The three most recent are shown; the rest
 * fold away under "past news".
 */
export const NEWS: readonly NewsItem[] = [
  {
    date: "2026-09-28",
    text: {
      ja: "参加登録者数が 450 名を超えました。現地参加は先着順です。",
      en: "Over 450 people have registered. On-site seats are first come, first served.",
    },
  },
  {
    date: "2026-09-28",
    text: {
      ja: "タイムテーブルを公開中です。セッション概要は決まりしだい順次掲載します。",
      en: "The timetable is up. Session details are added as they are confirmed.",
    },
    href: "#timetable",
  },
];

/**
 * Speakers shown large right under the hero, in this order, by the slug of
 * their speaker page. A slug with no speaker behind it is skipped rather than
 * failing the build, so a name can be listed here before its entry is
 * published. Their sessions are also the ones badged on the timetable.
 */
export const FEATURED_SPEAKERS: readonly string[] = [
  "hiroshi-ishiguro",
  "yoichi-ochiai",
  "llion-jones",
];

export interface Faq {
  q: Localized;
  a: Localized;
}

export const FAQ: readonly Faq[] = [
  {
    q: {
      ja: "参加費はかかりますか？",
      en: "Is there a fee?",
    },
    a: {
      ja: "無料です。現地参加・オンライン参加のどちらも参加費はかかりません。",
      en: "No. Both on-site and online attendance are free.",
    },
  },
  {
    q: {
      ja: "エンジニアではありませんが、参加できますか？",
      en: "I'm not an engineer. Can I still come?",
    },
    a: {
      ja: "もちろんです。デザイナー、プロダクトマネージャー、研究者、ビジネス職の方など、専門を問わず歓迎します。「専門を越える」が今年のテーマです。",
      en: "Of course. Designers, product managers, researchers, people in business — everyone is welcome. Crossing disciplines is this year's theme.",
    },
  },
  {
    q: {
      ja: "学生でも参加できますか？",
      en: "Can students attend?",
    },
    a: {
      ja: "はい。学年や専攻を問わず参加いただけます。",
      en: "Yes, whatever your year or field of study.",
    },
  },
  {
    q: {
      ja: "会場に行けない場合は？",
      en: "What if I can't make it to the venue?",
    },
    a: {
      ja: "オンライン配信があります。参加登録ページで「オンライン参加」の枠を選んでお申し込みください。",
      en: "The event is streamed online. Choose the online ticket on the registration page.",
    },
  },
  {
    q: {
      ja: "申し込みの締め切りはいつですか？",
      en: "When does registration close?",
    },
    a: {
      ja: "当日 18:00 までです。ただし各枠とも先着順のため、定員に達した時点で締め切ります。",
      en: "At 18:00 on the day, unless a ticket type fills up first — all are first come, first served.",
    },
  },
  {
    q: {
      ja: "懇親会はありますか？",
      en: "Is there an after-party?",
    },
    a: {
      ja: "18:30 から懇親会を予定しています。登壇者や参加者と直接話せる時間です。",
      en: "Yes, from 18:30 — a chance to talk with the speakers and other attendees.",
    },
  },
];

/** How to get there, one line each. The address comes from the city config. */
export const ACCESS: readonly Localized[] = [
  {
    ja: "JR「大阪」駅・各線「梅田」駅から徒歩圏内",
    en: "Walking distance from JR Osaka Station and the Umeda stations",
  },
];

/** The page's own wording — what the shared i18n files have no place for. */
export const COPY = {
  ja: {
    /*
      The top bar's own nav, in the order the page runs. Written here rather
      than read from the city's `nav`, which is edited in Sanity and still
      names sections this page no longer has.

      What earns a place is a destination somebody would otherwise have to
      hunt for. The speakers and the timetable are what they came to see; the
      news is what changes; Why is the case for the day. Access and the FAQ are
      here because they are the last two questions before registering and they
      sit furthest down the page, which is the worst place to have to scroll
      to. About is deliberately left out — it says the same kind of thing as
      Why, one section away from it, and two entries for that would only make
      the bar harder to read. The fuller list stays in the footer.
    */
    nav: [
      { href: "#news", label: "お知らせ" },
      { href: "#featured", label: "登壇者" },
      { href: "#timetable", label: "タイムテーブル" },
      { href: "#why", label: "Why DevFest" },
      { href: "#access", label: "アクセス" },
      { href: "#faq", label: "FAQ" },
    ],
    /*
      The footer's list, which is the header's plus the destinations that did
      not earn a place in a bar that also carries a register button. Same
      reason as `nav` for not reading the city's: that one is edited in Sanity
      and still points at `#preevent`, a section this page does not render.
    */
    footerNav: [
      { href: "#news", label: "お知らせ" },
      { href: "#featured", label: "登壇者" },
      { href: "#timetable", label: "タイムテーブル" },
      { href: "#about", label: "イベントについて" },
      { href: "#why", label: "Why DevFest" },
      { href: "#access", label: "会場・アクセス" },
      { href: "#faq", label: "よくある質問" },
      { href: "#partners", label: "共催・協力団体" },
      { href: "#coc", label: "行動規範" },
      { href: "#register", label: "参加登録" },
    ],
    heroRegister: "無料で参加登録",
    heroRegisterNote: "現地参加は先着順。定員に達しだい締め切ります。",
    heroTimetable: "タイムテーブルを見る",
    heroLede:
      "AI、ロボティクス、ものづくり、ビジネス。異なる専門の第一線が、大阪に一日だけ集まります。",
    heroDateLabel: "開催日",
    statSessions: "セッション",
    statTracks: "トラック",
    statSpeakers: "登壇者",
    statFee: "参加費",
    speakersHeading: "登壇者",
    speakersLede: (count: number) =>
      `研究・AI・ものづくりの第一線から ${count} 名。分野を越えた登壇者が、同じ一日に集まります。`,
    carouselPrev: "前の登壇者へ",
    carouselNext: "次の登壇者へ",
    accessEyebrow: "Access",
    accessHeading: "会場・アクセス",
    accessHosted: "主催",
    accessCoHosted: "共催・協力",
    whyEyebrow: "Why DevFest",
    whyHeading: "この一日で、何が手に入るか。",
    whyLede:
      "DevFest は Google Developer Groups が世界中で開く、その年いちばん大きな技術カンファレンスです。関西では、こう組みました。",
    why: [
      {
        no: "01",
        tone: "blue",
        h: "分野の外側にいる人の話が、聞ける。",
        p: "「Attention Is All You Need」共著者の Llion Jones 氏、アンドロイド研究の第一人者・石黒浩氏、認知発達ロボティクスの浅田稔氏。自分では選ばなかったはずの話に、たまたま出会える設計にしています。",
      },
      {
        no: "02",
        tone: "green",
        h: "一日で、必要なところだけ拾える。",
        p: "4 トラックが並行して走ります。基調講演からハンズオンまで、興味のある回だけを選んでも一日ぶんの密度があります。タイムテーブルは公開済みです。",
      },
      {
        no: "03",
        tone: "yellow",
        h: "無料で、来られなくても参加できる。",
        p: "現地参加もオンライン視聴も参加費はかかりません。学生も、エンジニアでない方も歓迎です。18:30 からは登壇者と直接話せる懇親会もあります。",
      },
    ],
    newsHeading: "お知らせ",
    newsPast: "過去のお知らせ",
    featuredCta: "全セッションを見る",
    featuredBadge: "注目",
    tabsAria: "トラックを選ぶ",
    accessMap: "Google マップで開く",
    faqHeading: "よくある質問",
    preEvent: (title: string, date: string) =>
      `プレイベント「${title}」を ${date} に開催します。`,
    preEventCta: "詳細・申し込み",
    closingHeading: (monthDay: string) => `${monthDay}、会場で会いましょう。`,
    closingLede:
      "参加費は無料です。会場に来られない方も、オンライン配信で参加できます。",
    closingNote: "各枠とも先着順です。定員に達しだい締め切ります。",
    stickyNote: (date: string) => `${date} 開催`,
  },
  en: {
    nav: [
      { href: "#news", label: "News" },
      { href: "#featured", label: "Speakers" },
      { href: "#timetable", label: "Timetable" },
      { href: "#why", label: "Why DevFest" },
      { href: "#access", label: "Access" },
      { href: "#faq", label: "FAQ" },
    ],
    footerNav: [
      { href: "#news", label: "News" },
      { href: "#featured", label: "Speakers" },
      { href: "#timetable", label: "Timetable" },
      { href: "#about", label: "About" },
      { href: "#why", label: "Why DevFest" },
      { href: "#access", label: "Venue & access" },
      { href: "#faq", label: "FAQ" },
      { href: "#partners", label: "Partners" },
      { href: "#coc", label: "Code of Conduct" },
      { href: "#register", label: "Register" },
    ],
    heroRegister: "Register for free",
    heroRegisterNote: "On-site seats are first come, first served.",
    heroTimetable: "View timetable",
    heroLede:
      "AI, robotics, manufacturing, business — the front line of each, in Osaka for one day.",
    heroDateLabel: "Date",
    statSessions: "Sessions",
    statTracks: "Tracks",
    statSpeakers: "Speakers",
    statFee: "Admission",
    speakersHeading: "Speakers",
    speakersLede: (count: number) =>
      `${count} speakers from the front line of research, AI and making — different fields, one day.`,
    carouselPrev: "Previous speakers",
    carouselNext: "Next speakers",
    accessEyebrow: "Access",
    accessHeading: "Venue & access",
    accessHosted: "Host",
    accessCoHosted: "Co-hosts",
    whyEyebrow: "Why DevFest",
    whyHeading: "What one day here gets you.",
    whyLede:
      "DevFest is the biggest technology conference Google Developer Groups run each year, all over the world. Here is how Kansai put this one together.",
    why: [
      {
        no: "01",
        tone: "blue",
        h: "Hear from people outside your field.",
        p: "Llion Jones, co-author of “Attention Is All You Need”. Hiroshi Ishiguro, the leading figure in android research. Minoru Asada on cognitive developmental robotics. The day is built so you run into the talk you would never have picked.",
      },
      {
        no: "02",
        tone: "green",
        h: "Take only what you need, in a day.",
        p: "Four tracks run in parallel, from keynotes to hands-on. Pick only the sessions you care about and the day is still full. The timetable is already up.",
      },
      {
        no: "03",
        tone: "yellow",
        h: "Free, and open to you even if you can't come.",
        p: "Neither on-site nor online attendance costs anything. Students are welcome, and so is anyone who isn't an engineer. From 18:30 there's an after-party where you can talk to the speakers directly.",
      },
    ],
    newsHeading: "News",
    newsPast: "Past news",
    featuredCta: "View all sessions",
    featuredBadge: "Pick",
    tabsAria: "Choose a track",
    accessMap: "Open in Google Maps",
    faqHeading: "FAQ",
    preEvent: (title: string, date: string) =>
      `Pre-event "${title}" is on ${date}.`,
    preEventCta: "Details & sign-up",
    closingHeading: (monthDay: string) => `See you there on ${monthDay}.`,
    closingLede:
      "Admission is free. If you can't come in person, join the online stream.",
    closingNote: "All tickets are first come, first served.",
    stickyNote: (date: string) => date,
  },
} satisfies Record<Language, Record<string, unknown>>;

export const copy = (lang: Language) => COPY[lang];

export const localized = (text: Localized, lang: Language) => text[lang];
