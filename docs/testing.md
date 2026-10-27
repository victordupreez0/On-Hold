# Testing and bug log

## How On Hold is tested

| Layer | What | Run it |
|---|---|---|
| API | 54 route and AI-logic tests with pytest: owner scoping, the AI rate limit, role checks, last-admin protection, input validation, Claude's output validation, admin create/edit, the activity feed, transcription | `cd backend && uv run pytest` |
| App | Type checking, lint, and 16 jest tests on the pure logic (report validation, time formatting) | `cd mobile && npx tsc --noEmit && npx expo lint && npx jest` |
| CI | Both of the above on every push and pull request, with no secrets available | [.github/workflows/ci.yml](../.github/workflows/ci.yml) |
| Live | Every backend change was checked against the real hosted database: migrations pushed, real demo accounts signed in through Supabase Auth, and each new or changed route called for real. Throwaway accounts made for this were deleted afterwards. | — |

Mocked tests can't catch everything. Live checks found several bugs the unit tests missed, such as an ambiguous SQL column, a parameter Postgres couldn't type, and a token rejected because two clocks disagreed. Those bugs are in the log below.

## Bug log

Every bug found and fixed, newest first. Each fix is its own commit, so the commit id links to the exact change.

| Date | What went wrong | How it showed up | Fix |
|---|---|---|---|
| 27 Oct | A silent recording came back as the word "You" (Whisper invents words when there's no speech) | Live voice test | `1e1716c`: voice-activity filter on, so silence gets "We didn't catch any words" |
| 27 Oct | The "Speak" button returned the same canned transcript whatever was said, so it could even produce a Stop and a family alert for a call that never happened | Final review against the brief | `77054fd`, `c6d7290`: real speech-to-text (Whisper on Cloudflare Workers AI). Tested live with phone (m4a), browser (webm) and wav recordings. |
| 27 Oct | Admins couldn't see who was using the app or what they were doing; the activity list had no names and covered only three event types | Final review against the brief | `2fb37eb`, `c851588` |
| 27 Oct | Some demo reports read "SMS about…" but were filed as phone calls: the seed picked the story and the channel separately | Taking README screenshots | `bb9edc0` |
| 27 Oct | Learn said "1 reports in your area" | Taking README screenshots | `4a32d79` |
| 27 Oct | CI's type check failed on every clean checkout (a generated, gitignored Expo declaration file only exists on machines that ran the dev server) | Reproduced on a clean worktree | `5e4a501` |
| 27 Oct | The admin demo account used the password published in the README, so once deployed anyone could administer the app | Review of the public demo | `063b951`: admin password comes from a private setting |
| 27 Oct | The admin hub (dashboard, users, guides, suburbs) had no way in from the app; Home and Settings linked only to the reports queue | Final review | `0a9dd4e` |
| 27 Oct | Demo data was dated relative to the day it was seeded, so two weeks later "going around near you" was empty and the trend chart was flat | Final review | `9dd5bdc`: the seed rebuilds relative to now |
| 27 Oct | Demo phone numbers were real-looking SA cell numbers, so "Call Pieter" could have rung a stranger | Final review | `9dd5bdc`: unallocated `+27 00` numbers |
| 27 Oct | Uploads between 4.5 and 8 MB would get the host's raw error instead of a friendly message once deployed | Deployment prep | `4d16313`: body cap lowered to the host's 4.5 MB; the app explains a 413 |
| 14 Oct | The tip of the day's screen-reader label read a double full stop | Accessibility pass | `028ae7f` |
| 14 Oct | "Check your email" after sign-up looked like a failure | Developer testing | `545771d` |
| 14 Oct | The map didn't centre on your area, and new users were never asked for one | Developer testing | `b23b91f` |
| 14 Oct | Simple mode had dead ends: family, back buttons, the home indicator | Developer testing | `aa166e4` |
| 14 Oct | Guides opened in the Learn tab instead of the tab you came from | Developer testing | `ebee109` |
| 14 Oct | Today and Learn spun forever when a load failed | Code audit | `0dc767b` |
| 14 Oct | Changing a filter briefly showed the old filter's results as current | Code audit | `0afff47` |
| 14 Oct | Validation errors showed as "[object Object]" | Code audit | `4a68f7c` |
| 14 Oct | The admin guide editor ate spaces and new lines while typing | Developer testing | `c3545b7` |
| 14 Oct | Guardians called an old number instead of the one the person keeps in Settings | Code audit | `fa8fa51` |
| 14 Oct | Two people accepting the same invite, or two admins demoting each other, could both succeed | Code audit | `2552a22` |
| 14 Oct | Bad input gave a 500, and spent a rate-limit slot before being rejected | Code audit | `bca3c67` |
| 14 Oct | Claude calls had no timeout, and off-schema output or a refusal crashed the check | Code audit | `7ccd087` |
| 14 Oct | Demo accounts showed on the sign-in screen of production builds | Code audit | `da1be18` |
| 14 Oct | The centre Check button reopened an old check instead of starting fresh | Developer testing | `a53a30e` |
| 14 Oct | Screenshot checks failed on iPhone (iOS labels a JPEG as PNG) | Testing on a real iPhone | `0dab187` |
| 14 Oct | Fresh sign-ins were rejected as "not yet valid" because the server clock was 2 s behind | Live testing | `c149388` |
| 14 Oct | A dropped connection said "wrong password" | Developer testing | `e88845b` |
| 14 Oct | The app capped report descriptions lower than the API did | Code audit | `7405310` |
| 13 Oct | Failures were hidden, and some copy overpromised ("this is safe") | Developer testing | `bc30f0f` |
| 13 Oct | No request timeout; status codes were swallowed | Live testing | `5ad7667` |
| 13 Oct | Concurrent requests could slip past the AI rate limit, and some routes weren't owner-checked | Code audit | `c8a1b35` |
| 13 Oct | Ambiguous SQL columns and parameters, and a 401 on the first request after a cold start | Live testing | `2f2463f` |
| 11 Oct | Any mention of a phone was treated as a phone call | Developer testing | `58c57ac` |
| 11 Oct | The empty family card used the protected person's wording for guardians | Developer testing | `17db60d` |
| 11 Oct | expo-audio was missing its expo-asset peer dependency | Build | `df192d4` |

## Known limitations

- Mid-call detection needs a native build (Apple's CallKit observer isn't meant for this), so "Someone on the phone?" is a button, not automatic.
- Guardian alerts show on Home and the Family tab; there are no push notifications yet.
- No "forgot password" flow yet.
- App tests cover pure logic only. Screen tests would need the Supabase client and router mocked.
