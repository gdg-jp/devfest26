---
name: preview-page
description: Find the local URL for a page in this site (a city LP, the portal, or a shared route) and open it in the browser to check its design. Use when the user asks to check/view a page's design, wants "the URL" for something they're working on, or says things like "この画面を確認したい".
---

Resolve which page the user means, start the dev server if needed, then open it in the browser so the user (or you) can actually look at it — don't just hand back a guessed URL.

## 1. Figure out the path

- A city's own pages live at `/<slug>` and `/<slug>/...`, defined in `src/routes/<slug>/` (e.g. `src/routes/kansai/index.astro` → `/kansai`). Confirm the slug with `Glob` on `src/routes/*/index.astro` or `Grep` for the city name.
- Shared per-tenant pages (sessions, speakers, talks) live at `/[tenant]/...` in `src/routes/[tenant]/`, e.g. `/kansai/sessions/<slug>`.
- The portal/top page is the root `src/routes/index.astro` or portal routes — check `TARGETS=portal` usage in `package.json` if the user means that.
- When unsure which page/city the user means, check recent git commits/branch name for a hint (e.g. branch `feat/kansai-lp-redesign` → the Kansai LP) before asking.

## 2. Start the dev server (if not already running)

Standard dev server serves the portal + all cities on **http://localhost:4321** (see README.md's command table). Draft/SSR preview mode is a separate command — don't use it unless the user specifically wants preview/draft behavior.

Check first whether something is already listening on port 4321 before starting a second instance.

```bash
pnpm dev
```

On this machine `pnpm` may not be directly on PATH in the Bash tool — fall back to:

```bash
corepack pnpm dev
```

Run it in the background (`run_in_background: true` or `nohup ... &`), redirecting output to a log file, and give it a few seconds before checking the log for the `Dev server running at http://localhost:4321` line.

## 3. Open it and verify

Use the Codex in Chrome tools (`tabs_context_mcp` → `navigate` → `computer` screenshot) to load `http://localhost:4321/<path>` and take a screenshot, confirming the page actually renders (not a 404/500) before reporting success.

## 4. Report back

Tell the user the URL and that the dev server is running. Leave the dev server and browser tab open unless they ask you to close them — they'll likely want to keep looking at it.
