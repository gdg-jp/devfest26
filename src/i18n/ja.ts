/**
 * Every hard-coded UI string on the site, in Japanese.
 *
 * This is the source of truth for shape: `en.ts` is checked against it with
 * `satisfies typeof ja`, so a key added here and forgotten there is a type
 * error, not a silently missing label.
 *
 * Interpolated strings are functions rather than templates with placeholders:
 * there is no placeholder syntax to parse, and a plural or a reordering is
 * just JavaScript. See `src/tenants/eventDates.ts` for the same rule applied
 * to dates.
 */

export const ja = {
  meta: {
    htmlLang: "ja",
    ogLocale: "ja_JP",
    skipToContent: "本文へスキップ",
  },

  /**
   * Typographic conventions that differ between the two languages rather than
   * strings that get translated. Japanese full-width brackets and 読点 carry
   * their own side-bearing, so they need no surrounding spaces; their Latin
   * counterparts do — which is why the spacing lives inside the string.
   */
  common: {
    /** Between names in an inline list. */
    nameSeparator: "、",
  },

  dates: {
    /** `2026年10月18日（日）` — a date with its day of week after it. */
    withDow: (date: string, dow: string) => `${date}（${dow}）`,
    /** The same suffix, sitting between two inline runs of its own. */
    dowSuffix: (dow: string) => `（${dow}）`,
  },

  notFound: {
    session: (slug: string) => `セッション「${slug}」`,
    speaker: (slug: string) => `登壇者「${slug}」`,
    talk: (slug: string) => `トーク「${slug}」`,
    city: (slug: string) => `都市「${slug}」`,
    title: "見つかりません — DevFest 2026 Preview",
    heading: (what: string) => `${what}はここにありません`,
    body: "下書きにまだ無いか、スラッグが変わったか、公開されていない都市のページです。",
    statusLink: "プレビューの状態を見る",
  },

  topbar: {
    homeAria: (siteName: string, onHome: boolean) =>
      `${siteName} — ${onHome ? "ページ先頭へ" : "トップページへ"}`,
    sectionNavAria: "セクションナビゲーション",
    registerCta: "参加登録",
  },

  footer: {
    navAria: "フッターナビゲーション",
  },

  hero: {
    /**
     * No platform name in any of the register labels, here or in `register`
     * and `meetupCard` below.
     *
     * `links.register` is localized — connpass for Japanese, Luma for English
     * — and falls back to the Japanese URL for a city that has only that one.
     * A label naming the destination would therefore be wrong for whichever
     * city had not set the other up yet, and these strings are per-language,
     * not per-city, so there is nowhere to correct it. See `LINKS` in
     * `src/lib/sanity/queries.ts`.
     */
    registerCta: "参加登録",
    sessionsCta: "セッションを見る",
    feeLabel: "参加費",
    preeventBefore: "プレイベント",
    preeventLinkLabel: (no: number) => `DevFest Meetup #${no}`,
    preeventAfter: (date: string, dow: string) =>
      `は ${date}（${dow}）開催、受付中です`,
  },

  countdown: {
    heading: "開催まで",
  },

  overview: {
    heading: "開催概要",
    lede: (region: string, year: string) =>
      `${region}で開催する DevFest ${year}の基本情報です。詳細が固まりしだい順次更新します。`,
    dtDate: "開催日",
    dtHours: "開催時間",
    socialNote: (hours: string, label: string) => `${hours} に${label}を予定`,
    dtVenue: "会場",
    dtFormat: "開催形式",
    dtFee: "参加費",
    dtHost: "主催",
    coHostsNote: (coHosts: string) => `共催・協力：${coHosts}`,
    disclaimer: "※イベント内容や開催時間は、今後変更となる場合があります。",
  },

  preEvents: {
    heading: "プレイベント開催決定！",
    lede: (monthDay: string) =>
      `${monthDay}に向けて、プレイベント「DevFest Meetup」を開催します。当日のテーマを、もう少し小さな輪で先に話しておく回です。DevFest 本編とは別に、それぞれお申し込みが必要です。`,
  },

  about: {
    heading: "イベントについて",
  },

  timetable: {
    heading: "タイムテーブル",
    lede: (trackCount: number, hasTimetable: boolean) =>
      `現在 ${trackCount} トラックでの開催を予定しています。${
        hasTimetable
          ? "確定したセッションから順に掲載しています。"
          : "各セッションの時間割は調整中です。"
      }`,
    tbdHeading: "時間調整中",
    note: "※ タイムテーブルは変更となる場合があります。",
  },

  sessions: {
    heading: "セッション",
    lede: "登壇が確定したセッションをご紹介します。",
    note: "※ セッションタイトル・内容・登壇形式・トラックは、今後変更となる場合があります。確定した情報から順次更新します。",
  },

  whatIsDevFest: {
    heading: "DevFest とは",
    body1:
      "DevFest は、世界各地の Google Developer Groups（GDG）が、それぞれの地域で開催するコミュニティ主導のテクノロジーカンファレンスです。",
    body2:
      "Google のテクノロジーや業界の動向を学べるセッション、実際に手を動かすワークショップ、参加者同士のネットワーキングなどを通じて、技術とコミュニティに出会える場をつくります。",
    body3:
      "開発者だけでなく、プロダクトマネージャー、デザイナー、学生、AI を使ってアプリケーション開発や課題解決に取り組みたい方など、さまざまな方が参加できます。",
  },

  partners: {
    heading: "共催・協力団体",
    lede: (region: string) => `${region}のコミュニティと一緒につくります。`,
  },

  codeOfConduct: {
    heading: "安心して参加いただくために",
    harassmentTitle: "アンチハラスメントポリシー",
    harassmentIntro:
      "ハラスメントとは、性差、性同一性と表現、性的指向、障害、外見や身体的特徴、人種、宗教、公共な場での性的な画像や類する表現、脅迫、ストーカー行為、望まない写真撮影や録音・録画、不適切な接触、およびそれらに関連した不快な言動を含みます。",
    harassmentItems: [
      "GDG では、すべての参加者が安心してナレッジ共有に集中できる環境を重視しています",
      "ハラスメント行為は一切許容されません",
      "不適切な参加目的と判断された場合、参加をお断りすることがあります",
    ] as string[],
    harassmentFooter:
      "また、イベント会場だけでなく、SNS やブログ等での発信においても、上記ポリシーを遵守してください。万が一ハラスメント行為を見聞きした場合は、主催者までご連絡ください。",
    cocTitle: "Code of Conduct",
    cocDesc:
      "GDG では、すべての参加者が楽しく安心して参加できるよう行動規範（Code of Conduct）を定めています。",
    cocJaLabel: "行動規範（日本語）",
    cocEnLabel: "Code of Conduct (English)",
  },

  register: {
    headingLine1: "それぞれの専門を持ち寄って、",
    headingLine2: (monthDay: string, city: string) =>
      `${monthDay}に${city}で。`,
    lede: (title: string) =>
      `技術を深めたい方も、新しい分野の視点に触れたい方も、これから AI を使って何かをつくりたい方も歓迎します。AI と人がともにつくる未来を、${title} で一緒に考えてみませんか。`,
    ctaRegister: "参加登録する",
    ctaCommunity: (host: string) => `${host} について`,
    note: (fee: string) =>
      `現地参加・オンライン参加ともに${fee}です。お申し込みは上のボタンから。`,
  },

  meetupCard: {
    statusOpen: "受付中",
    statusClosed: "受付終了",
    statusDone: "開催済み",
    ctaDefault: "申し込む",
    ctaCompletedDefault: "イベントページを見る",
    factVenue: "会場",
    factCapacity: "定員",
    factFee: "参加費",
    factTime: "時間",
    programHeading: "当日のタイムテーブル",
    programCount: (talkCount: number) =>
      talkCount > 0 ? `（LT ${talkCount} 本 ＋ 懇親会）` : "",
  },

  sessionCard: {
    pendingAbstract: "セッション概要は調整中です。",
  },

  detail: {
    backToList: "← セッション一覧",
    speakersHeading: "登壇者",
    appearancesHeading: "登壇",
    sessionPrefix: "セッション：",
    talksHeading: (count: number) => `このセッションのトーク（${count}）`,
    metaFallback: (title: string, names: string) => `${title}／登壇：${names}`,
    speakerMetaFallback: (name: string, role: string, siteTitle: string) =>
      `${name}（${role}）が ${siteTitle} に登壇します。`,
  },

  portal: {
    title: "DevFest 開催地一覧",
    description:
      "各地の Google Developer Groups が開催する DevFest の一覧です。開催地ごとのページで、セッション・登壇者・タイムテーブルを見られます。",
    introLede:
      "DevFest は、世界各地の Google Developer Groups がそれぞれの地域で開催する、コミュニティ主導のテクノロジーカンファレンスです。開催地を選ぶと、その年のセッションと登壇者を見られます。",
    upcomingHeading: "開催予定",
    pastHeading: "終了したイベント",
    emptyMessage: "開催予定の DevFest はまだ公開されていません。",
    footerBefore:
      "DevFest は Google Developer Groups によるコミュニティイベントです。ブランドとプログラムについては",
    footerAfter: "をご覧ください。",
  },

  eventCard: {
    privateBadge: "非公開",
    externalSiteLabel: "（外部サイト）",
  },

  og: {
    fee: (fee: string) => `参加費${fee}`,
  },
};
