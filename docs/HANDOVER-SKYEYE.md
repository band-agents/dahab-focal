# Sky Eye — the admin console, as of 25 Sep 2026

Read this after `CLAUDE.md` and before `docs/HANDOVER.md`. `HANDOVER.md` is the
whole project up to 15 Sep; everything it says about the admin console is
superseded by this file. What it says about the traveller app, the design
system, the schema and the i18n machinery is still true.

---

## 1. Where things are

| | |
|---|---|
| Repo | `C:\Users\DANNN\dahab-focal` — `band-agents/dahab-focal`, private |
| Branch | `feat/admin-console`, pushed, open as **PR #1**, not merged |
| Vendor-dashboard fork | a separate worktree, `C:\Users\DANNN\dahab-focal-vendor`, branch `feat/vendor-dashboard`, forked at `b599783`. Being worked on in a parallel chat. **Do not edit it from here.** |
| Console code | `apps/admin` (Next.js 15) |
| Console components | `apps/admin/components/console/` — not `packages/ui-web` (see §4) |
| API | `apps/api` (tRPC over HTTP) |
| Database | Supabase, free tier, eu-west-1, project ref `oggsssfydturfqjynwli`. URL in `.env` (gitignored) |

Ports: API **4000** · console **4310** · operator app **4320** · traveller **4330**.

Launch configs live in `C:\Users\DANNN\.claude\launch.json`, not in the repo:
`dahab-api` (dev), `dahab-admin` (dev), **`dahab-admin-prod`** (production
build), `dahab-vendor`, `dahab-traveler`.

---

## 2. Running it

**Run the console as a production build.** Development mode was most of the
"very slow" complaint: it compiles each route the first time it is opened
(2–3 s) and renders unminified React. A production build answers in
~200–300 ms.

```powershell
pnpm -C C:\Users\DANNN\dahab-focal --filter @dahab/admin build
```

then start `dahab-admin-prod`. **It does not pick up code changes** — rebuild
and restart after every edit. The API runs in dev (`node --watch`) and does
reload itself.

`next build` writes into `apps/admin/.next`, the same folder `next dev` uses.
Building while a dev server runs leaves the dev server stale. If the console
ever serves CSS without the `c-*` utilities, or throws "X is not defined" for
something that is plainly imported: stop it, `rm -rf apps/admin/.next`, start
again. That has happened twice.

**Accounts.** Console staff sign in with a password; travellers and centre
staff sign in by one-time code. There are seeded accounts — an admin, a
Fanous Divers owner and a Fanous Divers guide — whose passwords were
written in a chat in plain text and **have never been rotated. Rotate
them before anything is deployed:**

```powershell
pnpm -C C:\Users\DANNN\dahab-focal staff:create --email <address> --role admin
```

It resets an existing account and prompts for the password without echoing it.
No password is ever set from the console — that is deliberate (§5).

---

## 3. The database pauses

Supabase's free tier **pauses the project after 7 days without traffic.** The
symptom is `/health` reporting `database: unavailable` and the API log line:

```
(ENOTFOUND) tenant/user postgres.oggsssfydturfqjynwli not found
```

It is not a code bug. Dan restores it from the Supabase dashboard; after that,
the pooler takes about **two minutes** to accept connections again. Restart the
API once it does, so it opens a fresh pool.

The local Postgres 17 under `C:\src\pgsql` (from the Labesny project) **cannot
stand in**: it has no PostGIS, and the first migration runs `CREATE EXTENSION
postgis`. Installing PostGIS there means downloading binaries into a Postgres
another project uses — ask first.

Before real users: upgrade the Supabase project, or schedule a request every
few days to keep it awake.

---

## 4. What the console is now

Nine commits on this branch between 16 and 25 Sep. In order:

**A separate visual system.** The console no longer uses the traveller app's
cream, blush and hand-drawn marks. It is "Daylight": `c-*` tokens in
`packages/tokens/tokens.json` (near-white ground, lagoon `#0E7F80` accent,
IBM Plex Sans / Plex Sans Arabic / Plex Mono), plus five area colours
(`c-area-run|supply|demand|money|platform` and `-ink`) and a frosted `c-glass`.
All contrast pairs are in the gate. The traveller app never reads a `c-*` token.

