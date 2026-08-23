import type { TenantConfig } from './types';

/** DevFest 2026 in Kansai — GDG Greater Kwansai. */
export const kansai = {
  tenant: 'kansai',
  theme: 'blue',

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
    startsAt: '2026-10-18T11:00:00+09:00',
    endsAt: '2026-10-18T18:00:00+09:00',

    social: { label: '懇親会', start: '18:30', end: '20:30' },

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
  ],

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

  tracks: [
    {
      id: 'a',
      label: 'Track A｜メイン・トーク',
      sub: '技術セッション・パネルディスカッション',
      color: 'var(--blue)',
      textColor: 'var(--blue)',
    },
    {
      id: 'b',
      label: 'Track B｜ハンズオン・トーク',
      sub: 'Google AI・生成AI ハンズオン',
      color: 'var(--green)',
      textColor: 'var(--green)',
    },
    {
      id: 'c',
      label: 'Track C｜ハンズオン・トーク',
      sub: 'LT・コミュニティセッション',
      color: 'var(--yellow)',
      textColor: '#8a5a00',
      darkInk: true,
    },
    {
      id: 'unscheduled',
      label: 'Track・時間調整中',
      sub: 'トラックと時間が決まりしだい移動します',
      color: 'var(--surface)',
      textColor: 'var(--muted)',
      pending: true,
    },
  ],

  timetable: [
    {
      start: '11:00',
      end: '– 18:00',
      lines: [
        { label: 'Track A｜メイン・トーク', note: '技術セッション・パネルディスカッション（予定）', rail: 'var(--blue)' },
        { label: 'Track B｜ハンズオン・トーク', note: 'Google AI・生成AI ハンズオン（予定）', rail: 'var(--green)' },
        { label: 'Track C｜ハンズオン・トーク', note: 'LT・コミュニティセッション（予定）', rail: 'var(--yellow)' },
      ],
    },
    {
      start: '18:30',
      end: '– 20:30',
      lines: [{ label: '懇親会（予定）', note: '登壇者・参加者とのネットワーキング', rail: 'var(--red)' }],
    },
  ],
} satisfies TenantConfig;
