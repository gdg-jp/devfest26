import type { TenantConfig } from "./types";

/**
 * DevFest 2026 in Tokyo — GDG Tokyo.
 *
 * ⚠ このファイルはひな形です。ここに入っている日付・会場・URL・コピーは
 *   すべて暫定値で、実在の GDG Tokyo の告知内容ではありません。
 *   公開前に必ず主催者が実際の値に差し替えてください（各 TODO 参照）。
 *
 * 差し替えるのはこのファイルと `src/content/tokyo/` の中身だけです。
 * コンポーネント・CSS・スクリプトは一切触りません。
 */
export const tokyo = {
  tenant: "tokyo",
  theme: "red",

  lang: "ja",
  locale: "ja_JP",
  title: "DevFest 2026 in Tokyo",
  // subtitle: "サブタイトルがある場合はここに指定（ヒーローセクションで改行表示されます）",
  titleEn: "DevFest 2026 in Tokyo",
  // subtitleEn: "Subtitle in English",
  // TODO: 実際の開催概要に差し替える
  description:
    "GDG Tokyo が開催する DevFest 2026。Google の最新技術をテーマにしたコミュニティ主催のデベロッパーイベントです。開催日・会場・セッションは調整中です。",

  // TODO: 実際のコピーに差し替える
  tagline: {
    lead: "技術は、集まると",
    accent: "速く進む。",
  },

  event: {
    // TODO: 実際の開催日時に差し替える（暫定値）
    startsAt: "2026-11-15T11:00:00+09:00",
    endsAt: "2026-11-15T18:00:00+09:00",

    social: { label: "懇親会", start: "18:30", end: "20:30" },

    venue: {
      // TODO: 会場が決まりしだい差し替える。住所欄は空のままで構いません
      //       （埋まるまで JSON-LD から住所ごと省略されます）。
      name: "会場調整中",
      area: "東京都",
      cityEn: "Tokyo, Japan",
      city: "東京",
      region: "東京",
    },

    format: "現地開催・オンライン配信",
    formatShort: "現地開催 ＋ オンライン配信",
    fee: "無料",
    host: "GDG Tokyo",
    coHosts: "調整中",
  },

  stats: [
    { value: "—", label: "Tracks", tone: "blue" },
    { value: "—", label: "Sessions", tone: "green" },
    { value: "7h", label: "Program", tone: "yellow" },
    { value: "Free", label: "Admission", tone: "red" },
  ],

  // TODO: GDG Tokyo の URL に差し替える
  links: {
    register: "https://connpass.com/",
    community: "https://gdg.community.dev/",
    connpass: "https://connpass.com/",
    cocJa:
      "https://docs.google.com/document/d/19ro-uIGLWc5LqtCb8YUTvYXSwaH-GrdB0Bs9ha4Kw9U/edit",
    cocEn:
      "https://docs.google.com/document/d/1-7LIUn4iy4Dw3YKwVbkSLXKUv0J3g54uTVUFqVXRYuI/edit",
  },

  // No pre-events yet, so the nav does not offer a link to an empty section.
  nav: [
    { href: "#overview", label: "開催概要" },
    { href: "#about", label: "イベントについて" },
    { href: "#timetable", label: "タイムテーブル" },
    { href: "#sessions", label: "セッション" },
  ],

  footerNav: [
    { href: "#overview", label: "開催概要" },
    { href: "#about", label: "イベントについて" },
    { href: "#timetable", label: "タイムテーブル" },
    { href: "#sessions", label: "セッション" },
    { href: "#coc", label: "行動規範" },
    { href: "#register", label: "参加登録" },
  ],

  /*
    Tokyo has tracks but no sessions with times on them yet, so the timetable is
    still all fixtures — which is the point of keeping them separate: the frame
    of the day can be published long before the programme is. The first row is a
    placeholder standing in for the sessions, and comes out the moment they land;
    leaving it in once a session is scheduled is a build error rather than two
    blocks drawn on top of each other.
  */
  fixtures: [
    { start: "10:30", end: "11:00", label: "開場・受付" },
    {
      start: "11:00",
      end: "18:00",
      label: "セッション（予定）",
      note: "タイムテーブルは確定後に掲載します",
    },
    {
      start: "18:30",
      end: "20:30",
      label: "懇親会（予定）",
      note: "登壇者・参加者とのネットワーキング",
    },
  ],
} satisfies TenantConfig;
