# Dahab Focal

A services marketplace for Dahab, South Sinai, Egypt. Experiences, not food: diving,
freediving, snorkeling, desert safari, kitesurfing, wellness, Bedouin culture, boat
trips, courses, rentals, transfers, photography.

Three surfaces are planned: the traveler app (Expo), the vendor app (Expo), the admin
dashboard (Next.js). Only the traveler app is designed so far. All three will share
one design system, one token package, one i18n package and one API.

## Non-negotiables

**Design tokens.** `packages/tokens/tokens.json` is the only place a visual value is
defined. No hex color, no raw font size, no magic spacing number anywhere else in
the repo. `pnpm lint:hardcoded` enforces this — do not disable it.

**The primary button is a coral-500 fill with an abyss-900 label.** White on coral
fails contrast (2.80:1). Where a white label is required, the fill is coral-800.
Coral text on light is always coral-700, never coral-500. Muted text is sand-500,
never sand-400 (2.15:1, borders only).

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

**Accessibility is a build gate.** WCAG 2.2 AA. Touch targets >=44pt. Focus ring 2px
lagoon-500 at 2px offset. Status is never color alone — always color plus icon plus
word. Every animation respects `prefers-reduced-motion`.

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
- Every session ends by running: `pnpm typecheck && pnpm lint:hardcoded &&
  pnpm test:tokens && pnpm test:i18n && pnpm test`, and by screenshotting new UI in
  light-LTR, dark-LTR, ar-RTL and de-LTR.
