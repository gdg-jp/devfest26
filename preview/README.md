# DevFest 2026 下書きプレビュー

Sanity の **draft**（未公開の下書き）を含んだサイトを、GDG 関係者だけが見られる URL で配信するための Cloudflare Worker です。

本番の GitHub Pages とは完全に別の環境です。GitHub Pages は静的ファイルを誰にでも配るだけでリクエスト時に何も判断できないので、下書きを置く先としては使えません。ここが下書きの唯一の置き場所であり、`SANITY_READ_TOKEN` を渡してよい唯一の環境です。

## 何が動いているか

**リクエストのたびに Sanity を読んでレンダリングします。** ビルド時に焼き込むのではないので、Studio で保存してリロードすれば、それが出ます。デプロイは要りません。

```text
リクエスト
  └─ ゲート  src/index.ts                    ← run_worker_first で全部ここに来る
       ├─ 未サインイン → 302 /auth/login
       ├─ 非メンバー   → 403
       └─ 通過 → @astrojs/cloudflare
                   ├─ /_astro/*, /og/* … → ASSETS（サイトのクライアントビルド）
                   └─ ページ → SSR → Sanity（drafts）を今読む
```

Worker は 1 つです。`wrangler.jsonc` の `main` がゲートを指していて、アダプタは `main` が空のときだけ自分のエントリを入れるので、こう書くだけでゲートが前に立ちます。**この順番でなければいけません** — アダプタのハンドラは静的アセットを自分で返してしまうので、Astro のミドルウェアに置いたゲートは `/kansai/_astro/*.css` を素通りさせます。

サイト側のコードで下書き対応をしているのは 3 ファイルだけです。

- [`src/preview/mode.ts`](../src/preview/mode.ts) — どちらのモードか。ビルド時に定数へ置き換わるので、本番ビルドにプレビュー用の分岐は 1 行も残りません
- [`src/preview/drafts.ts`](../src/preview/drafts.ts) — **1 レンダー = Sanity へ 1 往復**。全コレクションと全都市の `event` を 1 本の GROQ にまとめて取り、既存のマッパーと既存の zod スキーマにそのまま通します
- [`src/preview/problems.ts`](../src/preview/problems.ts) — 本番ビルドなら落ちる不備を、記録してそのカードだけ落とす

## 誰が見られるか

GDG Accounts の userinfo が返す `https://gdgs.jp/claims/chapters` が**空でなければ**閲覧できます。

```json
[
  { "chapterId": 3, "chapterSlug": "gdgoc-osaka", "role": "organizer" },
  { "chapterId": 1, "chapterSlug": "gdg-kwansai", "role": "member" }
]
```

配列が空、あるいは claim 自体が無いアカウントは「GDG メンバーとして未承認」とみなし、403 を返します（サインアウトして入り直す導線付き）。特定のチャプターや `role: "organizer"` に絞りたくなったら、`src/index.ts` の `isMember` を変えるだけです。

所属は**サインイン時点のスナップショット**です。サインイン後にチャプターへ追加された人は、サインアウトして入り直すか、セッション（8 時間）が切れるまで未承認のままになります。

## 書きかけでも表示されます

下書きプレビューは「書きかけを見るための場所」なので、書きかけで 500 になっては意味がありません。本番ビルドが落ちる次のような状態でも、ページは出ます。

- 登壇者もトークも設定されていないセッション
- 都市をまたいだ参照、消えた参照
- スラッグの衝突
- `event` ドキュメントの必須項目が埋まっていない都市
- スキーマに合わないドキュメント

**該当するカードだけが消え、理由が画面下のバーに出ます。** バーは [`/preview/status`](../src/preview/status.ts) を読んでいて、そこは全都市のプログラムを実際に組み立ててから答えるので、「今のページに出ていないもの」ではなく「今の下書きで出せないもの全部」が並びます。JSON をそのまま見ることもできます。

