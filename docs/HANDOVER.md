# Handover — everything about Dahab Focal, in one file

Written 2026-09-11, at the end of session 3, for a Claude session starting cold
with no memory of any earlier conversation.

Read this first, then the four files in §3. Nothing here replaces the repo —
the repo is the record. This file is the map, the history, and the list of
things that are true but not visible in any single file.

---

## 1. What the product is

**Dahab Focal** — a services marketplace for **Dahab, South Sinai, Egypt**.
Experiences, not food: diving, freediving, snorkelling, desert safari,
kitesurfing, yoga and wellness, Bedouin culture, boat trips, courses, equipment
rentals, transfers, photography.

Three surfaces, one design system, one token package, one i18n package, one API:

| Surface | Package | State |
| --- | --- | --- |
| Traveller app | `apps/traveler` | **Empty directory.** Designed (Board 03 Home approved), never coded. |
| Vendor / operator app | `apps/vendor` | Expo, 5 screens, Arabic-first, fixtures |
| Admin console — "the Sky Eye" | `apps/admin` | Next.js 15, 8 screens, 1 wired to the API |
| API | `apps/api` | Fastify + tRPC, reads only, no database connected |
| Component gallery | `apps/gallery` | Exists to be screenshotted by the visual gate |

The business model: vendors list services, travellers book, the platform takes
a commission (basis points, never a float). Vendors have permits, insurance,
dive-agency affiliations and staff certifications that **expire** — surfacing
those before they lapse is a first-class feature, not an afterthought.

---

## 2. Where everything lives

