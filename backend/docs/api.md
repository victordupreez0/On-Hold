# API routes

48 routes, generated from the running app (`app.routes`), so this list matches the code. With the API running, `/docs` is the interactive version (Swagger UI) where every route can be tried.

**Access:** *public* needs nothing; *signed in* needs a Supabase JWT (`Authorization: Bearer …`); *admin* also needs the `admin` role, checked server-side on every call. Every signed-in query is scoped to the caller in its SQL `WHERE` clause, so one person can never read or change another's rows.

## Profile

| Method | Path | Access | What it does |
|---|---|---|---|
| GET | `/health` | public | Liveness check |
| GET | `/me` | signed in | Your profile |
| PATCH | `/me` | signed in | Change your name, phone, area or simple mode |
| DELETE | `/me` | signed in | Delete your account and everything tied to it (POPIA-style erasure). Demo accounts can't. |

## Checks (the AI feature)

| Method | Path | Access | What it does |
|---|---|---|---|
| POST | `/checks` | signed in | Check a message, screenshot or call with Claude. Returns a Stop / Wait / Looks okay verdict. A Stop alerts family, if the person agreed to share. |
| GET | `/checks` | signed in | Your past checks |
| GET | `/checks/{id}` | signed in | One check |
| DELETE | `/checks/{id}` | signed in | Delete a check and its chat |
| POST | `/checks/{id}/alert` | signed in | "Tell my family": send this check to your guardians |
| GET | `/checks/{id}/messages` | signed in | The follow-up chat on a check |
| POST | `/checks/{id}/messages` | signed in | Ask Claude a follow-up question about a verdict |
| POST | `/transcribe` | signed in | Speech to text for the Speak button |

Checks, follow-up questions and transcription share one budget of 30 AI calls per person per hour.

## Community reports

| Method | Path | Access | What it does |
|---|---|---|---|
| GET | `/reports` | signed in | Your reports |
| GET | `/reports/{id}` | signed in | One of your reports |
| POST | `/reports` | signed in | Report a scam (goes to moderation) |
| PUT | `/reports/{id}` | signed in | Edit your report (goes back to moderation) |
| DELETE | `/reports/{id}` | signed in | Delete your report |
| GET | `/suburbs` | public | Areas people can pick from |
| GET | `/areas` | public | Approved reports per area, for the map (filter by `scamType`, `channel`) |
| GET | `/circulating` | signed in | What's going around near you, last 14 days |

## Family

| Method | Path | Access | What it does |
|---|---|---|---|
| GET | `/family` | signed in | Who you look after, and who looks after you |
| POST | `/invites` | signed in | A guardian invites someone (returns a 6-character code) |
| GET | `/invites/{code}` | public | Who sent this invite (so the invite screen can say so before sign-in) |
| POST | `/invites/{code}/accept` | signed in | Accept, choosing what to share |
| PATCH | `/links/{id}` | signed in | Change what you share with a guardian |
| DELETE | `/links/{id}` | signed in | Stop sharing / cancel an invite |
| GET | `/alerts` | signed in | A guardian's alerts |
| POST | `/alerts/seen` | signed in | Mark them seen |

## Learn

| Method | Path | Access | What it does |
|---|---|---|---|
| GET | `/explainers` | public | Scam guides |
| GET | `/explainers/{slug}` | public | One guide |

## Admin

| Method | Path | Access | What it does |
|---|---|---|---|
| GET | `/admin/dashboard` | admin | Totals, this week's activity, the 14-day report trend, latest activity |
| GET | `/admin/activity` | admin | Everything people do (sign-ups, sign-ins, checks, questions, reports, moderation, invites, family links), filter by `userId` and `type` |
| GET | `/admin/reports` | admin | All reports (filter by `status`, `scamType`, `search`, `reporterId`), with reporter and moderator names |
| GET | `/admin/reports/{id}` | admin | One report |
| PUT | `/admin/reports/{id}` | admin | Correct a report |
| DELETE | `/admin/reports/{id}` | admin | Remove a report |
| POST | `/admin/reports/{id}/moderate` | admin | Approve, or reject with a reason |
| GET | `/admin/users` | admin | Everyone, most recently active first (filter by `search`, `role`) |
| GET | `/admin/users/{id}` | admin | One person: last active, counts, family links, their activity |
| POST | `/admin/users` | admin | Create an account; returns a one-time password |
| PATCH | `/admin/users/{id}` | admin | Edit name, phone, area or role (never your own role; never the last admin) |
| DELETE | `/admin/users/{id}` | admin | Delete an account (never your own; never the last admin) |
| POST | `/admin/explainers` | admin | Add a Learn guide |
| PUT | `/admin/explainers/{id}` | admin | Edit a guide |
| DELETE | `/admin/explainers/{id}` | admin | Remove a guide |
| POST | `/admin/suburbs` | admin | Add an area |
| PUT | `/admin/suburbs/{name}` | admin | Edit an area |
| DELETE | `/admin/suburbs/{name}` | admin | Remove an area (refused while anyone uses it) |

All list routes under `/admin` take `limit` (up to 200) and `offset`.
