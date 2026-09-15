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
| `apps/vendor` — operator app | Expo, **5 screens**, Arabic-first, signed in, on the API |
| `packages/ui-web` | Web component library, marks + 4 primitives |
| `packages/ui` | The same library for React Native |
| `packages/tokens` | Now also owns the 55 generated marks |
| `apps/api` | Live Supabase Postgres, 21 admin reads + 3 writes, password sign-in |
| `apps/traveler` — traveller app | Expo, Board 04 Discover, on fixtures |

**263 tests across 12 packages.** `pnpm verify` and `pnpm shoot` both pass.

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

Signed in with an email and a password, like the console. The role comes from
the account's own `user_roles`, not from a query string — and a platform admin
or a traveller is refused here, because neither has any business being shown
one centre's manifest.

`?locale=` and `?theme=` still read the URL, so the app can be opened in Night
Dive or in German without an account for a screenshot or a translation check.
Arabic is the default, not English.

---

## What this codebase is deliberately honest about

**1. Both dashboards read the database. The traveller app does not.**

All eight admin screens and all five operator screens query Supabase through
`apps/api` over HTTP. The fixture modules were deleted, not commented out —
`apps/admin/lib/`'s in session 4, `apps/vendor/src/day.ts` and
`operations.ts` in session 5. If you want to add data to a screen, the thing
you want is a procedure in `admin.ts` or `vendor.ts`. `apps/traveler` is
still on fixtures.

**Every operator procedure pins its vendor from the session and none takes a
vendorId as input.** That is the whole safety property: a vendor id in an
input is a vendor id an operator can change. Proven against two accounts at
two different operators — neither sees the other's rows, and a guide is
refused money and staff outright.

**2. The data is a seed, and it says so.**

`pnpm db:seed` writes a live operating week: services, departures, bookings,
participants, payments, refunds, payouts, a balanced double-entry ledger,
reviews, incidents and disputes. Dates are relative to the seed's own "today",
so re-seeding produces a current week rather than a museum piece. Everything
is real Dahab except the travellers' names, which exist because a manifest
with no names on it cannot be read — `packages/db/src/seed/operations.ts` says
so in its header.

**2b. Two gaps in the seed, which the operator app now shows plainly.**

- **`pricing_models` is empty.** The seed writes services, departures,
  bookings and payments, but no pricing model — so `computePrice()` has
  nothing to read for a real service and V03 says "not priced" against every
  listing. That is the truthful answer and the screen gives it rather than
  inventing a number, but the seed owes the rows.
- **No waivers, and only the lead traveller is named.** `waivers` is never
  written, so every manifest reads as fully outstanding; and
  `write-operations.ts` names seat 1 and writes `Name pending check-in` for
  the rest — an English sentence in a name column, which shows untranslated on
  an Arabic manifest.

**3. Two sources genuinely do not exist, and the screens say so.**

No weather provider (A01's conditions strip and A05's risk banner) and no
exchange-rate feed (A06's header). Each is a sentence on the screen, not a
plausible number. A wind speed nobody measured, on the screen that decides
whether a boat sails, is the most dangerous placeholder this product could
carry.

A08's audit log is no longer among them: it fills up as soon as anyone
verifies a document or cancels a departure.

**4. Three things write. Everything else is still a read.**

`reviewDocument`, `reviewService` and `cancelDeparture`. Each one requires a
reason, runs in one transaction, and leaves an audit row with both sides of
the change — which is why they live in `admin-writes.ts` rather than beside
the reads, so a fourth cannot be added without those three rules.

Each re-reads its row first and refuses with a CONFLICT if it has moved. Two
admins on one queue is the normal case and the second must not silently undo
the first.

Not yet written: suspending an operator, moderating a review, resolving a
dispute, reversing a ledger entry. Those screens still show state only.

**5. Both surfaces have a front door, and there is no sign-up.**

Staff sign in with an email and a password; `pnpm staff:create` makes an
account and `--disable` takes one away. Travellers keep the one-time code
path, which still needs its challenge table wired and an SMS gateway chosen.

The console's protection is structural: the eight boards live in a
`(console)` route group whose layout requires a session, so a new board added
there is protected by existing. The middleware turns away anyone with no
cookie; the layout asks the API who the caller is on every render, which is
what makes revocation take effect at once.

**There is no service credential any more.** `DAHAB_ADMIN_TOKEN` is gone from
the call path — a long-lived admin token in an environment variable is the
same "anyone who reaches this is in" problem, only harder to notice and
impossible to revoke per person. Every call carries the operator's own token,
which is what lets the audit log name them.

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

1. **The vendor app's own API wiring.** It has a real login now and still
   reads fixtures behind it, which is the most misleading combination in the
   repo — a signed-in owner looking at someone else's invented week.
   `booking.readVendor` and `payout.readOwn` need writing so a vendor session
   only ever sees its own rows.
2. **A weather source.** The only thing between A05's cancellation preview and
   the feature the screen was designed for. Until then the screen says plainly
   that nothing is flagged, which is the right answer but not the useful one.
3. **The remaining writes** — suspend an operator, moderate a review, resolve
   a dispute, reverse a ledger entry. The pattern is set in
   `apps/api/src/routers/admin-writes.ts`; follow it rather than inventing a
   second one.
4. **Rate limiting in front of the API.** Sign-in has a per-account lockout,
   but nothing limits by IP — and a hostel's shared connection is one IP and
   forty travellers, so an IP limit needs designing rather than adding.
5. **The traveller app.** `apps/traveler` has Board 04 Discover; boards 05–11
   are written in `docs/DESIGN-PROMPT-BOARDS-04-11.md` but not yet run through
   Claude Design, and nothing in the app reads the API.

## Deploying

`docs/DEPLOY.md`. The API is a container or a Render/Railway service; the
console is Vercel with `DAHAB_API_URL` pointing at it. The API refuses to boot
without `AUTH_SECRET`, without `DATABASE_URL` in production, or with
`OTP_TRANSPORT=console` in production — a process that will not come up is a
deploy that fails loudly, and one that comes up broken is an outage nobody is
paged for.
