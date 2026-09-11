# The admin console and the vendor app

What was built on `feat/admin-console`, what it is honest about, and what is
still owed. Written to be read before touching either surface.

`docs/FOUNDATION.md` covers sessions 1 and 2 (the backend packages and the
design import). This file continues from there.

---

## What exists now

| Surface | State |
| --- | --- |
| `apps/admin` — Sky Eye console | Next.js 15, **8 screens**, all wired to the API |
| `apps/vendor` — operator app | Expo, **5 screens**, Arabic-first, role-split |
| `packages/ui-web` | Web component library, marks + 4 primitives |
| `packages/ui` | The same library for React Native |
| `packages/tokens` | Now also owns the 55 generated marks |
| `apps/api` | Live Supabase Postgres + a 17-procedure admin router (reads) |
| `apps/traveler` — traveller app | Expo, Board 04 Discover, on fixtures |

**228 tests across 12 packages.** `pnpm verify` and `pnpm shoot` both pass.

### The admin console — `/[locale]` on port 4310

A01 Today · A02 Operators & verification · A03 The expiry board ·
A04 Catalogue & taxonomy · A05 Bookings · A06 Money · A07 Safety & trust ·
A08 Platform.

Every locale is a real route, so `dir` is a document fact rather than a
runtime toggle. Light and Night Dive both work.

### The vendor app — port 4320

V01 Today · V02 Bookings · V03 Services · V04 Pricing · V05–V07 on More.

V04's simulator calls `computePrice()` from @dahab/api-contract — the same
function the checkout and the comparison engine call — so what an operator
sees is what a traveller is charged, with no second implementation to drift.

Driven by URL parameters while there is no auth: `?role=vendorOwner|vendorStaff`,
`?locale=`, `?theme=`. Arabic is the default, not English.

---

## What this codebase is deliberately honest about

**1. The console reads the database. The vendor app does not.**

All eight admin screens query Supabase through `apps/api` over HTTP. The
fixture modules under `apps/admin/lib/` were deleted, not commented out — if
you want to add data to a console screen, the thing you want is a procedure in
`apps/api/src/routers/admin.ts`. `apps/vendor` and `apps/traveler` are still
on fixtures.

**2. The data is a seed, and it says so.**

`pnpm db:seed` writes a live operating week: services, departures, bookings,
participants, payments, refunds, payouts, a balanced double-entry ledger,
reviews, incidents and disputes. Dates are relative to the seed's own "today",
so re-seeding produces a current week rather than a museum piece. Everything
is real Dahab except the travellers' names, which exist because a manifest
with no names on it cannot be read — `packages/db/src/seed/operations.ts` says
so in its header.

**3. Three sources genuinely do not exist, and the screens say so.**

