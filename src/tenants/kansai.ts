import type { TenantConfig } from "./types";

/** DevFest 2026 in Kansai — GDG Greater Kwansai. */
export const kansai = {
  tenant: "kansai",
  theme: "blue",

  lang: "ja",
  locale: "ja_JP",
  title: "DevFest 2026 in Kansai",
  titleEn: "DevFest 2026 in Kansai",
  description:
    "2026年10月18日（日）、大阪国際工科専門職大学で開催。Google AI をはじめとする最新技術と、ファッション・ものづくり・ビジネスなどの異なる専門性が交わるデベロッパーイベントです。参加費無料、現地開催とオンライン配信。",

  tagline: {
    lead: "専門を越えれば、",
    accent: "アイデアは動き出す。",
  },

  event: {
    startsAt: "2026-10-18T11:00:00+09:00",
    endsAt: "2026-10-18T18:00:00+09:00",

    social: { label: "懇親会", start: "18:30", end: "20:30" },

    venue: {
      name: "大阪国際工科専門職大学",
      area: "大阪府大阪市",
      cityEn: "Osaka, Japan",
      city: "大阪",
      region: "関西",
      addressLocality: "大阪市北区",
      addressRegion: "大阪府",
      streetAddress: "梅田3-3-1",
      postalCode: "530-0001",
    },

    format: "現地開催・オンライン配信",
    formatShort: "現地開催 ＋ オンライン配信",
    fee: "無料",
    host: "GDG Greater Kwansai",
    coHosts: "GDGoC IPUT / GDG Kobe / Alpha+Project",
  },

  stats: [
    { value: "3", label: "Tracks", tone: "blue" },
    { value: "16+", label: "Sessions", tone: "green" },
    { value: "7h", label: "Program", tone: "yellow" },
    { value: "Free", label: "Admission", tone: "red" },
  ],

  links: {
    register: "https://gdgkwansai.connpass.com/event/388434/",
    community: "https://gdg.community.dev/gdg-greater-kwansai/",
    connpass: "https://gdgkwansai.connpass.com/",
    cocJa:
      "https://docs.google.com/document/d/19ro-uIGLWc5LqtCb8YUTvYXSwaH-GrdB0Bs9ha4Kw9U/edit",
    cocEn:
      "https://docs.google.com/document/d/1-7LIUn4iy4Dw3YKwVbkSLXKUv0J3g54uTVUFqVXRYuI/edit",
  },

  nav: [
    { href: "#preevent", label: "プレイベント" },
    { href: "#overview", label: "開催概要" },
    { href: "#about", label: "イベントについて" },
    { href: "#timetable", label: "タイムテーブル" },
    { href: "#sessions", label: "セッション" },
  ],

  footerNav: [
    { href: "#preevent", label: "プレイベント" },
    { href: "#overview", label: "開催概要" },
    { href: "#about", label: "イベントについて" },
    { href: "#timetable", label: "タイムテーブル" },
    { href: "#sessions", label: "セッション" },
    { href: "#coc", label: "行動規範" },
    { href: "#register", label: "参加登録" },
  ],

  /*
    Everything the timetable needs that the sessions do not already say. The
    talks place themselves from their own `start`, so what is left here is the
    day around them — and the breaks, which are the one thing that genuinely
    differs per track: the 14:00 slot runs to 14:45 on A and D and to 14:25 on
    B and C, so the break is two rows rather than a special case.

    The last one also closes the day. A session may leave its `end` out and run
    to whatever starts next; something has to state the final boundary, and it
    is always one of these.
  */
  fixtures: [
    { start: "10:00", end: "10:30", label: "開場・受付" },
    { start: "11:25", end: "13:25", label: "昼休憩" },
    { start: "14:25", end: "15:00", label: "休憩", tracks: ["b", "c"] },
    { start: "14:45", end: "15:00", label: "休憩", tracks: ["a", "d"] },
    { start: "16:00", end: "16:20", label: "休憩" },
    { start: "17:10", end: "17:30", label: "休憩" },
    {
      start: "18:30",
      end: "20:30",
      label: "懇親会（予定）",
      note: "登壇者・参加者とのネットワーキング",
    },
  ],
} satisfies TenantConfig;
