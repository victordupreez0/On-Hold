# On Hold website

A static landing page (plain HTML/CSS, a few lines of JS, no build step) with the real app running in a phone frame.
It deploys as two Cloudflare Pages projects: `onhold` (this folder) and `onhold-app` (the Expo web export, shown in the iframe).

## Deploy

Live at https://onhold.pages.dev (website) and https://onhold-app.pages.dev (app). Run these from the repo root after `npx wrangler login`.

The first time only, create both projects. `--force` keeps them on Pages: without it, newer wrangler tries to move them to Workers and fails.

```bash
npx wrangler pages project create onhold --production-branch main --force
npx wrangler pages project create onhold-app --production-branch main --force
```

Then, for every deploy:

```bash
# 1. The landing page
npx wrangler pages deploy website --project-name onhold

# 2. The app in the phone (bash; values are inlined into the bundle at export time)
cd mobile
EXPO_PUBLIC_API_URL=https://on-hold-ashen.vercel.app EXPO_PUBLIC_DEMO_ACCOUNTS=true npm run export:web
cd ..
npx wrangler pages deploy mobile/dist --project-name onhold-app
```

In PowerShell, set the variables first:
`$env:EXPO_PUBLIC_API_URL="https://on-hold-ashen.vercel.app"; $env:EXPO_PUBLIC_DEMO_ACCOUNTS="true"; npm run export:web`

| Export-time variable | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | The Vercel API URL. `mobile/.env` says localhost; a shell value wins over the file. |
| `EXPO_PUBLIC_DEMO_ACCOUNTS` | `true`. Shows the Marie and Pieter chips on sign-in and "Try the demo" on welcome. Admin never appears. |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` | Read from `mobile/.env`; set them in the shell too if that file isn't there. |

**The API must allow the app's origin:** add `https://onhold-app.pages.dev` to the API's `CORS_ORIGINS` (comma-separated), or every call from the phone fails.

If Cloudflare gives a different URL (the project name was taken, or a custom domain), change `APP_URL` at the top of `website/script.js`, and `og:url`/`og:image` in `website/index.html`.

## Why the export script looks the way it does

- `--clear`: Metro caches the inlined `EXPO_PUBLIC_*` values, so without it a new API URL can ship with the old one baked in.
- `scripts/pages-assets.js`: `wrangler pages deploy` skips every folder named `node_modules`, and the export puts all fonts and icons in `dist/assets/node_modules`. The script renames it to `vendor` and rewrites the paths.
- No `_redirects`: with no top-level `404.html` (the export has none), Pages serves `index.html` for unknown paths, so deep links work. A `/* /index.html 200` rule would be flagged as an infinite loop and ignored.

## Before sharing the link

Everyone who opens the demo shares the Marie and Pieter accounts. Demo accounts can't be deleted, but visitors' checks and reports pile up: `cd backend && uv run python -m scripts.seed` resets everything.
The admin account has its own password (`ADMIN_PASSWORD` in `backend/.env`, applied by the seed), not the published `onhold-demo`.