No weather provider (A01's conditions strip and A05's risk banner), no
exchange-rate feed (A06's header), and no writes — so A08's audit log is
empty and explains why. Each of those is a sentence on the screen, not a
plausible number. A wind speed nobody measured, on the screen that decides
whether a boat sails, is the most dangerous placeholder this product could
carry.

**4. Nothing writes, and nothing authenticates.**

Every admin procedure is a read. "Cancel the departure", "Confirm" and
"Review" are `disabled`, not merely unwired. The writes each need a reason
field, a confirmation and an audit row, which is its own pass rather than
something to bolt on — and the cascade preview exists precisely so that
committing one is a deliberate act.

Anyone who opens either URL is in. The console authenticates to the API with a
long-lived service token in `.env`; the OTP flow exists in `apps/api` and
needs wiring.

---

## Decisions worth knowing before you change something

**Semantic tokens only, never the ramp steps.** `cream-100`, `mint-50` and
`ink-900` carry no Night Dive value, so a component built from them silently
stays light on a dark ground. It type-checks perfectly and is invisible until
you switch themes. `packages/ui-web/tests/contracts.test.ts` asserts the
primitives do not reach for one.

**The marks are generated, not drawn.** `packages/tokens/src/marks.ts` comes
from `scripts/generate-marks.mjs` reading the approved `Board 03 - Home.dc.html`.
Regenerate rather than hand-edit. Both UI packages read it, so a board change
reaches every surface at once.

**Two mark components, one rule.** The web and React Native implementations
exist because the runtimes do. Both draw a 100-unit viewBox, a family-tint
silhouette at +4/+4, and the ink-line over it, thickening to 4.6 at 24px and
below. Mirroring is the transform and `noFlip` is its absence — an SVG does
not mirror itself when the layout does, and getting that backwards was a real
bug on this branch.

**`@dahab/i18n` has three entry points.** The barrel pulls in `react-i18next`,
whose module body calls `createContext()` on import and therefore throws in a
React Server Component. Use `@dahab/i18n/server` from anything that renders on
a server; `@dahab/i18n/react` carries the hooks.

**Interpolated Latin text inside an Arabic sentence must be isolated.** Names,
sites, units and references all reorder under the bidi algorithm otherwise.
`isolate()` from `@dahab/i18n`. This produced visible bugs twice on this
branch — "6 kt" landing at the wrong end of a line, and a guide's name
jumping out of a greeting.

**The desktop grid is not tokenised.** `tokens.json`'s `grid` section
describes the 390px phone reference only, so `--admin-rail` (248px) and
`--admin-content-max` (1120px) are declared once in the console's
`globals.css` as marked proposals. They belong in tokens once the board
ratifies them.

---

## What the design board still owes

Unchanged from `docs/CANVAS-FIXES.md`, minus what section 09 settled:

- Night `text-brand` — coral text at night — has no value in any export, so
  nothing uses coral text in Night Dive.
- `info-text` on `info-surface` computes 4.29 against a 4.5 bar, and so does
  the secondary button pair (`lagoon-600` on `mint-50`). Neither pair is used.
- `clay-700` on `cream-100` is 4.39; `#786757` would clear both grounds.
- Table row hover and selected states, and a dense-table type role below
  Small 13/20, are drawn as proposals rather than adopted.

## What the i18n catalogue still owes

625 keys across seven locales now. `participant.*`, `category.*` and
`diveSite.*` are closed, each because something started rendering them — the
pricing engine's line labels, the traveller app's category tiles, and the
console's departure and incident rows. Still missing: `attribute.diving.*`,
`certLevel.*`, `neighborhood.*` and `gas.*`, and every one of those currently
shows as a raw slug somewhere in the console.

---

## Reading the admin router

`apps/api/src/routers/admin.ts` is the whole console's data layer, and three
habits in it are worth copying rather than rediscovering.

**Count in SQL, not in JS.** The roster's service and staff counts, the
catalogue's "missing comparable answers" and the category totals are all
subqueries. A vendor with four hundred services must not arrive as four
hundred rows nobody renders.

**Give every joined subquery's aggregate its own SQL alias.** Three joined
subqueries all exposing a column called `total` is ambiguous to Postgres the
moment one is referenced unqualified, and the error surfaces as a
`DataProblemNotice` on a screen rather than as a type error. That cost a debug
cycle on this branch.

**Derive, do not store twice.** A payout keeps one number — the net that left
the account — and its gross, commission and fees are read back off the ledger
for the payout's own period. The four figures on the screen therefore add up,
and a corrected ledger corrects the explanation with it.

---

## Suggested order from here

1. **Auth**, so neither surface is open to anyone with the URL. It is now the
   largest gap: the console shows real bookings, real money and real incident
   reports to anyone who loads it.
2. **The writes**, starting with document verification and the weather
   cancellation — both already have their previews built, and both previews
   are computed from the same rows a commit would touch.
3. **A weather source**, which is the only thing between A05's preview and the
   feature the screen was designed for.
4. **The vendor app's own API wiring.** `booking.readVendor` and
   `payout.readOwn` procedures need writing so a vendor session only ever sees
   its own rows.
