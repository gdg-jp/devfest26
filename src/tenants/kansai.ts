import type { TenantConfig } from "./types";

/** DevFest 2026 in Kansai — GDG Greater Kwansai. */
export const kansai = {
  tenant: "kansai",
  theme: "blue",

  title: "DevFest 2026 in Kansai",
  titleEn: "DevFest 2026 in Kansai",
  description:
    "AI 時代の「考える」を取り戻す。2026年10月18日（日）、大阪・梅田で開催する異分野と越境の AI カンファレンス。Llion Jones、石黒浩、落合陽一ほか 4 トラック・25 以上のセッション。参加費無料、現地開催とオンライン配信。",

  tagline: {
    lead: "AI 時代の",
    accent: "「考える」を取り戻す。",
  },

  event: {
    startsAt: "2026-10-18T10:30:00+09:00",
    endsAt: "2026-10-18T18:00:00+09:00",

    social: { label: "懇親会", start: "18:25", end: "20:25" },

    venue: {
      name: "大阪国際工科専門職大学",
      area: "大阪府大阪市",
      cityEn: "Osaka, Japan",
      city: "大阪",
      region: "関西",
      addressLocality: "大阪市北区",
      addressRegion: "大阪府",
      streetAddress: "梅田3-3-1 梅田総合校舎",
      postalCode: "530-0001",
    },

    format: "現地開催・オンライン配信",
    formatShort: "現地開催 ＋ オンライン配信",
    fee: "無料",
    host: "GDG Greater Kwansai",
    coHosts: "GDGoC IPUT / GDG Kobe / Alpha+Project",
  },

  /*
    Shown in the hero as well as the overview, so these are the four things a
    visitor weighing it up in a few seconds wants: what it costs, how much is
    on, whether others are coming, and whether they have to be there in person.
    The registration count is kept by hand from connpass. With Sanity on,
    these four live on the event document and are edited there instead.
  */
  stats: [
    { value: "Free", label: "Admission", tone: "blue" },
    { value: "25+", label: "Sessions", tone: "green" },
    { value: "460+", label: "Registered", tone: "yellow" },
    { value: "Hybrid", label: "On-site + Online", tone: "red" },
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
    { href: "#timetable", label: "タイムテーブル" },
    { href: "#speakers", label: "スピーカー" },
    { href: "#programs", label: "企画" },
    { href: "#faq", label: "FAQ" },
  ],

  footerNav: [
    { href: "#news", label: "お知らせ" },
    { href: "#featured", label: "注目スピーカー" },
    { href: "#programs", label: "企画" },
    { href: "#timetable", label: "タイムテーブル" },
    { href: "#speakers", label: "スピーカー" },
    { href: "#sponsors", label: "スポンサー" },
    { href: "#faq", label: "FAQ" },
    { href: "#coc", label: "行動規範" },
  ],

  /*
    Everything the timetable needs that the sessions do not already say. The
    talks place themselves from their own `start`, so what is left here is the
    day around them. Tracks B–D open later than A, so most rows name the
    tracks they cover; the rows with no speaker attached (the sponsor slot,
    the runway, the LT) are fixtures because a session has to name someone.
    Times follow the published timetable on connpass.

    The last one also closes the day. A session may leave its `end` out and run
    to whatever starts next; something has to state the final boundary, and it
    is always one of these.
  */
  fixtures: [
    { start: "09:30", end: "10:30", label: "開場・受付", tracks: ["a"] },
    {
      start: "10:40",
      end: "10:45",
      label: "Findy スポンサーセッション",
      tracks: ["a"],
    },
    { start: "10:45", end: "10:55", label: "Fashion runway", tracks: ["a"] },
    { start: "11:25", end: "11:30", label: "写真撮影", tracks: ["a"] },
    { start: "11:30", end: "12:25", label: "昼休憩", tracks: ["a", "b"] },
    { start: "13:30", end: "13:50", label: "休憩", tracks: ["a", "b", "c"] },
    { start: "14:40", end: "15:00", label: "休憩" },
    { start: "16:00", end: "16:20", label: "休憩" },
    { start: "16:50", end: "17:20", label: "調整中", tracks: ["b"] },
    { start: "17:20", end: "17:40", label: "休憩", tracks: ["a", "b", "c"] },
    { start: "17:40", end: "18:05", label: "LT大会", tracks: ["b"] },
    { start: "18:05", end: "18:15", label: "Closing", tracks: ["a", "b", "c"] },
    { start: "18:15", end: "18:25", label: "懇親会会場へ移動", tracks: ["a"] },
    {
      start: "18:25",
      end: "20:25",
      label: "懇親会",
      note: "登壇者・参加者とのネットワーキング",
      tracks: ["a"],
    },
  ],
} satisfies TenantConfig;