**Phone-first.** The navigation — a five-slot floating tab bar below `lg`, a
rail above it — lives in `app/[locale]/(console)/layout.tsx`, so it persists
across taps instead of being rebuilt. Active state comes from `usePathname()`
in `components/console/Nav.tsx`. Every screen has a breadcrumb and a back
button that means *up*, not browser history (`PageHeader.tsx`, crumbs derived
in `ConsoleShell.tsx`). `(console)/loading.tsx` draws a skeleton the instant a
tap lands.

**Home** (`/home`, first tab): what needs a decision now (non-zero only), quick
actions, every working module as a phone-style launcher coloured by area with
a search that opens the first match on Enter, and the unbuilt modules folded
into one line.

**The module map** — `apps/admin/lib/modules.ts`. 29 modules: **10 live, 6
partial, 13 planned**, each naming the tables it owns. `tests/modules.test.ts`
fails if a module claims a table no schema file declares, if a planned module
carries a link, or if the tab bar ever has more than five slots.

**Detail pages**: an operator (`/vendors/[id]`) and a person (`/people/[id]`),
each with its papers/team/money/incidents and the actions on it.

**Accounts**: create, edit, suspend/restore, end sessions, grant/revoke a role,
suspend/reactivate an operator. **Sub-users are `user_roles.vendor_id`** — an
owner and their guides share a vendor-scoped role; there is no second
hierarchy.

**Speed**: every query is a ~75 ms round trip to Ireland. Independent queries
now run in parallel (`Promise.all`) or as subqueries: the overview went from
1.1–1.6 s to 156 ms, the per-page session check from 300 to ~150 ms, the ledger
and person pages to a single round trip. Pool connections recycle
(`idle_timeout: 20`, `max_lifetime: 30 min` in `packages/db/src/client.ts`)
because the pooler closes idle ones and a dead socket failed the next request.

**Pricing** (`/pricing`, `/pricing/[id]`, added 25 Sep, read-only): every
service's model, base price and rule count; per service, the rules in words
and a price check. The check is a plain GET form (`?adult=2&child=1&on=…`)
and the figure is worked out by the API (`admin.servicePricing`) with
`computePrice()` — not in the page, for two reasons: it is the path checkout
will take, and `@dahab/api-contract` imports the `@dahab/i18n` barrel, which
cannot load in a server component. Gated on the new `pricing.readAny`.
Changing a price is not built.

The three pricing tables were **empty** — the module map called them
seeded. They are now written by the seed (`packages/db/src/seed/pricing.ts`)
from the same per-head prices and child/resident/student rates the seeded
bookings were charged with, and `packages/db/tests/seed-data.test.ts` runs all
23 bookings back through `computePrice()` and requires the charged total to
the piastre. On the live database only the pricing step was run (12 models,
36 rules), not the whole seed, so the operating week's dates were not moved.
A count on 25 Sep found nine more tables empty; the list is in the header of
`modules.ts`.

---

## 5. Patterns to follow — and why

- **Every write**: a reason (min 8 characters, checked on both sides), one
  transaction, an audit row with before and after. See
  `apps/api/src/routers/admin-writes.ts` and `admin-user-writes.ts`.
- **Every decision in the UI** goes through `<ActionPanel>` — fields, a
  mandatory reason, a confirm whose intent decides accent vs danger ink, and a
  way out. Panels open from `?act=` on the page's own URL; plain HTML forms and
  Server Actions, no client JS. New actions are a descriptor, not a new screen.
- **`role.grant` is separate from `user.manage`.** Anyone who can grant a role
  can grant themselves everything, so it is its own gate — checked separately
  inside `createUser` too. The platform's last admin role cannot be revoked by
  anyone; nobody can suspend the account they are signed in with; suspending revokes
  every session in the same transaction.
- **No password crosses the console.** Accounts are created without one.
- **`<RecordList>`** replaces tables: one column definition renders a phone
  record and a desktop table. Every column needs a `role` (`primary`,
  `secondary`, `end`, `column`); status belongs in `end`.
- **Every figure is a door**: a `<Stat>` with an `href` renders as a link.
- **A planned module is never a link.**
- Tones are `success | warning | danger | info | neutral` everywhere.

---

## 6. Bugs this branch found — do not reintroduce