本番ビルド側の挙動は 1 ミリも変わっていません。同じ不備は `build.yml` でこれまでどおりそのジョブを赤くし、その都市の公開済みページはそのまま残ります。

## Presentation — 見ながら書く

`/studio` を開くと、**左に編集フォーム、右にプレビュー**という 1 画面になります（Sanity Presentation）。ページの本文をクリックすると左の該当フィールドに飛び、入力の手が止まると右が更新されます（`src/preview/visualEditing.ts` の `QUIET_MS`）。

```text
https://<プレビューの URL>/studio     ← Studio。ゲートの内側
  └─ 「プレビュー」タブ
       ├─ 左: 編集フォーム
       └─ 右: <iframe src="https://<プレビューの URL>/kansai">
```

### なぜ Studio がここにも居るのか

**同一オリジンでなければ iframe が開けないからです。** セッションは `SameSite=Lax` の cookie で、ブラウザは別サイトに埋め込まれた frame からのリクエストにはそれを送りません。`devfest26.sanity.studio` からだと frame の中は毎回 `/auth/login` への 302 になり、GDG Accounts は frame 内に表示できないので、プレビュー枠は真っ白のままになります（`SameSite=None` にしても Safari は third-party cookie 自体を拒否します）。

そこで、同じコミットの同じ `studio/` を、このプレビューのオリジンにも `/studio` として配ります。オリジンが同じなので cookie はそのまま流れ、ゲートが Studio ごと守ります。詳細は [`src/index.ts`](src/index.ts) の `serveStudio` に書いてあります。

- **`devfest26.sanity.studio` はこれまでどおり**です。書くだけなら今までどおりそちらで構いません。Presentation タブはプレビュー側にしか出ません（あちらに出しても壊れているだけなので）
- **`/studio` は予約パスになります。** スラッグが `studio` の `event` を作ると、その都市のページはゲートに食われて表示されません。`portal` と同じ扱いです
- `/studio/static/*` だけは `Cache-Control: private, max-age=31536000, immutable` です。中身はファイル名にハッシュの入った JavaScript だけで、下書きは 1 バイトも含まれません（下書きは後から API 越しに、閲覧者自身の Sanity 権限で届きます）。それ以外のレスポンスは今までどおり `no-store` です

### クリック編集が効く範囲

文字列に不可視文字を埋め込む仕組み（stega）なので、**文字だけ**です。画像と参照（トラック、登壇者の紐付け）はクリックしても反応しません — 左のフォームから編集してください。

埋め込む対象は [`src/preview/stega.ts`](../src/preview/stega.ts) の許可リストで決まっています。全部に埋めてしまうと、`initial`（2 文字まで）や `stats[].tone`・`rail`（選択肢）のような「検証される文字列」が壊れ、そのドキュメントがプレビューから消えます。**Studio に新しいフィールドを足しても自動では対象になりません** — 本文として読ませたいなら、そのファイルの `ENCODABLE` に名前を足してください。

### CORS の登録（初回だけ）

