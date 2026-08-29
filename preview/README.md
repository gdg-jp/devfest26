# DevFest 2026 下書きプレビュー

Sanity の **draft**（未公開の下書き）を含んだサイトを、GDG 関係者だけが見られる URL で配信するための Cloudflare Worker です。

本番の GitHub Pages とは完全に別の環境です。GitHub Pages は静的ファイルを誰にでも配るだけでリクエスト時に何も判断できないので、下書きを置く先としては使えません。ここが下書きの唯一の置き場所であり、`SANITY_READ_TOKEN` を渡してよい唯一のビルドです。

中身は 2 つだけです。

- **サイト本体** — リポジトリのルートで `SANITY_READ_TOKEN` 付きにビルドした `dist/all` を、そのまま Worker の静的アセットとして上げています。下書きはビルド時に HTML へ焼き込まれるので、**Sanity のトークンは Worker にもブラウザにも存在しません**
- **ゲート** — [`src/index.ts`](src/index.ts)。GDG Accounts (`https://accounts.gdgs.jp`) の OIDC クライアントとして振る舞い、サインインしていないリクエストをサイトに通しません

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

`SANITY_PROJECT_ID` と `SANITY_DATASET` は本番ビルドと同じリポジトリ変数をそのまま使います。

> `PREVIEW_URL` は `SITE_URL` としてビルドに渡り、canonical / OG / JSON-LD の絶対 URL になります。未設定でもビルドは通り、絶対 URL が省略されるだけです。

### 3. 一度デプロイする

Actions から **Preview** ワークフローを手動実行します。完了すると `https://devfest26-preview.<サブドメイン>.workers.dev` が立ち上がり、**「設定が未完了です」というページが表示されます**。このページに、次の手順で登録すべき URL がそのまま印字されています。

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
pnpm install
pnpm exec wrangler secret put IDP_CLIENT_SECRET
pnpm exec wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` はセッション cookie を暗号化する鍵で、32 バイト以上のランダム値にしてください。

```bash
openssl rand -base64 32
```

シークレットは `wrangler deploy` で消えないので、CI が触ることはありません。値を差し替えると全員が即座にサインアウトされます — 緊急時のレバーです。

### 6. 再デプロイする

`wrangler.jsonc` の変更を `main` に push すれば、ワークフローが走って設定済みの Worker に入れ替わります。

## 更新されるタイミング

現状は次の 3 つです。

- `main` への push
- Actions からの手動実行
- `content-draft` という `repository_dispatch`

3 つめが**次のステップ**です。Sanity の GROQ-powered webhook（**Drafts を対象に含める**設定）を `https://api.github.com/repos/gdg-jp/devfest26/dispatches` に向け、`{"event_type": "content-draft"}` を POST させれば、Studio で保存してから数分でプレビューに反映されます。ワークフロー側の受け口は [`../.github/workflows/preview.yml`](../.github/workflows/preview.yml) に用意済みです。

本番の webhook (`content-published`) とは別のイベント名にしてください。混ぜると下書きの保存が本番ビルドを叩きます。

## ローカルで動かす

サイトを先にビルドしてから Worker を起動します。

```bash
cd .. && pnpm build && cd preview
cp .dev.vars.example .dev.vars   # 値を埋める
pnpm dev
```

ルートの `.env` に `SANITY_READ_TOKEN` が入っていれば、`pnpm build` はそのまま下書きを取りに行きます。

`.dev.vars` にはクライアントシークレットが入るので、コミットしないでください（`.gitignore` 済み）。

## 覚えておくこと

- **本番の [`build.yml`](../.github/workflows/build.yml) に `SANITY_READ_TOKEN` を足さないでください。** あのワークフローにトークンが無いことが、下書きが公開サイトに出ない唯一の保証です
- Worker が返すレスポンスはすべて `Cache-Control: no-store` と `X-Robots-Tag: noindex, nofollow` を持ちます。下書きが検索に載っては意味がありません
- `run_worker_first` により、HTML だけでなく CSS・画像・favicon まですべてゲートを通ります。ここを外すと `/kansai/_astro/*.css` が誰でも読める状態になります
- プレビューのビルドは `STRICT_TENANTS` を立てません。`event` ドキュメントが書きかけの都市は警告付きでスキップされ、他の都市は普通に表示されます
- ビルドが失敗した回はデプロイまで到達しないので、**前回のプレビューがそのまま残ります**
- サインアウトは `/auth/logout` です。GDG Accounts 側のセッションは残るので、アカウントを切り替えたい場合は GDG Accounts でもサインアウトしてください