**Repo:** `C:\Users\DANNN\dahab-focal`
**GitHub:** `https://github.com/band-agents/dahab-focal` (private)
**Working branch:** `feat/admin-console` — 22 commits ahead of `master`,
open as [PR #1](https://github.com/band-agents/dahab-focal/pull/1).
35 commits total on the branch.

**Design source files, outside the repo, in `C:\Users\DANNN\Downloads`:**

| File | What it is |
| --- | --- |
| `Dahab Focal - Design System.html` | The **design system of record**, revision v3, 9 sections. Section 09 (7 Sep) carries the ratified colour corrections. |
| `Dahab Focal - Board 03 Home.html` | The **approved traveller Home board**. `packages/tokens/scripts/generate-marks.mjs` reads this file to emit the 55 symbols. |
| `Dahab Focal Board 03-.zip` / `Board 03.zip` | Exports of the same board. |
| `Design System - Dahab Focal.pdf`, `Design System.pdf` | PDF renders, reference only. |

These are Claude Design canvas exports. **The Claude Design project is
immutable from a Claude Code session** (`PROJECT_TYPE_PROJECT`) — you cannot
write to it. Design work is therefore delivered as **prompts the user pastes
into Claude Design themselves**. Four such prompts already exist in `docs/`.

---

## 3. Read these, in this order, before changing anything

1. **`CLAUDE.md`** — the non-negotiables. Palette, type, the "one hand"
   drawing rule, RTL, money, time, pricing, accessibility. Rewritten to match
   design v3; the pre-design brief it originally contained is history.
2. **`docs/FOUNDATION.md`** (483 lines) — sessions 1 and 2. The backend
   packages, the design import, every judgment call made and why, and a table
   of every contrast ratio recomputed from the hexes.
3. **`docs/SESSION-ADMIN-VENDOR.md`** (152 lines) — session 3. What the two
   dashboards are, the three things the codebase is deliberately honest about,
   and the decisions that are invisible until they break something.
4. **`docs/CANVAS-FIXES.md`** (239 lines) — the worklist of what the design
   board still owes, each row with a computed ratio and a reason. Read its
   status banner first: sections 1 and 3 are DONE and **not the way the file
   proposes** — the board answered them itself in section 09.

Then, when the work touches design: `docs/DESIGN-PROMPT-TRAVELER-APP.md`,
`-R2.md`, `-ADMIN.md`, `-VENDOR.md`, `-BOARDS-04-11.md`, and
`docs/DESIGN-IMPORT-V3.md`.

---

## 4. The history — what happened in each session

**Session 1 (2026-09-06).** Six commits, 160 tests. The whole backend
foundation: the token pipeline, the db schema, `computePrice()`, the i18n
package, the permission matrix. Everything visual was blocked because the
design could not be read yet. A provisional palette was used and later thrown
away.

**Session 2 (2026-09-07).** The design import was unblocked. Claude Design
project `3faba25b-2220-49c3-b25d-2111cf8d8ef3`, "Travel booking design system
refresh". **Revision v3 is a wholesale rework of the direction the pre-design
brief described** — the brief's coral fill button, sand/abyss palette and
Fraunces + Cairo + JetBrains Mono did not survive three design passes. The
owner confirmed v3 wins; `CLAUDE.md`'s non-negotiables were rewritten to match
in the same commit series. v1 and v2 are history, ignore them.

**Session 3 (2026-09-10 → 11).** The two dashboards. 22 commits. The admin
console's eight boards, the marks moved into `@dahab/tokens` and given a React
Native twin, the vendor app, the three schema gaps the wiring exposed, and the
API's admin router. Tests went 193 → 228.

**Session 4 (2026-09-11).** The blocker closed and the console went live.
Board 04 Discover became `apps/traveler`; a Supabase Postgres was created and
`pnpm db:migrate && pnpm db:seed` ran against it for the first time (PostGIS
3.3.7, 59 tables, 7 GIST indexes); `apps/api` booted and its health check went
from `degraded` to `ok`; the admin console was deployed to Vercel. Then the
operating week went into the database — services, departures, bookings,
payments, a balanced double-entry ledger, payouts, reviews, incidents and
disputes — and **all eight admin screens were moved off fixtures onto the
API**. The fixture modules under `apps/admin/lib/` were deleted rather than
left to rot.

The user's standing instruction from this session, still in force:

> "write simple responses and make sure your responses in arabic egyptian"

**Reply to the user in Egyptian Arabic.** Code, comments, commits and docs stay
in English.

---

## 5. The design system, in exact values

Full detail is in `CLAUDE.md` and the board. The parts that get broken most:

**Four families and one ink: cream, mint, blush, sand/clay.** No pure white
anywhere — the page is `cream-50` `#FDFAF6`. Primary text `ink-900` `#2E3B3A`
(11.19:1). More than three colours on a screen means something went wrong.

**The primary button is a `blush-200` `#F9CFC8` fill with an `ink-900` label**
(8.20:1). There is no white-on-fill button in this system — white on blush is
1.4:1. The `Button` primitive **has no colour prop**, so that pairing is not
merely discouraged, it is inexpressible.

**Type.** Display, brand and every price: **Baloo 2** 600, never below 19px,
never a UI label. All UI and body: **Rubik** 300/400/500 (500 is the heaviest
UI weight) — one family for Latin, Cyrillic and Arabic. Arabic display: **Baloo
Bhaijaan 2**. Arabic body stays Rubik, +20% line-height, never below 15px.
Monospace is the system stack; there is no bundled mono face. **The serif is
gone** — any mention of Fraunces is pre-v3 and wrong.

**One hand.** Every mark, illustration, the logo and the loading state are
drawn identically: a 3px soft-charcoal line (`ink-line` `#3B4A48`, never pure
black) over a flat pastel silhouette, filled, offset **+4/+4** down-right. Six
strokes or fewer. Never fatten the line and reuse it as the shape. At 24px and
below the line thickens to 4.6; nothing else changes with size.

**Seven marks carry no silhouette** — `sea`, `wind`, `reef`, `depth`, `palm`,
`offline`, `coralFan`. **`weave` is NOT one of them**: it is the Bedouin
divider and carries a filled repeating diamond. An earlier `CLAUDE.md` had this
list wrong in both directions; the board wins, and
`packages/ui-web/tests/contracts.test.ts` asserts the real set.

**The marks are data, generated from the board, never hand-drawn in a
component.** `packages/tokens/src/marks.ts` is produced by
`packages/tokens/scripts/generate-marks.mjs` reading `Board 03 - Home.dc.html`:
**37 marks + 6 illustrations + 12 category marks = 55 symbols**, lifted
verbatim. Tints are stored as *token names* (`shape-water`, `shape-life`,
`shape-land`, `cat-wellness-shape`, `cat-transfers-shape`), never hexes.
Regenerate, do not hand-edit.

**Night Dive is the dark theme** and is complete enough to ship. The same three
pastels dimmed onto a warm green-black (`bg` `#0A2422`, `surface` `#0F2E2E`).
The mark line inverts to cream; the offset shape stays pastel. The CTA fill
becomes `#C98A7E` with a near-black label. Section 09 added the night
`text-link` `#8FE0D8`, `focus-ring` `#7FD8D0`, `cta-edge` / `cta-fill-pressed`
`#E8A99C` and the four status strips; `pnpm test:tokens` asserts each clears
4.5:1 against **both** night grounds.

Danger text is **two tokens picked by ground**: `danger-text` `#A82B2B` on its
own `#F5DCDC` tint (5.30), `danger-text-on-cream` `#C13333` on the page (5.26).
The interim `#B82D2D` that an older doc proposed is superseded.

---

## 6. The architecture

```
packages/
  tokens        tokens.json → generated theme.ts, tokens.css,
                tailwind-preset.cjs, fonts.css, tokens.d.ts.
                Also owns the 55 generated marks (src/marks.ts).
                44 tests, including the contrast gate.
  config        eslint (with a custom RTL plugin), prettier,
                tsconfig bases, tailwind/base.cjs.
  i18n          7 locales, ICU, formatters, bidi, direction.
                THREE entry points — see §7. 52 tests.
  api-contract  Zod schemas, the permission matrix, and
                computePrice(). 28 tests.
  db            Drizzle schema: 59 tables across 12 modules.
                3 migrations, a Dahab seed. 32 tests.
  ui            React Native component library (Expo).
  ui-web        Web component library (Next.js). 8 tests.

apps/
  api       Fastify + tRPC. Routers: auth, catalog, admin. 33 tests.
  admin     Next.js 15, port 4310. 8 screens. 7 tests.
  vendor    Expo web, port 4320. 5 screens. 13 tests.
  gallery   Expo web. Exists for the screenshot gate. 4 tests.
  traveler  Expo web, port 4330. Board 04 Discover. On fixtures.
```

**228 tests across 12 packages.** Both gates pass.

### The admin console — `/[locale]` on port 4310

A01 Today · A02 Operators & verification · A03 The expiry board ·
A04 Catalogue & taxonomy · A05 Bookings · A06 Money · A07 Safety & trust ·
A08 Platform.

Every locale is a real route, so `dir` is a document fact rather than a runtime
toggle. Light and Night Dive both work.

**Every screen reads the API, and every panel fails on its own.** A page runs
its queries through `load()` in `apps/admin/lib/api.ts` and renders a
`DataProblemNotice` per panel, not per page — two panels on one screen are
usually two procedures behind two different permissions. There are no fixtures
left in `apps/admin/lib/`; if you are about to add one, the thing you actually
want is a procedure in `apps/api/src/routers/admin.ts`.

### The vendor app — port 4320

V01 Today · V02 Bookings · V03 Services · V04 Pricing · V05–V07 on More.

Arabic is the **default**, not English — the people running a dive centre in
Dahab work in Arabic, which is a different thing from Arabic being one of seven
locales in the traveller app. Driven by URL parameters while there is no auth:
`?role=vendorOwner|vendorStaff`, `?locale=`, `?theme=`.

V04's simulator calls `computePrice()` from `@dahab/api-contract` — the same
function the checkout and the comparison engine call — so what an operator sees
is what a traveller is charged, with no second implementation to drift.

### Roles and permissions

Five roles: `guest`, `traveler`, `vendorStaff`, `vendorOwner`, `admin`.
23 permissions, verbs on resources rather than screens: `catalog.read/write/publish`,
`booking.createOwn/readOwn/cancelOwn/readVendor/manageVendor`,
`vendor.readOwn/writeOwn/readAny/verify`, `payout.readOwn/manage`,
`pricing.manage`, `staff.manage`, `resource.manage`, `taxonomy.manage`,
`review.write/moderate`, `user.readAny/impersonate`, `audit.read`.

**Always `can(role, permission)`. Never a role check at a call site.**

---

## 7. The rules that bite

These are the ones that cost real time on this branch.

**Use the semantic tokens, never the ramp steps.** `bg`, `surface`,
`surface-raised`, `text`, `text-muted`, `info-surface`, `danger-text` carry a
Night Dive value. The raw ramp steps — `cream-100`, `mint-50`, `ink-900` — do
**not**, so a component built from them silently stays light on a dark ground.
It type-checks perfectly and is invisible until you switch themes.
`packages/ui-web/tests/contracts.test.ts` asserts the primitives never reach
for one.

**`@dahab/i18n` has three entry points.** The barrel re-exports `react-i18next`,
whose module body calls `createContext()` on import and therefore throws inside
a React Server Component. Use **`@dahab/i18n/server`** from anything rendering
on a server; **`@dahab/i18n/react`** carries the hooks; the barrel is for
client code that wants everything.

**Interpolated Latin text inside an Arabic sentence must be isolated.** Names,
dive sites, units and reference numbers all reorder under the bidi algorithm
otherwise. Use `isolate()` from `@dahab/i18n`. This produced visible bugs
**twice** on this branch.

**Mirroring is the transform; `noFlip` is its absence.** An SVG does not mirror
itself when the layout direction flips, so `<Mark>` applies
`scaleX(var(--mark-flip, 1))` and `noFlip` omits it. Getting this backwards was
a real bug here.

**RTL is the layout model, not a feature.** Never `marginLeft/Right`,
`paddingLeft/Right`, `left:`, `right:`. Always the logical equivalents
(`ms-*`/`me-*`/`ps-*`/`pe-*` in NativeWind, `margin-inline-*` on web).
`textAlign` is `'auto'`, never `'left'`.

**Money is integer minor units plus a currency code.** Never a float, never
`Number.toFixed` for display — use the formatters in `packages/i18n`.

**Time is stored UTC, rendered Africa/Cairo.** Egypt observes DST. Never do
date arithmetic in local time.

**Price is computed in exactly one place:** `computePrice()` in
`packages/api-contract`. Writing pricing logic anywhere else creates a refund
ticket.

**Comparable attributes are data, not columns.** `attribute_definitions` +
`service_attribute_values` drive the admin taxonomy manager, the vendor service
builder and the traveller comparison engine. Never add a hardcoded column to
`services` for something a category might want to compare.

**Seven locales, always**, and every new key lands in all seven files in the
same commit — English-placeholder if needed, marked `needs-translation`.
ICU only; never build a sentence by concatenation. Arabic has six plural forms,
Russian four. `packages/i18n/scripts/check-locales.mjs` is the gate, and it
catches wrong `identicalToSource` declarations — it caught about twenty of
them on this branch.

**Never lorem ipsum**, in code or in fixtures. Real Dahab content only: the
dive sites (Blue Hole, The Bells, The Arch, El Canyon, Three Pools, The
Islands, Eel Garden, Lighthouse, Moray Garden, Caves, Umm Sid, Gabr El Bint,
Ras Abu Galum, Blue Lagoon), the neighbourhoods (Assalah, Masbat, Mashraba, Eel
Garden, Lighthouse, Blue Beach), and the seeded operators (Fanous Divers, Blue
Beach Freediving, Sinai Nomads, Baraka Kite, Moya Yoga, Shamandura Boat Trips,
Assalah Transfers). Prices in EGP with a EUR equivalent.

---

## 8. Domain rules that are real, not decorative

- No-fly after diving: 18h single dive, 24h multi-day. The trip planner must
  detect and warn against the user's flight time.
- Certifications gate activities. The Arch at Blue Hole is technical-only.
- Vendor permits, dive-agency affiliations, insurance certificates and staff
  certifications all expire and must surface before they do.
- Scuba tanks carry hydrostatic test dates.
- Weather cancels boats. Cancellation is a first-class, cascading operation.
- Water is ~22 °C in January and ~28 °C in August; wetsuit guidance changes by
  month.
- Kite season is March–June. Flat-calm mornings suit freediving.
- Friday and Saturday are the Egyptian weekend. Ramadan shifts operating hours.
- Dahab has a hyperbaric chamber; diving incidents are a real safety category.
- Mobile signal in Dahab is patchy. **Offline is a designed state, not an
  error.**

---

## 9. Every bug this project has already produced

Do not rediscover these.

1. **`packages/config/tailwind/base.js` had never worked.** Both it and the
   generated preset used `module.exports` inside `"type": "module"` packages,
   so Node parsed them as ESM. Renamed to `.cjs`, export maps updated.
2. **A Turbo build cycle.** Adding `@dahab/tokens` as a dependency of
   `@dahab/config` created `@dahab/config#build ↔ @dahab/tokens#build`.
   Reverted — each app composes the Tailwind preset itself.
3. **`@dahab/i18n` was unusable on a server** (see §7). Split into three
   entry points.
4. **Fonts silently absent** — a page drew in a system font and the gate
   caught it. Each app now has a `copy-fonts.mjs` wired to `predev`/`prebuild`.
5. **Bidi, twice** — "6 kt" landed at the wrong end of an Arabic line; later a
   guide's Latin name jumped out of an Arabic greeting.
6. **Raw ramp tokens break dark mode silently** (see §7).
7. **Mark `noFlip` was inverted** (see §7).
8. **`SOS` generated as `sOS`** — the camel-case helper in the mark generator
   uppercased per-word without lowering the rest.
9. **`CLAUDE.md`'s abstract-mark list was wrong in both directions** — it named
   `weave`, which has a silhouette, and omitted `palm` and `offline`, which do
   not.
10. **`react-native-svg`'s `translateX`/`translateY` reach the DOM on web** and
    React rejects them. Use a transform string.
11. **Every pricing fixture shape was guessed wrong** the first time. Zod
    rejected all of them: `Money` is `amount`, not `amountMinor`; a percentage
    adjustment is `rate` as a **fraction** (`-0.1`), not a whole number;
    the participant-kind condition takes `participants`, not `kinds`; the
    group-size condition takes `minPartySize`, not `minSize`.
12. **The `participant.*` i18n namespace did not exist at all**, so the pricing
    engine's `participant.${kind}` line labels rendered as raw keys.
13. **A broken commit was pushed** — `git commit` was run in the same command
    as `pnpm verify`, so a failing `@dahab/ui-web` typecheck went out. Fixed in
    the next commit. **Read the gate's output before committing.**

---

## 10. What is real and what is not

**Keep this section honest. It is the first thing the next person reads.**

**1. All eight admin screens read the database, through the API, over HTTP.**
No screen in `apps/admin` reads a fixture any more — the fixture modules were
deleted, not commented out. Every figure on every board is a query against
Supabase: the roster's ratings, the ledger's eight balances, the departures'
seat counts, the catalogue's "on N services", the cancellation cascade.

**2. The data behind it is a seed, not production traffic.** `pnpm db:seed`
writes an operating week: 12 services across 7 operators, 7 departures, 23
bookings, 23 payments, 2 refunds, 10 payouts, 153 balanced ledger legs, 9
reviews, 2 incidents, 2 disputes. It is real Dahab — the real sites,
neighbourhoods and operators — with one exception stated in
`packages/db/src/seed/operations.ts`: the travellers are named because a
manifest with no names on it cannot be read, and they are the only fictional
thing in the database.

**3. Three things are genuinely absent, and the console says so rather than
filling them in.**

- **No weather source.** A01's conditions strip and A05's "wind above this
  operator's limit" both read "No weather source connected". A plausible wind
  speed on the screen that decides whether a boat sails would be the most
  dangerous placeholder in the product. A05 previews a cancellation for a
  departure you pick instead of one a forecast picked.
- **No exchange-rate feed.** A06's header says so. `exchange_rates` exists and
  is empty.
- **No writes, so no audit log.** A08's audit panel is empty and explains why.
  "Cancel the departure", "Review" and "Confirm" are `disabled`, not merely
  unwired — a button that silently does nothing is worse than one that is not
  there yet.

**4. Nothing authenticates.** Anyone who opens either URL is in. The console
talks to the API with a long-lived service token in `.env`
(`DAHAB_ADMIN_TOKEN`). The OTP flow exists in `apps/api` and needs wiring.

The honest-failure pattern is the house style here. `apps/admin/lib/api.ts`
classifies a failure as `unreachable` / `noDatabase` / `forbidden` /
`unauthorized` and `DataProblemNotice` renders it, **per panel** — the roster
and the verification queue are separate procedures with separate permissions,
so one failing must not blank the other. **A console that renders an empty
table when the API is down is lying**, and "nothing is expiring" is the one
wrong answer the expiry board must never give.

---

## 11. The database

**Closed as of session 4.** Supabase Postgres, project `oggsssfydturfqjynwli`,
reached through the session pooler. PostGIS 3.3.7 is enabled, all 59 tables
and 7 GIST indexes are applied, and both `pnpm db:migrate` and `pnpm db:seed`
run clean and are idempotent — re-seeding replaces the seeded set and moves
every relative date forward rather than duplicating rows.

The connection string lives in `.env` as `DATABASE_URL`. **`.env` is gitignored
and the password must never enter the repo, a commit, or a browser form.**

`.env.example` documents every variable: `DATABASE_URL`, `REDIS_URL`, `PORT`,
`NODE_ENV`, `AUTH_SECRET`, `OTP_TRANSPORT`, `DAHAB_API_URL`,
`DAHAB_ADMIN_TOKEN`.

Two things to know before touching it:

- The machine has no Docker, no psql, no WSL and no admin rights, so the local
  `docker-compose.yml` still cannot run. Everything goes through the cloud
  instance.
- The Supabase↔Vercel integration provisions `POSTGRES_URL`, not
  `DATABASE_URL`. Anything deployed that reads the database needs the name
  mapped or the variable set explicitly.

---

## 12. How to work here

**Environment.** Windows 11, PowerShell primary (a Bash tool is also
available — each takes its own syntax). Node 22, pnpm 9.15.9, Turborepo.
No Docker, no psql, no WSL, no admin rights.

**Commands.**

```
pnpm verify   # typecheck + lint:hardcoded + test:tokens + test:i18n + test
pnpm shoot    # build the gallery and screenshot it
pnpm dev      # everything
pnpm --filter @dahab/admin dev    # port 4310
pnpm --filter @dahab/vendor dev   # port 4320
pnpm db:migrate && pnpm db:seed   # needs DATABASE_URL
```

**Both gates run at the end of every session. They are gates, not
conveniences.**

`pnpm lint:hardcoded` forbids a hex colour, a raw font size or a magic spacing
number anywhere outside `tokens.json`. Do not disable it.

`pnpm shoot` screenshots the gallery in light-LTR, dark-LTR, ar-RTL and
de-LTR. It **fails** if the requested theme and direction did not reach the
document, if a bundled face did not load and the page is drawing in a system
font, if the capture is cropped, or if any two images are identical. Four
identical screenshots is what this project shipped before the gate existed.
`apps/gallery/tests/shoot-gate.test.ts` runs it against a deliberately broken
fixture and requires it to fail, so weakening the gate breaks a test.

**Working agreement.**

- TypeScript strict, with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. No `any` in `packages/`. Zod at every boundary.
- Follow the design file exactly. If a value is missing, flag it as an open
  question in the session doc and use an **obviously provisional** placeholder
  — never a plausible guess.
- **Stop and ask before adding a dependency.**
- Commit in logical chunks with real messages. The existing log is the style
  guide: `feat(admin): the catalogue and taxonomy manager`,
  `fix(config,tokens): make the Tailwind artefacts real CommonJS`.
- Read the gate output **before** committing.
- Comments explain *why*, and name the failure the code prevents. Match the
  density of the surrounding file — this codebase comments decisions, not
  syntax.

---

## 13. Suggested order from here

1. **Auth**, so neither surface is open to anyone with the URL. It is now the
   largest single gap: the console reads real bookings, real money and real
   incident reports, and nothing checks who is looking.
2. **The writes**, starting with document verification and the weather
   cancellation — both already have their previews built and both previews are
   computed from the same rows a commit would touch. Each write needs a reason
   field, a confirmation and an audit row. `audit_log.reason` exists for this,
   and A08's audit panel is waiting for the first one.
3. **A weather source.** It is the only thing standing between A05's
   cancellation preview and the feature the screen was designed for. Until
   then the screen says plainly that nothing is flagged.
4. **The vendor app's own API wiring** — `booking.readVendor` and
   `payout.readOwn` need writing so a vendor session only ever sees its own
   rows. The vendor app is still on fixtures; the admin console is not.
5. **The traveller app.** `apps/traveler` has Board 04 Discover; boards 05–11
   are written in `docs/DESIGN-PROMPT-BOARDS-04-11.md` but not yet run through
   Claude Design, and nothing in the app reads the API yet.

**What the i18n catalogue still owes:** 625 keys × 7 locales = 4,375 messages
today. `participant.*`, `category.*` and `diveSite.*` now exist because
something renders them. Still missing: `attribute.diving.*`, `certLevel.*`,
`neighborhood.*`, `gas.*` — every one of those is currently shown as its raw
slug somewhere in the console.

**What the design board still owes** (from `docs/CANVAS-FIXES.md`):

- Night `text-brand` — coral text at night — has no value in any export, so
  nothing uses coral text in Night Dive.
- `info-text` on `info-surface` computes 4.29 against a 4.5 bar, and so does
  the secondary button pair (`lagoon-600` on `mint-50`). Neither pair is used.
- `clay-700` on `cream-100` is 4.39; `#786757` would clear both grounds.
- Table row hover and selected states, and a dense-table type role below
  Small 13/20, are drawn as proposals rather than adopted.
- The desktop grid is not tokenised: `--admin-rail` (248px) and
  `--admin-content-max` (1120px) live in the console's `globals.css` as marked
  proposals, because `tokens.json`'s `grid` section describes the 390px phone
  reference only. They belong in tokens once the board ratifies them.
