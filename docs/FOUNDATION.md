# Foundation

What this session built, what it deliberately did not, and every place a
judgment call was made that you should overrule if I got it wrong.

Session date: 2026-09-06. Six commits, 160 tests.

---

## The headline: the design was never read

**`packages/tokens`, `packages/ui`, `packages/ui-web` and `apps/gallery` are
blocked, and nothing visual was guessed.**

The `claude_design` MCP refuses every call with:

> DesignSync needs design-system authorization, and /design-login cannot run in
> this non-interactive session.

I retried it eight times across the session. `WebFetch` on the project URL
returns 403 — it needs the design authorization, not a browser. There is no
seeded copy on this machine: `C:\Users\DANNN\Desktop\dahab focal` exists and is
empty, and no `.dc.html` file for this project is anywhere on disk.

So I have read **none** of it: not `Design System.dc.html`, not `support.js`,
not the file list, not the traveler artboards. I cannot tell you the colour
ramps, the gradients, the type scale, the radii, the spacing scale, the
shadows, the icon list, the motion curves, or the component inventory. I also
cannot tell you how many files the project has.

### To unblock

Run this once in an interactive `claude` terminal on this machine, then tell me:

```bash
claude
```

then `/design-login` at the prompt. Headless and SDK runs reuse that
authorization afterwards. Failing that, export the project's files to a folder
and give me the path.

### What I did rather than guess

Three hex values are stated outright in the brief, and I confirmed each against
the contrast ratio it is quoted with rather than taking them on trust:

| Token | Value | Check |
| --- | --- | --- |
| `coral-500` | `#FF6B5A` | white on it computes to **2.7992** — the brief's 2.80 |
| dark `ink` | `#E8F1F0` | **15.934** on the dark surface — the brief's 15.9 |
| dark `surface` | `#04171E` | as above |

Those three are marked `provisional: false` in `tokens.json`. Every other
colour carries a single magenta sentinel, `#FF00FF`, chosen so a missed token
is impossible to look at without noticing. The four font families are recorded
because the brief names them (Fraunces, Rubik, Cairo, JetBrains Mono), but no
weight, size, line-height or letter-spacing is.

The contrast assertions for sentinel tokens are **deferred, not relaxed**. The
suite prints a `PENDING DESIGN IMPORT` banner naming every sentinel, and one
test asserts the file is still in `awaiting-design-import` — so the day you
flip that status, that test fails and whoever flips it has to watch the five
required and three forbidden assertions turn real before it goes green again.

---

## What was built

| Package | State | Tests |
| --- | --- | --- |
| `packages/config` | Complete | — |
| `packages/tokens` | Pipeline complete, palette absent | 23 |
| `packages/i18n` | Complete | 52 |
| `packages/api-contract` | Complete | 26 |
| `packages/db` | Schema and seed complete, never applied | 31 |
| `apps/api` | Auth scaffolding and catalogue reads | 28 |
| `packages/ui`, `packages/ui-web`, `apps/gallery` | **Not started** | — |
| `apps/traveler`, `apps/vendor`, `apps/admin` | **Not started** | — |

**160 tests, all passing.** `pnpm typecheck`, `pnpm lint:hardcoded`,
`pnpm test:tokens`, `pnpm test:i18n` and `pnpm test` are all green.

### `packages/config`