| Bug | Rule |
|---|---|
| A `Date` inside a raw `` sql`…` `` template reaches the driver as an object and 500s | Use `gt()`, `lt()` etc. Never interpolate a Date into raw SQL. (Twice now.) |
| Sign-in said "wrong password" when the database was down | Only `UNAUTHORIZED`/`BAD_REQUEST` mean invalid credentials |
| `redirect()` inside a `try` is caught by its own `catch` | Set a flag in the try, redirect after it |
| A UTC date compared against a `local_date` column | `cairoDay()` in `apps/api/src/routers/_shared.ts` |
| Raw slugs on screen (`blue-beach`, `travelerReceivable`) | `neighborhoodKey()` in `lib/nav.ts`; names go through i18n |
| Arabic in a figure slot spaced out letter by letter | The figure font stack falls back to Plex Sans Arabic; phrases use the UI face |
| Money figures clipped by 12 px | Currency `<Stat>`s are `wide`; the grid is 2 / 3 / 4 columns |
| An entrance animation starting at opacity 0 | Animate position only — a paused animation in a background tab is a blank page |
| `NOT_FOUND` from tRPC reported as "API unreachable" | `lib/api.ts` classifies it as `notFound`; detail pages turn it into a 404 |
| A class assembled like `` `bg-c-area-${x}` `` never reaches the stylesheet | Write every class out in full |
| `modules.ts` called `pricing_*`, `availability_templates`, `exchange_rates` and others "seeded"; a row count found them empty | Count the table before building on it. A module over an empty table needs its seed as well as its screen |
| `@dahab/api-contract` in a server component pulls in the `@dahab/i18n` barrel (react-i18next), which throws there | Compute in the API and return the result; the console renders it |
| `categories.name_key` holds keys (`category.scubaDiving` …) the catalogue never had, so the catalogue screen still prints `row.categorySlug` | The six keys now exist in all seven locales; render `t(nameKey)`. The catalogue page itself is not fixed yet |
| `admin.serviceQueue` was gated on `catalog.publish`, which every vendor owner holds, and had no vendor filter — any owner could list every operator's drafts | An `admin.*` procedure never takes a vendor-scoped permission (`catalog.publish`, `pricing.manage`, `resource.manage`, `staff.manage`, …); it takes the `*Any` form. `apps/api/tests/admin-scope.test.ts` sweeps the whole router as every non-admin role |

---

## 7. What is not done

In rough order of value:

1. **The 13 planned modules**, and pricing writes. (Pricing reads are live.) Was: `pricing_models`, `pricing_tiers`
   and `pricing_rules` are seeded and nothing in the console can see them. Then
   exchange rates, the fleet (tanks' hydrostatic test dates), availability and
   blackout dates, the inbox, and the comparison engine — the product's reason
   to exist, with no screen that tunes it.
2. **Actions still pointing elsewhere**: refund, ledger reversal, cancelling a
   trip from a booking row (it only exists on the Bookings board).
3. **Translations.** en-GB and ar-EG are complete. **1,112** messages in
   ru/it/fr/es/de are English placeholders declared in
   `$meta.needsTranslation` — visible to the gate, not silently missing.
4. **Never deployed.** Configs exist (`docs/DEPLOY.md`); nothing is online.
5. **PR #1 unmerged.** 53 commits ahead of `master`.
6. **Rotate the seeded passwords** (§2).
7. **Merging with the vendor fork.** The files most likely to conflict are
   `packages/tokens/tokens.json`, `packages/tokens/tests/tokens.test.ts` and the
   seven `packages/i18n/messages/*.json`. Both sides only add entries, so
   resolving means keeping both. Re-run `pnpm --filter @dahab/tokens build` and
   `pnpm test:i18n` after.
8. `docs/HANDOVER.md` and `docs/SESSION-ADMIN-VENDOR.md` still describe the
   console as it was on 15 Sep.

---

## 8. Gates

`pnpm verify` must be green before every commit: typecheck, `lint:hardcoded`
(no hex, no raw font size, no raw shadow outside `tokens.json`), token contrast
tests, `check-locales` (every key in all seven files, ICU valid, plural
categories complete — Russian needs four, Arabic six), and the test suites.
Last run (25 Sep, after Pricing): 12 tasks green, 1,045 keys × 7 locales.

`pricing_models` has no `unit_basis` column, and the contract requires one for a
`perUnitPerDay` (rental) model — so no rental can be quoted until the schema
gains it. The price check says so rather than guessing.

`pnpm shoot` is for the gallery and has not been part of console work.
