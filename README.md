# On Hold

**Pause before you pay.** On Hold lets older South Africans, and anyone else, check a suspicious SMS, WhatsApp, email or phone call before they act on it. It gives a plain verdict (**Stop**, **Wait** or **Looks okay**) and says what to do next. If the person agrees, it alerts a family member when something looks like a scam. A community scam map and a Learn tab keep people aware of what's going around right now.

DV300 Theme 4 (AI-Driven Application), Victor du Preez (241250), Open Window, 2026.

## Status

**Phase 1: frontend (done).** Every screen is built in the brand and runs on the web preview and in Expo Go, backed by a typed **mock API** ([mobile/src/api.ts](mobile/src/api.ts)).
**Phase 2: backend (next).** FastAPI + Supabase + Claude replace the mock function bodies. Screens don't change.

| Area | What works now |
|---|---|
| Check | Paste, screenshot or speak a message. Call mode shows safety basics instantly. The breathing pause lasts at least 3 s. The verdict shows reasons, next steps and "Say this, then hang up" for calls. Failures fall back to a Wait message. |
| Family | Guardian invites (code / WhatsApp share). Accepting shows exactly what is and isn't shared. Per-person toggles, stop sharing, guardian alert timeline, one-tap call. |
| Reports | Create, read, update and delete scam reports with inline validation. Edited reports go back to review. |
| Map | Suburb-level heat gradient on a muted base map (native map + Leaflet on web), a type filter, and a ranked area list with intensity bars. |
| Learn | "Going around near you" from approved reports, plus 8 sourced explainers on common SA scams. |
| Admin | Moderation queue: approve, or reject with a reason. |
| Access | Simple mode (one giant Check button plus "Call Pieter"), Atkinson Hyperlegible Next, 48 pt touch targets, verdicts always icon + word + colour. |

## Run it

Needs Node 20+ and npm. On a phone, install **Expo Go**.

```bash
cd mobile
npm install
npm run web       # browser preview at http://localhost:8081
npm start         # scan the QR code with Expo Go (Android) or the Camera app (iOS)
```

**Demo accounts** (the sign-in screen has chips for these). Any password of 8+ characters works in the mock:

| Account | Role | Shows |
|---|---|---|
| marie@onhold.test | Protected | Home with last check, family consent toggles |
| pieter@onhold.test | Guardian | Family status, alert timeline, invites |
| admin@onhold.test | Admin | Moderation queue |

Settings → **Preview as (demo)** switches role without signing out.

**Try these in Check:** the example chips; "a man is phoning saying he's from the bank" (you get a call verdict without tapping call mode); any text containing `test-error` (the failure state).

> Mock data lives in memory, so a full page reload signs you out and resets it. If TypeScript says a new route doesn't exist, restart `npm run web` so Expo regenerates the typed routes.

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
npx expo-doctor    # dependency health
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Expo SDK 57, React Native 0.86, TypeScript, Expo Router | One codebase for Android, iOS and the web preview |
| Styling | `StyleSheet` + tokens in [theme.ts](mobile/src/theme.ts) | No styling build step to break before deadlines |
| Map | react-native-maps (native), react-leaflet + OSM (web) | react-native-maps has no web support |
| Inputs | expo-clipboard, expo-image-picker, expo-audio | All run in Expo Go |
| Phase 2 | FastAPI (Python), Supabase (Postgres, auth, RLS), Claude API | API keys stay server-side; RLS enforces who sees what |

## Project structure

```
mobile/
  src/app/                 Expo Router screens
    welcome, sign-in, sign-up
    (app)/_layout          tab bar: Home, Map, (Check), Learn, Family. Each tab has its own stack, so the bar never disappears
    (app)/(home)/          Home, settings, my reports, admin
    (app)/check/           Ask (input, call mode, pause), verdict [id], report
    (app)/map/             heat map, report
    (app)/learn/           Learn, explainer [slug]
    (app)/family/          Family, invite, accept
  src/api.ts               mock API = the contract Phase 2 implements
  src/fixtures.ts          seed data, verdict copy, SA scam explainers
  src/types.ts             shared shapes (CheckResult, Report, GuardianLink…)
  src/components/          ui primitives (ListGroup, ListRow, PageTitle…), Logo, BreathingRing, ScamMap(.web), ReportForm
  src/screens/             screens shared by several tabs (the report form)
```

## Scope changes since the pitch

| Change | Why |
|---|---|
| **Learn tab and "Circulating now" moved into the MVP** | Awareness is a core goal, and the feed reuses moderated report data. |
| **Map shows a heat gradient, and the 5-report cutoff is gone** | Hiding small areas confused people. Privacy now comes from suburb-level data only (never exact addresses) plus moderation, and intensity reads better as heat than as number bubbles. |
| **Read-aloud (text-to-speech) removed** | On-device voices sounded robotic and added nothing over the large, plain-language screen. Voice *input* stays. |
| **Mid-call warning = call mode in Ask, plus auto-detect later** | Apps can't hear calls, and call-state detection needs a native dev build (Android first; Apple says CallKit's observer isn't meant for this). Call mode works everywhere today. `useOnCall()` is the hook for Phase 2. |
| **Voice transcription** | Mocked for now. Phase 2 will compare `gpt-4o-mini-transcribe` (about half Whisper's price) with `whisper-1`. |

## Money model (if it ever launches)

A university project first. If it goes further, **safety is never paywalled**: checks, verdicts, Learn, the map and one guardian link stay free. An optional paid **Family plan** would cover looking after several people, SMS fallback alerts and a weekly digest. No ads and no selling data.

## Git workflow

`main` (demo-ready) ← `dev` (integration) ← `feature/*`, `chore/*`, merged with `--no-ff`. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Acknowledgements

- Scam guidance checked against [SABRIC](https://www.sabric.co.za/), [SASSA via SAnews](https://www.sanews.gov.za/node/60295), [SARS](https://www.sars.gov.za/media-release/11-february-2013-warning-to-taxpayers-on-scams/), [RTIA / AARTO via SAnews](https://www.sanews.gov.za/node/84463) and [Arcadia Finance](https://www.arcadiafinance.co.za/news/older-sassa-beneficiaries-targeted-by-scammers/). Statistics in the pitch come from SABRIC (2026).
- [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont) by the Braille Institute (SIL OFL), via `@expo-google-fonts`.
- Icons: [Feather](https://feathericons.com/) via `@expo/vector-icons`. Web map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (shown in greyscale).
- Built with help from Claude Code (Anthropic).