Strict tsconfig bases with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` on, prettier, a Tailwind base that holds no visual
values of its own, and a flat ESLint config carrying a local plugin,
`dahab-rtl/no-physical-properties`. It bans the physical margins and paddings,
`left:`/`right:`, the physical Tailwind utilities and `textAlign: 'left'`,
naming the logical replacement in each message.

### `packages/i18n`

113 keys × 7 locales, hand-translated. ICU throughout — no key-suffix
pluralisation, no sentence built by concatenation.

`check-locales` fails on a missing key, an orphan key, invalid ICU, an argument
present in en-GB but not a translation (or the reverse), and a plural block
that does not cover every CLDR category the locale uses. It also refuses to let
an untranslated string hide: a value byte-identical to en-GB must be declared in
`$meta.identicalToSource` or `$meta.needsTranslation`, and a stale declaration
fails too. It caught two undeclared identical values while I was writing it.

Money is integer minor units plus an ISO code. Ties round away from zero so
refunds are not systematically shaved. Direction is derived through
`useDirection()`, never inferred from the locale at a call site. Bidi isolation
uses FSI/PDI so a Latin dive-site name inside an Arabic sentence cannot drag its
punctuation across.

`I18nManager.forceRTL()` needs a reload, so the switch is a three-step
transaction — plan, apply, reload — with the platform injected rather than
imported, which keeps `react-native` out of the Next.js admin bundle.

### `packages/api-contract`

`computePrice()` is the only pricing implementation. Pure: `bookedAt` is an
argument, never `Date.now()`, so a disputed charge can be reproduced exactly
from the stored booking. Five pricing models, eight rule conditions, three
adjustment kinds, priority ordering with exclusion groups. 26 tests over a table
of stacked cases.

`attribute_definitions` is modelled as data with a normalisation rule per
attribute, and the options tree as variant → tier → group → option.

### `packages/db`

59 tables, 26 enums, 104 indexes, 132 check constraints, 7 GIST indexes, in two
migrations. The constraints that matter: exactly one value column set on
`service_attribute_values`; `booked_count <= capacity` so a boat cannot be
oversold; no zero-amount ledger leg; `categories.color_token` cannot start with
`#`; the options tree is depth-constrained per level.

The ledger is double-entry, append-only, corrected by reversal.

The seed is real Dahab: 12 categories, 9 dive sites with depths, hazards and
seasonal water temperatures, 6 neighborhoods, the 7 named operators, and the
diving attribute schema including the 25-row inclusions matrix.

### `apps/api`

tRPC with the permission matrix enforced as `requirePermission(...)`, never a
role check at a call site. Guest sessions that can be claimed, phone OTP with
Egypt as the default country code, stubs for email/Apple/Google. HMAC-SHA-256
session tokens compared in constant time; refresh tokens opaque and stored
hashed. Structured JSON logging with a request id on every line and in every
error envelope.

---

## Not done, and why

1. **`packages/ui`, `packages/ui-web`, `apps/gallery`.** Blocked on the design.
   I do not know the component inventory, its variants, or its states. Building
   these on invented values would produce a library that has to be thrown away.

2. **`apps/traveler`, `apps/vendor`, `apps/admin` scaffolds.** Each consumes the
   generated Tailwind preset, which is currently eight magenta sentinels. I
   chose not to stand up three app shells whose first render would be
   meaningless. They are perhaps an hour once the palette lands.

3. **The database was never applied.** This machine has no Docker, no WSL and no
   local Postgres — you chose "write it, don't run it". So
   `pnpm db:migrate && pnpm db:seed` has **not** been executed, and I am not
   claiming the migration applies. What *is* verified is static: 13 assertions
   over the generated SQL covering the PostGIS types, a GIST index for every
   geography column, bigint money, timestamptz throughout, and each named check
   constraint. `src/migrate.ts` asserts the PostGIS extension and lists the GIST
   indexes when it does run, so a silent failure is not possible.

4. **Fonts are not loaded or subset.** The four families are named in
   `tokens.json` and nothing else. `expo-font` and `next/font` wiring, the
   Arabic/Cyrillic subsetting, and the seven-language glyph check all wait on
   the type scale.

5. **BullMQ and Redis are in compose and in the API's dependencies but no queue
   is defined.** There is no job to run yet.

6. **Screenshots.** The brief asks for the gallery in light-LTR, dark-LTR,
   ar-RTL and de-LTR. There is no gallery, so there are no screenshots. The
   German text-expansion check and the Arabic mirroring check are both
   outstanding.

---

## Judgment calls — please correct any of these

**Dependencies I added that the brief did not name.** The brief said to ask
first. These are all direct consequences of tools it *did* name, so I took them
and am flagging them rather than stalling:

- `drizzle-kit` — Drizzle's migration generator
- `postgres` (postgres.js) — Drizzle's Postgres driver
- `typescript-eslint` — TypeScript parsing for the named ESLint
- `intl-messageformat` — the ICU engine `i18next-icu` requires
- `@types/node`

