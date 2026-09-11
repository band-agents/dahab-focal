# Dahab Focal

A services marketplace for Dahab, South Sinai, Egypt. Experiences, not food: diving,
freediving, snorkeling, desert safari, kitesurfing, wellness, Bedouin culture, boat
trips, courses, rentals, transfers, photography.

Three surfaces: the traveler app (Expo, designed but not built — Board 03 Home is
approved), the vendor app (`apps/vendor`, Expo, four screens), and the admin
console (`apps/admin`, Next.js 15, eight screens). All three share one design
system, one token package, one i18n package and one API.

**Read `docs/SESSION-ADMIN-VENDOR.md` before touching either dashboard.** It
records what is real, what is fixtures, and the handful of decisions — semantic
tokens versus ramp steps, the three i18n entry points, bidi isolation — that are
invisible until they break something.

## Non-negotiables

**The design canvas is the source of truth.** This file was written from a brief
*before the design existed*. The Claude Design project then went through three
deliberate passes; revision v3 (`Design System.dc.html` /
`dahab-focal.tokens.json@3.0.0`, imported 2026-09-07) wins wherever it and an
older instruction disagree. The palette, type and component rules below were
rewritten to match v3. v1 and v2 are history.

**Design tokens.** `packages/tokens/tokens.json` is the only place a visual value is
defined. No hex color, no raw font size, no magic spacing number anywhere else in
the repo. `pnpm lint:hardcoded` enforces this — do not disable it. Every value in it is
filled from v3 and from the board's **section 09** corrections, which superseded
the earlier interim in-code fixes: `clay-700` is #7D6D5E, and danger text is now
two tokens picked by ground — `danger-text` #A82B2B on its own tint,
`danger-text-on-cream` #C13333 on the page. `docs/CANVAS-FIXES.md` remains the
worklist for what is still owed to the design board.

