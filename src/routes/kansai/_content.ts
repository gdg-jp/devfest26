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
    heroRegister: "無料で参加登録",
    heroRegisterNote: "オンライン視聴も可",
    heroTimetable: "タイムテーブルを見る",
    newsHeading: "お知らせ",
    newsPast: "過去のお知らせ",
    featuredHeading: "注目スピーカー",
    featuredLede:
      "研究・アート・AI の第一線から。分野を越えた登壇者が、同じ一日に集まります。",
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
    heroRegister: "Register for free",
    heroRegisterNote: "Online viewing available",
    heroTimetable: "View timetable",
    newsHeading: "News",
    newsPast: "Past news",
    featuredHeading: "Featured speakers",
    featuredLede:
      "From the front lines of research, art and AI — speakers from different fields, on the same day.",
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