I deliberately did **not** add: a WCAG contrast library (fifteen hand-written
lines, checked against the standard's reference points), a logging library
(one JSON object per line), a JWT library (`alg` negotiation is the part that
causes the vulnerabilities), `tsx` (the build scripts are plain `.mjs`), and a
web framework for the API (tRPC's standalone adapter is enough).

**Pricing semantics I chose.** Each is asserted by a test, so changing one is a
visible diff:

- Percentages compound in priority order, so 10% then a 300 EGP voucher is a
  different total from the reverse. I made that the vendor's explicit choice
  rather than picking an order.
- Ties on priority break on rule id, so the answer never depends on row order.
- Infants and accompanying instructors occupy capacity but are not charged.
- Mixed currencies throw rather than converting silently.
- A stack of discounts floors at zero.
- `participantKind` rules scope to the base contribution of those participants,
  taken **before** any rule runs, so two kind-scoped rules cannot compound.
- A seasonal range that wraps the new year must be expressed as two rules. I
  did not infer wrapping, because a typo would silently invert the range.

**Domain choices to check.**

- `perUnitPerDay` is `basePrice × chargeable heads × days`. If gear rental is
  quoted per *item* rather than per person, this is wrong.
- Dive-site coordinates are to roughly 10 m, from public listings and OSM. Good
  enough for a pin and to exercise a spatial index; **not** good enough to
  navigate by. They need a survey pass.
- The Arch is set to require Trimix. Some operators would say "technical" more
  loosely; I took the strict reading.
- Non-chargeable participant kinds are infant and instructor. If an
  accompanying instructor is billed, that changes.

**Two workarounds you should know about.**

- `drizzle-kit` only leaves a column type unquoted if it starts with a name on
  its native list. `geometry` is on it; `geography` is not, so generated DDL
  said `"geography(Point, 4326)"` and Postgres would reject it. `geometry`
  would make `ST_DWithin` measure degrees on a plane rather than metres on a
  spheroid, so the type stays `geography` and `scripts/postgis-unquote.mjs`
  runs as part of `db:generate`. A test asserts no quoted form survives.
- `intl-messageformat` publishes no `exports` map, so Node's ESM loader picks
  its CommonJS `main` and the default import becomes a namespace object — which
  makes `i18next-icu`'s `new IntlMessageFormat(...)` throw and every ICU
  message render as raw source. Metro, Next and Vite all resolve the `module`
  field instead, so the apps are fine; only Node-ESM tooling breaks. The i18n
  vitest config aliases it explicitly.

**A default I picked without being told.** Arabic renders Western digits
(`latn`) unless the user opts into Eastern (`arab`). That matches Egyptian
digital convention, but it is a product decision and it is a one-line change in
`packages/i18n/src/locales.ts`.

---

## Open questions for you

1. **The whole design.** Palette, ramps, gradients, type scale, radii, spacing,
   shadows, icons, motion, component inventory. Nothing visual can proceed.
2. **Currencies.** I modelled EGP, EUR, USD and GBP. The brief only requires EGP
   with a EUR equivalent.
3. **FX.** `exchange_rates` stores a rate scaled by 1e6 and the booking stores
   the rate it used. Which source, and how often?
4. **Locale for vendor-authored content.** `service_translations` has a
   `machine`/`human`/`needsReview` status but no translation pipeline. Machine
   translation on write, or a human queue?
5. **Payment providers.** Six are enumerated. Which is first?
6. **Guest claiming.** A guest session becomes a user by claiming. I assumed the
   cart moves and the guest row is kept for audit. Confirm.

---

## Three bugs the verification caught

Worth recording, because each was found by a gate rather than by reading:

1. **A missing GIST index** on `dive_sites.entry_point` — caught by the
   migration test asserting every geography column has one. Fixed in the schema
   and regenerated.
2. **The API logger redacted every tRPC error code.** `code` was on the
   redaction list for OTP codes, so `errorCode` logged as `[redacted]` — the
   one field you open the logs for. The OTP paths now use `otpCode`.
3. **A backtracking bug in `lint:hardcoded`'s shadow rule** made it flag
   `box-shadow: var(--shadow-raised)` as a violation. Caught by the linter's own
   self-test, which requires every rule to carry a string it must flag and one
   it must not.

Zod failures were also serialising their whole rejected input into the warn
log, which is how a phone number ends up in a log file. They now log field
paths and issue codes only.

---

## Running it

```bash
pnpm install
pnpm verify
```

`verify` is `typecheck && lint:hardcoded && test:tokens && test:i18n && test`.

The database, once Docker is available:

```bash
pnpm db:up && pnpm db:migrate && pnpm db:seed
```

`pnpm` is not on this machine's PATH by default — it was installed to
`C:\Users\DANNN\.npm-global` because `corepack enable` needs administrator
rights here.