[sanity.io/manage](https://www.sanity.io/manage) → 対象プロジェクト → **API** → **CORS origins** に、プレビューのオリジンを **Allow credentials を有効にして**追加します。これが無いと `/studio` の Studio が Sanity にログインできません。

## セットアップ

初回だけ、この順番で進めます。**先に Worker をデプロイして、それが表示する URL を GDG Accounts に登録する**流れです（Worker の URL は登録前には分からないため）。

### 1. Sanity の読み取りトークンを作る

[sanity.io/manage](https://www.sanity.io/manage) の対象プロジェクト → **API** → **Tokens** で、**Viewer** 権限のトークンを 1 つ発行します。

### 2. GitHub 側を設定する

リポジトリの Settings で、`preview` という名前の Environment を作り、そこに以下を登録します。

| 種別     | 名前                    | 値                                                                     |
| -------- | ----------------------- | ---------------------------------------------------------------------- |
| Secret   | `SANITY_READ_TOKEN`     | 手順 1 のトークン                                                      |
| Secret   | `CLOUDFLARE_API_TOKEN`  | Cloudflare の API トークン（テンプレート **Edit Cloudflare Workers**） |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare のアカウント ID                                             |
| Variable | `PREVIEW_URL`           | 手順 3 で分かる Worker の URL（最初は空でも構いません）                |

`SANITY_PROJECT_ID` と `SANITY_DATASET` は本番ビルドと同じリポジトリ変数をそのまま使います。ワークフローが `wrangler deploy --var` で Worker に渡します。

> `PREVIEW_URL` は `SITE_URL` としてビルドに渡り、canonical / OG / JSON-LD の絶対 URL になります。未設定でもビルドは通り、絶対 URL が省略されるだけです。

### 3. 一度デプロイする

Actions から **Preview** ワークフローを手動実行します。完了すると `https://devfest26-preview.<サブドメイン>.workers.dev` が立ち上がり、**「設定が未完了です」というページが表示されます**。このページに、足りない設定の名前と、次の手順で登録すべき URL がそのまま印字されています。

### 4. GDG Accounts に OIDC クライアントを登録する

手順 3 のページに出た値で、GDG Accounts に新しいクライアントを 1 つ登録します。

| 項目                     | 値                                                     |
| ------------------------ | ------------------------------------------------------ |
| Redirect URI             | `https://<Worker の URL>/auth/callback`                |
| Post-logout redirect URI | `https://<Worker の URL>/`                             |
| Scopes                   | `openid email profile https://gdgs.jp/scopes/chapters` |

**`https://gdgs.jp/scopes/chapters` を必ず含めてください。** これが無いと chapters claim が返らず、全員が未承認として扱われます。

### 5. クライアント情報を Worker に設定する

クライアント ID は公開情報（認可 URL に載ります）なので [`wrangler.jsonc`](wrangler.jsonc) の `vars.IDP_CLIENT_ID` に書いてコミットします。シークレットの 2 つは Cloudflare 側にだけ置きます。

```bash
pnpm exec wrangler secret put IDP_CLIENT_SECRET --name devfest26-preview
```

```bash
pnpm exec wrangler secret put SESSION_SECRET --name devfest26-preview
```

`SESSION_SECRET` はセッション cookie を暗号化する鍵で、32 バイト以上のランダム値にしてください。

```bash
openssl rand -base64 32
```

この 2 つは `wrangler deploy` で消えないので、CI が触ることはありません。値を差し替えると全員が即座にサインアウトされます — 緊急時のレバーです。

`SANITY_READ_TOKEN` だけは扱いが違い、**ワークフローが毎回 `wrangler secret put` で入れ直します**。もともと `preview` Environment にある値なので、置き場所を 2 つに増やさず、ローテーションも GitHub 側だけで済ませるためです。

### 6. 再デプロイする

`main` に push すればワークフローが走り、設定済みの Worker に入れ替わります。

## 更新されるタイミング

**下書きの内容は、デプロイを待ちません。** リクエストのたびに読み直すので、Studio で保存してリロードすれば出ます。デプロイが要るのは**コードが変わったとき**だけです。

- `main` への push
- Actions からの手動実行
- `content-draft` という `repository_dispatch`

3 つめは Sanity の GROQ-powered webhook（**Drafts を対象に含める**設定）を `https://api.github.com/repos/gdg-jp/devfest26/dispatches` に向けて `{"event_type": "content-draft"}` を POST させるものです。SSR になった今は必須ではなくなりました（受け口は残してあります）。本番の webhook (`content-published`) とは別のイベント名にしてください。

## ローカルで動かす

リポジトリのルートから、1 コマンドです。

```bash
pnpm preview:dev
```

これはゲートを含めた Worker そのものを起動します（`@cloudflare/vite-plugin` が `wrangler.jsonc` の `main` を使うため）。事前に `preview/.dev.vars` を用意してください。

```bash
cp preview/.dev.vars.example preview/.dev.vars
```

ビルドしたものを本物の workerd で動かしたいときは、

```bash
pnpm preview:build
```

```bash
cp preview/.dev.vars dist/all/server/.dev.vars
```

```bash
pnpm exec wrangler dev -c dist/all/server/wrangler.json
```

`wrangler` は設定ファイルの隣で `.dev.vars` を探すので、コピーが要ります（`dist/` は gitignore 済みです）。こちらなら `/studio` も本番と同じ形で確認できます — ただし Studio が Sanity に繋がるには、そのオリジン（`http://localhost:4321`）を CORS origins に足す必要があります。足していなければ Studio は「Connect this Studio to your project」を表示します。

覚えておくと楽なこと。

- **`SANITY_READ_TOKEN` はローカルでは省略できます。** 省略すると公開済みの内容が表示され、画面下のバーが赤くなってそう言います。デプロイ先では省略できません（後述）
- HMR は効きます。`run_worker_first` を `true` ではなく配列で書き、Vite が使う 5 つの名前空間（`/@vite/*`、`/@id/*`、`/@fs/*`、`/src/*`、`/node_modules/*`）を除外しているためです。`true` のままだと Worker が全部を受けてしまい、スタイルもスクリプトも 1 つも届きません
- **サインインはローカルでもできます。** GDG Accounts に `http://localhost:4321/auth/callback` が redirect URI として登録済みなら、ブラウザでそのまま通れます
- **Presentation をローカルで試すときは、Studio を別ポートで立てます。** `studio/` で `pnpm dev`（:3333）を動かし、`studio/.env` に `SANITY_STUDIO_PREVIEW_ORIGIN=http://localhost:4321`、`preview/.dev.vars` に `SANITY_STUDIO_URL=http://localhost:3333` を書きます。`localhost` 同士は同一サイト扱いなので、ここでは cookie の問題は起きません。`/studio` はローカルには無く（Studio ビルドを同梱していないため）、開くとその旨のページが出ます

## 覚えておくこと

- **本番の [`build.yml`](../.github/workflows/build.yml) に `SANITY_READ_TOKEN` を足さないでください。** あのワークフローにトークンが無いことが、下書きが公開サイトに出ない唯一の保証です
- **トークンはブラウザに届きません。** Worker の中でサーバコードが読み、外に出るのは HTML だけです
- **読み取りトークンが無い Worker は、サイトを配信せず設定ページを返します。** 下書きを読めないプレビューは「公開済みの内容がプレビューの顔をしている」状態で、編集者に「まだ入っていないんだな」と誤解させる唯一の失敗だからです。この判定は `https` のときだけ働きます
- Worker が返すレスポンスはすべて `Cache-Control: no-store` と `X-Robots-Tag: noindex, nofollow` を持ちます。ゲートが 1 か所で付けているので、ルートを増やしても付け忘れは起きません（例外は `/studio/static/*` のみ。Presentation の節を参照）
- **`Content-Security-Policy: frame-ancestors` を付けています。** Presentation のためにプレビューは iframe に入る必要があり、iframe に入るページは「入れた側からのメッセージを聞くページ」でもあります（`src/preview/visualEditing.ts` はそれで移動します）。許可するのは自分自身と、`SANITY_STUDIO_URL` がオリジンを指しているときだけそのオリジンです
- `run_worker_first` により、HTML だけでなく CSS・画像・favicon まですべてゲートを通ります。ここを外すと `/kansai/_astro/*.css` が誰でも読める状態になります。除外しているのは Vite の開発用パスだけで、デプロイ先にはそこに置かれるファイルが 1 つもありません
- プレビューのビルドは Sanity を一切読みません。コレクションは空で登録され、内容はレンダリング時に取りに行きます。ビルド成果物の中に CMS のコピーは存在しません
- ビルドが失敗した回はデプロイまで到達しないので、**前回のプレビューがそのまま残ります**
- サインアウトは `/auth/logout` です。GDG Accounts 側のセッションは残るので、アカウントを切り替えたい場合は GDG Accounts でもサインアウトしてください
