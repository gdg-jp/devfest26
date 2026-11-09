# DevFest 2026 PR プレビュー

プルリクエストごとに、**そのプルリクエストをマージしたら公開されるサイト**を Cloudflare Workers の [Preview](https://developers.cloudflare.com/workers/previews/) として配信し、URL をプルリクエストにコメントします。

```text
pull_request
  └─ build.yml
       ├─ discover / build   ← これまでどおり。言語 × 開催地ごとにビルドして artifact に
       ├─ publish            ← main への push だけ。gh-pages へ
       └─ pr-preview         ← プルリクエストだけ
            ├─ artifact を publish と同じ配置で dist/pr-preview に組み立てる
            ├─ wrangler preview --name pr-<番号>   → Worker「devfest26-site」の Preview
            └─ プルリクエストにコメント（push のたびに同じコメントを書き換える）

pull_request: closed
  └─ pr-preview-cleanup.yml
       └─ wrangler preview delete --name pr-<番号>
```

URL は `https://pr-<番号>-devfest26-site.<サブドメイン>.workers.dev` の形になります。プルリクエストの「View deployment」ボタンからも開けます。

## 下書きプレビューとの違い

[`preview/`](../preview/README.md) の下書きプレビューとは別物です。

|                | PR プレビュー（ここ）                                  | 下書きプレビュー（`preview/`）                |
| -------------- | ------------------------------------------------------ | --------------------------------------------- |
| 何を見るためか | プルリクエストの**コード**の変更                       | Studio で書いている**下書き**                 |
| Worker         | `devfest26-site`（静的ファイルだけ。コードは動かない） | `devfest26-preview`（SSR + サインインゲート） |
| 内容           | `build.yml` が作る公開用ビルドそのもの                 | リクエストのたびに Sanity の drafts を読む    |
| 誰が見られるか | URL を知っている人なら誰でも                           | GDG メンバーだけ                              |
| URL            | プルリクエストごと                                     | 1 つ                                          |
| GitHub の環境  | `pr-preview`                                           | `preview`                                     |

下書きプレビューを Preview にしなかったのは、サインインの redirect URI が GDG Accounts に登録した 1 つのホスト名でしか通らないからです（同じ理由で `preview/wrangler.jsonc` は `preview_urls: false` にしてあります）。

## 何が配信されるか

- **`build.yml` の `build` ジョブが作ったファイルだけ**です。このジョブはビルドせず、Sanity も読みません。`build` には `SANITY_READ_TOKEN` が渡っていないので、下書きは 1 バイトも入りません。
- **ビルドに失敗した言語・開催地は抜けたまま**配信されます。コメントの表で ❌ になり、どれが抜けているか分かります。
- **Google Analytics のタグは入りません。** プルリクエストのビルドには `NO_ANALYTICS` が付き、サイト全体の測定 ID も、Studio にある開催地ごとの測定 ID も出力されません（`src/lib/analytics.ts`）。ID の形式チェックはこれまでどおり行います。
- canonical / OG の絶対 URL は本番の `SITE_URL` を指したままです。`workers.dev` の Preview URL には Cloudflare が `X-Robots-Tag: noindex` を付けます。
- `/kansai` は `/kansai/` へリダイレクトされます。GitHub Pages と同じ動きです。

## プレビューが作られないプルリクエスト

- **フォークからのプルリクエスト。** GitHub がシークレットを渡さないためです。
- **Dependabot のプルリクエスト。** Dependabot 用のシークレットしか渡らないためです。
- **`pr-preview` 環境の設定がまだのとき。** ジョブは失敗せず、警告を出してスキップします。

## セットアップ

初回だけです。Worker そのものは、最初のプルリクエストで `wrangler preview` が自動で作ります（`workers_dev` は off、Preview URL は on — [`wrangler.jsonc`](wrangler.jsonc) の値が使われます）。

### 1. Cloudflare の API トークンを用意する

テンプレート **Edit Cloudflare Workers** で作ったトークンが使えます。下書きプレビュー用と同じトークンを使い回しても構いません。

アカウントに `workers.dev` のサブドメインが無い場合は、ダッシュボードの **Workers & Pages** で先に登録してください（下書きプレビューを動かしているなら登録済みです）。

### 2. GitHub に `pr-preview` 環境を作る

リポジトリの Settings → **Environments** で `pr-preview` を作り、以下を登録します。

| 種別     | 名前                    | 値                         |
| -------- | ----------------------- | -------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`  | 手順 1 のトークン          |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare のアカウント ID |

**Deployment branches は「No restriction」のままにしてください。** プルリクエストのブランチから使う環境なので、保護ブランチに絞るとジョブが動きません。

`preview` 環境を使い回さないのは、そこに `SANITY_READ_TOKEN` があるからです。プルリクエストが入れ替えた lockfile の wrangler を実行するジョブから、下書きを読めるトークンを 1 行で届く場所に置かないためです。

### 3. 確かめる

プルリクエストを開くか push すると、Build ワークフローの `pr-preview` ジョブが走り、コメントが付きます。

## 片付け

- プルリクエストを閉じると（マージでも）`pr-preview-cleanup.yml` が Preview を削除し、コメントを「削除済み」に書き換えます。開き直せば次のビルドでまた作られます。
- 閉じた時点でビルドが走っていたら、それは取り消されます。削除した直後にアップロードし直されないようにするためで、`pr-preview-cleanup.yml` は `build.yml` と同じ `concurrency` グループに入ります。**Build ワークフローの名前を変えるときは、`pr-preview-cleanup.yml` の `group` も合わせてください。**
- Cloudflare 側の上限は Worker あたり Preview 100 個（有料プランは 500 個）、Preview あたりデプロイ 100 件で、超えると古いものから自動で消えます。消し漏れがあっても溜まり続けることはありません。手で消すときは次のとおりです。

```bash
pnpm exec wrangler preview delete -c pr-preview/wrangler.jsonc --name pr-<番号>
```

## ローカルで試す

組み立てとコメント本文は [`scripts/pr-preview.sh`](../scripts/pr-preview.sh) にあり、ワークフローの外でも動きます。`dist/pr-preview` に何か置いてあれば、本物の workerd で配信を確かめられます。

```bash
pnpm exec wrangler dev -c pr-preview/wrangler.jsonc
```
