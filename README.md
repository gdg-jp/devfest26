# DevFest 2026 in Kansai

[DevFest 2026 in Kansai](https://gdgkwansai.connpass.com/event/388434/) のイベントページ。
Astro 製の静的サイトで、デザインは [DevFest 2026 Brand Guide](https://devfest.gdg.dev/) に準拠しています。

- 開催日: 2026年10月18日（日）11:00–18:00
- 会場: 大阪国際工科専門職大学（大阪市北区梅田）
- 主催: GDG Greater Kwansai

## 開発

```bash
pnpm install
```

```bash
pnpm dev
```

| コマンド       | 内容                                          |
| :------------- | :-------------------------------------------- |
| `pnpm dev`     | 開発サーバー（http://localhost:4321）         |
| `pnpm build`   | `./dist/` に本番ビルド                        |
| `pnpm preview` | ビルド結果をローカルで確認                    |
| `pnpm check`   | 型・コンテンツスキーマの検証                  |

`pnpm check` は content collections のスキーマ違反も検出するので、コンテンツを触ったら実行してください。

## デプロイ前に必要な設定

`SITE_URL` に本番のオリジンを設定してビルドしてください。canonical URL、Open Graph、JSON-LD の絶対 URL に使われます。**未設定の場合、これらのタグは誤った URL を出さずに省略されます。**

```bash
SITE_URL=https://example.org pnpm build
```

## コンテンツの編集

サイトに出る情報はすべて `src/` の下にあります。HTML を触る必要はありません。

| 編集したいもの                     | ファイル                       |
| :--------------------------------- | :----------------------------- |
| 日時・会場・申込 URL・ナビ・meta    | `src/data/site.ts`             |
| トラック定義とタイムテーブルの枠   | `src/data/tracks.ts`           |
| 登壇者                             | `src/content/speakers/*.md`    |
| セッション                         | `src/content/sessions/*.md`    |
| プレイベント（DevFest Meetup）     | `src/content/meetups/*.md`     |
| 共催・協力団体                     | `src/content/partners/*.md`    |

frontmatter が構造化データ、本文（Markdown）がプロフィールやセッション概要などの散文です。スキーマは `src/content.config.ts` にあります。

### セッションを追加する

```markdown
---
track: a          # a | b | c | unscheduled
order: 7          # トラック内の並び順
title: "セッションタイトル"   # 未定なら省略 → 自動で「TBD」表記
speakers:
  - speaker-slug  # src/content/speakers/<slug>.md
---

セッション概要。本文が空なら「セッション概要は調整中です。」と表示されます。
```

### 登壇者を追加する

写真は `src/assets/speakers/<slug>.jpg` に置き、frontmatter では `photo: <slug>` とファイル名だけを書きます。
写真がない場合は `initial` の1文字がアバターになります。存在しない `photo` を指定するとビルドが失敗します（表示が欠けたまま公開されるのを防ぐため）。

```markdown
---
name: "山田 太郎 氏"
role: "所属／肩書き"
photo: taro-yamada     # 省略可
initial: "山"          # photo がないときのフォールバック
---

プロフィール文。省略可。
```

### プレイベントを追加する

`status` で表示が変わります。`open`（受付中）/ `closed`（受付終了）/ `done`（開催済み）/ `planned`（日程未定・破線のプレースホルダー）。
`open` の回はヒーローの一行告知にも自動で載ります。

## 設計上の決めごと

### ライトテーマ固定・テーマ切り替え

ダーク／ライトの切り替えはしません。代わりに `src/styles/tokens.css` の**テーマレイヤー**（`--t` / `--t-ht` / `--t-pa` / `--t-deep` / `--t-on`）だけを差し替えることで、他都市の DevFest に展開できます。ブランド定数（4色とパステル、Off White、Black 02）は共通で、テーマごとに変わりません。

**テーマ ≠ 都市です。** DevFest のコアカラーは 4 色しかないので、`blue` / `green` / `yellow` / `red` の 4 ブロックがあれば都市がいくつ増えても CSS は増えません。都市側は `src/data/themes.ts` の 4 つから 1 つを選ぶだけです。色を自由入力にしていないのは、いつかブランドガイドにない色が DevFest のページに載るのを防ぐためです。

`--t-deep`（明るい地の上で読めるアクセント色）と `--t-on`（`--t` のベタ面に乗せる文字色）を分けているのが要点で、`--t-deep` は `--ground` に対して、`--t-on` は `--t` 自身に対してコントラストを確保します。黄色だけが `--t-on` を黒にする唯一のテーマです。

切り替えは `src/data/site.ts` の `theme` を変えるだけです。

### 視覚的な重みの配分

ページ内で最も強い面（テナント色のベタ塗り）は**本編の参加登録セクション**に置いています。プレイベントは位置こそ前方（カウントダウン直後）ですが、地は通常色、LT のタイムテーブルは `<details>` で畳んであります。プレイベントが本編より目立つのを避けるための意図的な配分です。

### モーション

`motion` を使用。すべて `prefers-reduced-motion` を尊重します。

| 効果                       | 実装                                              |
| :------------------------- | :------------------------------------------------ |
| ローディング（ブレース）   | `src/scripts/intro.ts`                            |
| スクロールリビール         | `src/scripts/reveal.ts` — `[data-reveal]` / `[data-stagger]` |
| パララックス（ステッカー） | `src/scripts/parallax.ts` — 1240px 超のみ動作       |
| カウントダウン             | `src/scripts/countdown.ts`                        |
| ナビ追従・進捗バー         | `src/scripts/nav.ts`                              |

ローディングは `sessionStorage` で1セッション1回だけ再生します。

**フォールバックについて:** `<head>` のインラインスクリプトが `html.js` を付けた時点でヒーローとリビール対象は不可視になります。バンドルが読み込めなかった場合に備えて同スクリプトが 2.5 秒のタイマーを張り、`html.no-motion` を付けてすべてを強制表示します（`src/scripts/main.ts` が起動時にこれを解除）。JavaScript が無効な環境では最初から何も隠れません。

### ステッカー

DevFest のステッカーシートは 2560×1440 の1枚もので、各グリフは同じシートを別の `viewBox` で切り出しています。名前は `src/data/stickers.ts` にあります（`slashes` `ellipsis` `dot` `plus` `semicolon` `cross` `braces`）。

```astro
<Sticker name="plus" width={66} top="12%" right="2.5%" rotate={-12} speed={0.8} />
```

`speed` がパララックスの係数です。負の値で逆方向に流れます。

## ライセンス

コードは MIT（`LICENSE`）。
DevFest / Google Developer Groups のロゴ、配色、ステッカーは Google LLC に帰属し、DevFest 2026 Brand Guide の条件に従って使用しています。登壇者の写真は各登壇者に帰属します。
