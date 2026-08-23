/**
 * Single source of truth for the event.
 *
 * A second city ships its own copy of this file plus a `[data-tenant]` block in
 * `src/styles/tokens.css` — nothing else in the site is city-specific.
 */

export type Tenant = 'kansai' | 'tokyo' | 'shikoku' | 'kyushu';

export const site = {
  /** Selects the token block in tokens.css. 'kansai' is the :root default. */
  tenant: 'kansai' as Tenant,

  lang: 'ja',
  locale: 'ja_JP',
  title: 'DevFest 2026 in Kansai',
  titleEn: 'DevFest 2026 in Kansai',
  description:
    '2026年10月18日（日）、大阪国際工科専門職大学で開催。Google AI をはじめとする最新技術と、ファッション・ものづくり・ビジネスなどの異なる専門性が交わるデベロッパーイベントです。参加費無料、現地開催とオンライン配信。',

  tagline: {
    lead: '専門を越えれば、',
    accent: 'アイデアは動き出す。',
  },

  event: {
    /** Drives the countdown. */
    startsAt: '2026-10-18T11:00:00+09:00',
    endsAt: '2026-10-18T18:00:00+09:00',
    isoDate: '2026-10-18',

    dateLabel: '2026年10月18日',
    dateShort: '10/18',
    monthDay: '10月18日',
    dayOfWeek: '日',
    dayOfWeekEn: 'Sun',
    hours: '11:00 – 18:00',
    hoursCompact: '11:00–18:00',
    countdownLabel: '2026.10.18 SUN 11:00 JST',

    social: {
      label: '懇親会',
      hours: '18:30 – 20:30',
      start: '18:30',
      end: '20:30',
    },

    venue: {
      name: '大阪国際工科専門職大学',
      area: '大阪府大阪市',
      cityEn: 'Osaka, Japan',
      addressLocality: '大阪市北区',
      addressRegion: '大阪府',
      streetAddress: '梅田3-3-1',
      postalCode: '530-0001',
    },

    format: '現地開催・オンライン配信',
    formatShort: '現地開催 ＋ オンライン配信',
    fee: '無料',
    host: 'GDG Greater Kwansai',
    coHosts: 'GDGoC IPUT / GDG Kobe / Alpha+Project',
  },

  stats: [
    { value: '3', label: 'Tracks', tone: 'blue' },
    { value: '16+', label: 'Sessions', tone: 'green' },
    { value: '7h', label: 'Program', tone: 'yellow' },
    { value: 'Free', label: 'Admission', tone: 'red' },
  ] as const,

  links: {
    register: 'https://gdgkwansai.connpass.com/event/388434/',
    community: 'https://gdg.community.dev/gdg-greater-kwansai/',
    connpass: 'https://gdgkwansai.connpass.com/',
    cocJa: 'https://docs.google.com/document/d/19ro-uIGLWc5LqtCb8YUTvYXSwaH-GrdB0Bs9ha4Kw9U/edit',
    cocEn: 'https://docs.google.com/document/d/1-7LIUn4iy4Dw3YKwVbkSLXKUv0J3g54uTVUFqVXRYuI/edit',
  },

  nav: [
    { href: '#preevent', label: 'プレイベント' },
    { href: '#overview', label: '開催概要' },
    { href: '#about', label: 'イベントについて' },
    { href: '#timetable', label: 'タイムテーブル' },
    { href: '#sessions', label: 'セッション' },
  ],

  footerNav: [
    { href: '#preevent', label: 'プレイベント' },
    { href: '#overview', label: '開催概要' },
    { href: '#about', label: 'イベントについて' },
    { href: '#timetable', label: 'タイムテーブル' },
    { href: '#sessions', label: 'セッション' },
    { href: '#coc', label: '行動規範' },
    { href: '#register', label: '参加登録' },
  ],
} as const;

export type Site = typeof site;