**One hand.** Every mark, illustration, the logo and the loading state are drawn
the same way: a 3px soft-charcoal line (`ink-line` #3B4A48, never pure black) over
a flat pastel silhouette, filled, offset +4/+4 down-right. Never fatten the line
and reuse it as the shape. Purely abstract marks — **sea, wind, reef, depth,
palm, offline and the coral fan** — carry no silhouette. Six strokes or fewer.
(An earlier version of this list named `weave` and omitted `palm` and `offline`;
the board disagrees and wins — `weave` is the Bedouin divider and is a filled
repeating diamond. `packages/ui-web` asserts the real set against the board.)

The marks are **data, generated from the board**, never hand-drawn in a
component: `packages/ui-web/src/marks/data.ts` is produced by
`scripts/generate-marks.mjs` from the approved `Board 03 - Home.dc.html`, and
`<Mark>` is the only place the construction rule is expressed. At 24px and
below the line thickens to 4.6 so the mark survives at rail and table size;
nothing else changes with size.

**Four families and one ink: cream, mint, blush, sand.** No pure white anywhere —
the page is `cream-50` #FDFAF6. Primary text is `ink-900` #2E3B3A (11.2:1). If a
screen carries more than three colours, something has gone wrong.

**The primary button is a `blush-200` (#F9CFC8) fill with an `ink-900` label**
(8.2:1). There is no white-on-fill button in this system — white on blush is
1.4:1, and the API of the Button primitive must make it impossible to express, not
merely discouraged. `blush-300` is the 1px edge and the pressed fill. Coral text
on light is always `coral-700` #C13B2C (5.1:1), never a lighter coral. Muted text
is `text-muted` / `clay-700` #7D6D5E (4.8:1), never `clay-500` (2.4:1, the word
"focal" only) or `cream-400` (2.1:1, decoration and empty dots only).

**The serif is gone.** Display and brand and every price are **Baloo 2** 600
(round terminals that echo the line caps); never below 19px, never a UI label.
All UI and body are **Rubik** (300/400/500, and 500 is the heaviest UI weight) —
one family for Latin, Cyrillic and Arabic. Arabic display is **Baloo Bhaijaan 2**;
Arabic body stays Rubik, +20% line-height, never below 15px. Monospace is the
system stack (`ui-monospace, …`) — there is no bundled mono face. Display tracking
is positive. Read sizes, line-heights and tracking from the type-scale role by
name; never an ad-hoc `fontSize`.

**Night Dive is the dark theme, and it is now complete enough to ship.** The
same three pastels dimmed onto a warm green-black (`bg` #0A2422). The mark line
inverts to cream; the offset shape stays pastel. The CTA fill becomes `#C98A7E`
with a near-black label. Design System **section 09** (7 Sep 2026) added the
night `text-link` #8FE0D8, `focus-ring` #7FD8D0, `cta-edge` / `cta-fill-pressed`
#E8A99C and the four status strips, and those are imported here — `pnpm
test:tokens` asserts each clears 4.5:1 against both night grounds. Night
`text-brand` (coral text at night) still has no value in any export; nothing
uses coral text in dark until it does. See `docs/CANVAS-FIXES.md`.

**Use the semantic tokens, not the ramp steps.** `bg`, `surface`,
`surface-raised`, `text`, `text-muted`, `info-surface`, `danger-text` and the
rest carry a Night Dive value. The raw ramp steps — `cream-100`, `mint-50`,
`ink-900` — do not, so a component built from them silently stays light on a
dark ground. This is the easiest way to break dark mode and it type-checks
perfectly.

**RTL is not a feature, it is the layout model.** Never `marginLeft`, `marginRight`,
`paddingLeft`, `paddingRight`, `left:`, `right:`. Always the logical equivalents
(`ms-*`/`me-*`/`ps-*`/`pe-*` in NativeWind, `margin-inline-*` on web). `textAlign`
is `'auto'`, never `'left'`. Icons of physical objects and media controls carry
`noFlip`; everything else mirrors.

**Seven locales, always.** en-GB (source), ar-EG, ru-RU, it-IT, fr-FR, es-ES, de-DE.
No user-visible string is ever hardcoded. ICU message format only — never build a
sentence by concatenation; Arabic has six plural forms and Russian has four. Every
new key lands in all seven files in the same commit, English-placeholder if needed,
marked `needs-translation`.

**Money is integer minor units plus a currency code.** Never a float. Never
`Number.toFixed` for display — use the formatters in `packages/i18n`.

**Time is stored UTC, rendered in Africa/Cairo.** Egypt observes DST. Never do date
arithmetic in local time.

**Price is computed in exactly one place:** `computePrice()` in
`packages/api-contract`. The vendor-side simulator, the traveler checkout and the
comparison engine all call it. If you are about to write pricing logic somewhere
else, you are creating a refund ticket.

**Comparable attributes are data, not columns.** `attribute_definitions` +
`service_attribute_values` drive the admin taxonomy manager, the vendor service
builder form, and the traveler comparison engine. Never add a hardcoded column to
`services` for something a category might want to compare.

**Accessibility is a build gate.** WCAG 2.2 AA. Touch targets >=44pt, >=8px apart;
the primitive enforces it via `hitSlop` where the visual is smaller. Focus ring
2px `focus-ring` (`lagoon-focus` #17A2A0) at 2px offset, drawn as the brand's
camera-focus ring. Status is never color alone — always color plus mark plus word.
Every animation respects `prefers-reduced-motion`; every signature collapses to a
120ms opacity fade. Contrast ratios are recomputed from the hexes in `tokens.json`
by `pnpm test:tokens`, never trusted from an annotation.

## Domain rules that are real, not decorative

- No-fly after diving: 18h single dive, 24h multi-day. The trip planner must detect
  and warn against the user's flight time.
- Certifications gate activities. The Arch at Blue Hole is technical-only.
- Vendor permits, dive-agency affiliations, insurance certificates and staff
  certifications all expire and must surface before they do.
- Scuba tanks carry hydrostatic test dates.
- Weather cancels boats. Cancellation is a first-class, cascading operation.
- Water is ~22C in January and ~28C in August; wetsuit guidance changes by month.
- Kite season is March-June. Flat-calm mornings suit freediving.
- Friday and Saturday are the Egyptian weekend. Ramadan shifts operating hours.
- Dahab has a hyperbaric chamber; diving incidents are a real safety category.
- Mobile signal in Dahab is patchy. Offline is a designed state, not an error.

## Content

Never lorem ipsum, in code or in fixtures. Use real Dahab content: the dive sites
(Blue Hole, The Bells, The Arch, El Canyon, Three Pools, The Islands, Eel Garden,
Lighthouse, Moray Garden, Caves, Umm Sid, Gabr El Bint, Ras Abu Galum, Blue Lagoon),
the neighborhoods (Assalah, Masbat, Mashraba, Eel Garden, Lighthouse, Blue Beach),
and the seeded operators (Fanous Divers, Blue Beach Freediving, Sinai Nomads,
Baraka Kite, Moya Yoga, Shamandura Boat Trips, Assalah Transfers). Prices in EGP
with a EUR equivalent.

## Working agreement

- TypeScript strict. No `any` in `packages/`. Zod at every boundary.
- Follow the design file exactly. If a value is missing, flag it as an open question
  in the session doc and use an obviously-provisional placeholder — never a
  plausible guess.
- Stop and ask before adding a dependency.
- Commit in logical chunks with real messages.
- Every session ends by running `pnpm verify` (typecheck, lint:hardcoded,
  test:tokens, test:i18n, test) and `pnpm shoot`.
- `pnpm shoot` builds the gallery and screenshots it in light-LTR, dark-LTR,
  ar-RTL and de-LTR. It is a gate, not a convenience: it fails if the requested
  theme and direction did not reach the document, if a bundled face did not load
  and the page is drawing in a system font, if the capture is cropped, or if any
  two images are identical. Four identical screenshots is what this project
  shipped before the gate existed. Do not weaken it —
  `apps/gallery/tests/shoot-gate.test.ts` runs it against a deliberately broken
  fixture and requires it to fail.
