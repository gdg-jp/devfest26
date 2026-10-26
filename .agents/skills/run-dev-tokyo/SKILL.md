---
name: run-dev-tokyo
description: >-
  Provides step-by-step procedures to launch, manage, and verify the local development
  server for Tokyo (/tokyo) in the DevFest 2026 repository. Use this skill whenever the
  user asks to run or start the dev server for Tokyo, switch from Kansai to Tokyo, or troubleshoot local Tokyo page access.
---

# Local Dev Server for Tokyo (`/tokyo`)

This guide explains how to properly start and manage the local Astro development server for the Tokyo tenant (`/tokyo`) in DevFest 2026.

## Architecture Context

- Without `SANITY_PROJECT_ID` configured, the project builds from local Markdown (`src/content/`).
- By default, `LOCAL_TENANT` defaults to `kansai`. Therefore, running a plain `pnpm run dev` will not register `/tokyo` routes and accessing `/tokyo` will result in a 404 error.
- To serve Tokyo (along with the root portal), you must supply `TARGETS=portal,tokyo`.
- When switching between tenants (e.g. from `kansai` to `tokyo`), Astro's content layer cache (`.astro`) may retain collection IDs (such as track `a`) from the previous tenant, triggering `[DuplicateContentEntrySlugError]`. Deleting `.astro` resolves this.

---

## Steps to Launch the Tokyo Dev Server

### 1. Stop any currently running dev server

```bash
pnpm exec astro dev stop
```

### 2. Clear stale Astro content cache (especially when switching tenants)

```bash
rm -rf .astro
```

### 3. Start the dev server with Tokyo targeted

```bash
TARGETS=portal,tokyo pnpm run dev
```

_Note: In the agent environment, launch this command with `IsDaemon: true`._

### 4. Verify HTTP Response

Confirm that both the portal and Tokyo page return `200 OK`:

```bash
curl -I http://localhost:4321/
curl -I http://localhost:4321/tokyo
```

---

## Helpful Server Management Commands

- **Check server status**: `pnpm exec astro dev status`
- **Check server logs**: `pnpm exec astro dev logs`
- **Stop server**: `pnpm exec astro dev stop`
