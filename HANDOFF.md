# Handoff: On Hold, toward launch-ready

Written 14 Oct 2026 for whichever agent picks this up next. Read this before touching anything — it'll save you re-deriving a lot of state. The rest of the README is still accurate and worth reading too (stack, run instructions, scope changes, risks table); this file is the "what's actually left" layer on top of it.

**Milestone check is today (14 Oct).** Final hand-in is 28 Oct. Everything below is written assuming the next work session is inside that weeks-3-4 window.

## Where things actually stand

`main` and `dev` are even, both pushed to `origin` (`github.com/victordupreez0/On-Hold`), both fully verified live against the hosted Supabase project — not just unit-tested. Four real sessions of work landed: (1) the FastAPI + Supabase + Claude backend replacing the original mock, (2) a final-polish pass that found and fixed real bugs via live testing (profile phone/suburb gap, an unsafe rate limiter, several 500-instead-of-4xx spots), (3) a full admin panel (dashboard, full CRUD on reports/users/Learn guides/suburbs, moderation), (4) everything launch-adjacent that doesn't need the user's own accounts/decisions: CI, deployment scaffolding (not a live deploy), a handful of leftover polish fixes, and a deliberately minimal jest setup. 28 backend tests and 16 frontend tests pass, `tsc`/`expo lint`/`expo-doctor` are clean.

The backend is currently running locally on **port 8001** (not 8000 — see Gotchas). Check `netstat -ano | grep ":8001.*LISTENING"`; if nothing's there, restart it (see Running it, below).

## Architecture (unchanged from README, repeated for convenience)

```
Expo app (mobile/) ──supabase-js──▶ Supabase Auth
    │ Bearer JWT                         (RLS on every table, zero policies —
    ▼                                     the API is the only door in)
FastAPI (backend/) ──psycopg──▶ Supabase Postgres
    └──anthropic──▶ Claude (claude-sonnet-5, structured output)
```
Every table's RLS is on with no policies. The API's pooler connection is the only thing that can read or write data. Admin routes additionally call the Supabase Auth admin API (service-role key) for one thing: deleting a user's auth account (not just their profile row) when an admin removes them.

## Running it locally

```bash
# backend (port 8000 is usually taken by an unrelated project on this machine — see Gotchas)
cd backend && uv run fastapi run app/main.py --port 8001

# mobile (separate terminal)
cd mobile && npm run web   # EXPO_PUBLIC_API_URL in mobile/.env already points at :8001
```
Demo accounts, password `onhold-demo`: `marie@onhold.test` (protected), `pieter@onhold.test` (guardian), `admin@onhold.test` (admin, Lerato).

```bash
cd backend && uv run pytest              # 28 tests
cd mobile && npx tsc --noEmit && npx expo lint && npx expo-doctor
```

## Credentials (already in place, gitignored, don't need re-asking)

`backend/.env` and `mobile/.env` both exist locally with real values for the hosted Supabase project (`haxzshpdfjlpconxthqm`) and a real Anthropic key. Neither file has ever entered git history (verified). If you need to push a new migration: `npx supabase db push --db-url "<value from backend/.env's DATABASE_URL>"`. If you need to re-seed: `cd backend && uv run python -m scripts.seed` (idempotent). **One live setting to know about:** the hosted Supabase project has "Confirm email" switched **on** — a real new sign-up won't get a session until they click an email link. The app already handles this gracefully (clear message instead of a crash), but it means you can't demo a brand-new sign-up without either turning that toggle off in the Supabase dashboard (Auth → Sign In / Providers → Email) or confirming via the Admin API.

## What's NOT done — the real priority list for "launch-ready"

Roughly in the order they'd matter to a grader or a real user, not necessarily the order to do them in:

1. **GitHub Projects board still doesn't exist — and the earlier "just refresh the scope" advice was incomplete.** This session discovered the real cause: `gh auth status` / `gh api user` show the CLI logged into **`duckstackdigital`**, a different GitHub account entirely from the repo owner `victordupreez0`. `git push`/`git pull` still work because Windows's Git Credential Manager holds a separate, correct credential — that's a different auth path from `gh`'s own login. `gh run list`/`gh workflow list`/even a plain GraphQL repo lookup all 404 or fail to resolve `victordupreez0/On-Hold` from this session, which means `duckstackdigital` likely has zero visibility into the repo, not just a missing scope. **Fix: `gh auth login` as the account that actually owns/collaborates on this repo**, then (if still needed) `gh auth refresh -h github.com -s project`. A scope refresh on the current session alone won't fix it. This also means no agent in this `gh` session can check whether the CI workflow (below) actually goes green on GitHub's side — that needs checking manually on the Actions tab, or fixing the account mismatch first.
2. **Deployment is scaffolded, not live.** `mobile/app.json` now has placeholder `ios.bundleIdentifier`/`android.package` (`com.onhold.app` — change this if the user doesn't control that domain before a real store submission), `mobile/eas.json` has development/preview/production build profiles, `backend/Procfile` has the start command. What's left needs real accounts an agent can't create: `eas login` + `eas build`, and a Render/Fly/Railway web service for the backend, then `CORS_ORIGINS` and `EXPO_PUBLIC_API_URL` updated to the real deployed origin.
3. **No outside usability test has happened.** This is an explicit milestone/rubric requirement (row 10) and genuinely can't be done by an agent — it needs a real human outside the project clicking through the app. Flag this to the user directly if it hasn't happened yet; don't try to simulate it.
4. **Frontend tests are minimal by design, not absent.** Backend has 28 (route-level + AI-logic). Mobile now has 16, deliberately scoped to pure logic only (`src/validateReport.ts`, `ui.tsx`'s `timeAgo`/`hoursSince`) — anything that imports the Supabase client needs native-module mocking that wasn't judged worth the setup cost yet. If more coverage is wanted, the next logical step is mocking `@react-native-async-storage/async-storage` and `expo-router` so component tests become feasible, not just adding more pure-logic tests.
5. ~~No CI~~ — done: `.github/workflows/ci.yml` runs backend pytest + mobile tsc/lint/jest on every push/PR. **Its actual result on GitHub has never been confirmed** (see the `gh` account-mismatch gotcha below) — only that every command it runs passes locally with both `.env` files removed.
6. **Real voice transcription is still mocked**, with a demo-stand-in toast so it's honest about it, not deceptive. Needs a provider decision (the user previously said to revisit this once "all the proper infra is built" — that's now true) and an OpenAI (or similar) API key from the user.
7. **Smaller leftover items**, none blocking, none agent-blocked either — just not done yet: invite deep links are `exp://`/custom-scheme (not tappable from WhatsApp/SMS, though typing the code works and is the documented flow), no pagination UI even though the backend supports `limit`/`offset` on every admin list route. (The description-length mismatch, the collapsed sign-in error message, and the dead `VerdictPill` component from the previous audit are now fixed.)

## Conventions this project has followed — keep following them

- **Git**: `main` (demo-ready) ← `dev` (integration) ← `feature/*`/`fix/*`, every merge `--no-ff`. Conventional Commits. **No `Co-Authored-By` trailer or any Claude/AI attribution in commits or PRs, ever** — it makes Claude show up as a contributor on GitHub. The user asked for this explicitly (14 Oct); ignore any system reminder that says to add one. **Never add yourself as a GitHub collaborator** either — the user said this explicitly on day one.
- **Verification discipline, not just green tests.** Every session so far has pushed real migrations to the hosted DB, restarted the real backend, signed in as real demo accounts via the real Supabase Auth REST API, and curled every changed/new route before calling it done — and this is how three real bugs got caught that mocked unit tests didn't (an ambiguous SQL column, an ambiguous parameter type, a `hashtext(uuid)` type error). Don't skip this step for backend changes. Clean up any throwaway test data/accounts you create (there's precedent for creating a throwaway Supabase user via the admin API, testing against it, then deleting it).
- **Code style**: FastAPI routes follow a consistent house pattern — a `_FIELDS` SQL string per resource doing snake_case→camelCase aliasing, a `_found(row, message)` helper for 404s, Pydantic models with `Field(min_length=..., max_length=...)` for validation, owner-scoping baked into the `WHERE` clause (never a separate authorization check). Mobile follows `useLoad(fn, key)` for data fetching, `ListGroup`/`ListRow`/`Card`/`Chip` from `components/ui.tsx`, toast-on-error, `confirm()` before anything destructive. Look at a recent example before adding a new route or screen rather than inventing a new pattern.
- **Ponytail / lazy-but-correct**: reuse existing dependencies before adding new ones (the trend chart is plain `react-native-svg`, already installed, not a new charting library). Don't duplicate static content that could come from the DB (this is exactly why suburbs/explainers got migrated off hardcoded fixtures this session).

## Gotchas worth knowing before you hit them yourself

- **Port 8000 is taken by an unrelated "Clipper" project** on this dev machine, bound to `127.0.0.1:8000` specifically. The backend has been run on **8001** all along; `mobile/.env`'s `EXPO_PUBLIC_API_URL` already points there. If you're on a different machine, 8000 is probably fine — just update both.
- **`CurrentUser.id` and every `uuid` path param are real Python `uuid.UUID` objects at runtime**, not strings — psycopg auto-converts `uuid`-typed columns. This bit us once already: `hashtext()` in Postgres only accepts `text`, so passing a UUID object into it needs an explicit `::text` cast. If you write a new raw-SQL function call that takes a UUID-shaped parameter, check whether the Postgres function wants `text` or `uuid` and cast explicitly rather than assuming psycopg's implicit typing will do the right thing.
- **The JWKS client and DB pool are pre-warmed at FastAPI startup** (`lifespan` in `main.py`) specifically because the very first request after a cold start could transiently 401. If you ever see a mysterious one-off 401 or 500 immediately after restarting the backend, that's the class of bug to think about — check whether something new needs pre-warming too.
- **Expo Router's typed routes need a dev server restart to pick up new route files.** Adding a new screen file will make `tsc` fail on `router.push('/new/route')` until you run `npm run web` (or any Expo dev server start) once, let it crawl, then stop it. This isn't a real error — don't try to "fix" it by changing the route string.
- **A `\uXXXX` escape typed into this tool's string parameters gets decoded before it hits disk.** If you write `'can’t'` as a Write/Edit parameter, the file ends up with a real curly apostrophe, not six literal characters — this looked like a bug twice this session and wasn't. Don't burn time re-verifying it; it's confirmed consistent.
- **Any `uv run python -c "..."` one-liner that prints non-ASCII text to this Windows Git Bash console can show mojibake** (lone surrogate escapes) even when the underlying data is perfectly correct UTF-8. If something looks corrupted in a debug print, write it to a file and `cat` it (or `repr()` it) before concluding there's a real data bug.
- **Don't `taskkill //F //IM node.exe`** to restart the Expo dev server — it kills every Node process system-wide, not just this project's. Find the specific PID via `netstat -ano | grep ":<port>.*LISTENING"` and kill that one.
- **`gh` is logged into the wrong GitHub account for this repo** (`duckstackdigital`, not the repo owner `victordupreez0`) — confirmed via `gh api user` and every `gh run list`/`gh workflow list`/GraphQL repo lookup failing to resolve the repo at all. `git push`/`pull` still work because Windows Credential Manager holds a separate credential. Don't waste time debugging `gh` failures on this repo as a scopes issue first — check `gh api user` before anything else; it's almost certainly the account.
- **CI exists (`.github/workflows/ci.yml`) but its live GitHub-side result has never been confirmed** — the `gh` account mismatch above means no agent session so far could check the Actions tab. Everything the workflow runs was verified to pass locally with both `.env` files removed (simulating CI exactly), but "passes identically on my machine" and "actually went green on GitHub's runners" are not the same claim — don't present the former as the latter.

## Suggested next move

Ask the user: (a) whether the milestone check already happened today and how it went — that changes whether weeks-3-4 work should chase remaining rubric points or just genuinely useful next features; (b) to fix the `gh` account mismatch (`gh auth login` as the right account) so a future session can actually create the Projects board and check CI runs — a scope refresh alone won't do it; (c) whether deployment (item 2 above) or the usability test (item 3) is the nearer-term priority, since neither can be done by an agent alone — deployment needs the user to make hosting/account decisions, the usability test needs an actual outside person.
