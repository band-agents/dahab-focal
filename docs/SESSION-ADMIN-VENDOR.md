# The admin console and the vendor app

What was built on `feat/admin-console`, what it is honest about, and what is
still owed. Written to be read before touching either surface.

`docs/FOUNDATION.md` covers sessions 1 and 2 (the backend packages and the
design import). This file continues from there.

---

## What exists now

| Surface | State |
| --- | --- |
| `apps/admin` — Sky Eye console | Next.js 15, **8 screens**, 1 wired to the API |
| `apps/vendor` — operator app | Expo, **4 screens**, Arabic-first, role-split |
| `packages/ui-web` | Web component library, marks + 4 primitives |
| `packages/ui` | The same library for React Native |
| `packages/tokens` | Now also owns the 55 generated marks |
| `apps/api` | Database handle + admin router (reads) |

**215 tests across 11 packages.** `pnpm verify` and `pnpm shoot` both pass.

### The admin console — `/[locale]` on port 4310

A01 Today · A02 Operators & verification · A03 The expiry board ·
A04 Catalogue & taxonomy · A05 Bookings · A06 Money · A07 Safety & trust ·
A08 Platform.

Every locale is a real route, so `dir` is a document fact rather than a
runtime toggle. Light and Night Dive both work.

### The vendor app — port 4320

V01 Today · V02 Bookings · V03 Services · V05–V07 on More.

Driven by URL parameters while there is no auth: `?role=vendorOwner|vendorStaff`,
`?locale=`, `?theme=`. Arabic is the default, not English.

---

## The three things this codebase is deliberately honest about

**1. Seven of the eight admin screens read fixtures, not the database.**

Only A03 (the expiry board) goes through the API. The fixtures in
`apps/admin/lib/` are shaped like the db so swapping them is a change of
import, but they are hand-written numbers. Nothing on those screens has been
proven against a real query.

**2. There is no database yet.**

The schema has still never been applied to a live Postgres. `pnpm db:migrate`
has not run. The API's health check reports `degraded` and
`database: unavailable`, which is the truthful answer — and the test asserts
it, because a green health check on a server that cannot reach its database is
the failure that assertion exists to prevent.

To finish this: create a Postgres with PostGIS (Neon or Supabase both do),
`CREATE EXTENSION postgis;`, put the connection string in `.env` as
`DATABASE_URL`, then `pnpm db:migrate && pnpm db:seed`.

**3. Nothing writes.**

Every admin procedure is a read. "Cancel the departure", "Confirm", "Review"
and "Check in" are all inert. The writes each need a reason field, a
confirmation and an audit row, which is its own pass rather than something to
bolt on — and the cascade preview exists precisely so that committing one is a
deliberate act.

There is also **no authentication**: anyone who opens either URL is in. The
OTP flow exists in `apps/api` and needs wiring.

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

---

## Suggested order from here

1. **A database.** Everything below is easier once queries can be run.
2. **Auth**, so neither surface is open to anyone with the URL.
3. **The writes**, starting with document verification and the weather
   cancellation — both already have their previews built.
4. **The remaining admin screens onto the API**, following A03's pattern
   including its `DataProblemNotice`: an empty table when the API is down is a
   lie, and "nothing is expiring" is the one wrong answer that board must
   never give.
5. **V04 Pricing**, the one vendor board not yet started. It needs the
   priority-order UI that makes rule compounding visible, and it must call
   `computePrice()` rather than reimplementing it.
