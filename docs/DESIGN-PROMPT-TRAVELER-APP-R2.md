# Claude Design prompt — traveler app, revision 2 (new direction)

Replaces `DESIGN-PROMPT-TRAVELER-APP.md`. Paste everything below the rule into
the Claude Design project "Travel booking design system refresh"
(`3faba25b-2220-49c3-b25d-2111cf8d8ef3`).

---

Redesign the Dahab Focal traveler app. Board 03 exists and it is not working —
this is a fresh direction, not a revision of it. Keep the design system, the
palette, the type and the symbol language exactly as they are. Change how the
app looks and feels completely.

## Read first

`Dahab Focal - Design System.html`, sections 01–10. Section 05 (the mark set)
and the illustration strip under it are the whole basis of this redesign, so
read those two most carefully. Lift every path verbatim out of the board's
`<script data-dc-script>` — `MARKS`, `ILLOS`, `CATS`. Do not redraw a single
symbol and do not invent new ones.

## Why Board 03 failed, so you do not repeat it

1. **It was photography-led, and there is no photography.** Thirty-one drop
   targets, all empty, all grey. A screen that is mostly placeholder can never
   look finished.
2. **It buried the best thing in the system.** The marks are beautiful at size
   and Board 03 used them at 24px, tucked beside metadata.
3. **It was dense and editorial where it should be calm.** Small type, many
   rows, tight leading, a near-black gradient hero that fights the warm cream
   ground the whole system is built on.
4. **It read as a listings site.** Rows of results with prices. Nothing about
   it felt like Dahab.

## The direction: the app looks like the mark sheet

Section 05 is the answer. A soft cream ground, generous air, and every idea
sitting on its own rounded tile with one confident charcoal-line symbol on a
flat pastel shape. That page is calm, warm, legible and unmistakably this
brand. Build the entire app that way.

Three consequences, and they are the whole redesign:

**Illustration leads, photography follows.** The six-piece set — sea turtle,
jellyfish, lionfish, coral fan, camel, dhow — and the mark set are the primary
imagery, drawn large. A category, a collection, a dive site, an empty state, a
confirmation: each gets a symbol at 56–96px on its family tint, not a photo
slot. Keep photography as one enhancement layer that arrives later: at most one
image per screen, on the hero only, and the screen must look complete without
it. This single change is most of the difference.

**Symbols get room.** Marks render at 40px minimum in the interface and up to
96px as a tile's subject. They stay legible at 20px, but stop using them there
— that is what made Board 03 look like a settings menu.

**One tile, one idea.** Every card carries a symbol, a short line in Baloo 2,
and at most one number. If a tile needs three lines of metadata to make sense,
it is two tiles or it is a detail screen.

## The symbol tile — carry it out of the sheet into the app

The tile behind each mark in section 05 is the app's core component. Specify it
once and use it everywhere:

- Ground `cream-50` #FDFAF6 on a `cream-100` #F6F0E7 page, or the family tint
  where the tile is categorical: `mint-50` #E6F5F3 water, `blush-50` #FDEEEA
  life, `sand-50` #FCF3E2 land, `olive-100` #EDF0E7 wellness, `#F5E6DE`
  transfers.
- Radius 24px on small tiles, 28–32px on large ones. Soft and pillowy, never
  sharp. The arch mask stays for hero and collection tiles only, so it keeps
  its meaning.
- The mark centred with real air around it — at least 0.4× the mark's own size
  on every side. The sheet breathes; the app must too.
- The label under the mark, not beside it: Rubik 500, `ink-900`, centred.
- Shadow is warm and barely there — the sheet's tiles sit on the page, they do
  not float above it.
- Pressed state tints the ground one step; it never scales or lifts.

The mark construction itself does not change and is quoted from the board:
one 100-unit grid, a 3px charcoal `ink-line` #3B4A48 line over a flat pastel
shape offset **+4 / +4** down-right, six strokes or fewer. Abstract marks —
sea, wind, weave, reef, depth, coral fan — are line only, no shape behind.
Never fatten the line and reuse it as the shape. The illustration set is the
same hand drawn larger: one continuous line, flat pastel shape offset
down-right behind it.

The **Bedouin woven divider** — 7px repeating diamond, muted — is the section
separator between major blocks. It is already on the board; use it instead of
hairlines wherever a screen changes subject.

## Keep exactly as they are

Palette, type ramp, motion curves and accessibility rules are settled. In
short, so you do not have to re-derive them:

Page `cream-50` #FDFAF6, no pure white anywhere. Surface `cream-100` #F6F0E7.
Lines `cream-200` #EDE3D4, borders `cream-300` #DCCDB6. Text `ink-900`
#2E3B3A, muted `clay-700` #7D6D5E. Link `lagoon-600` #0E7F80, focus ring
`lagoon-focus` #17A2A0 at 2px, 2px offset, drawn as the camera-focus ring.
Every mark line is `ink-line` #3B4A48, never pure black. Coral text is only
ever `coral-700` #C13B2C. Gold text `dune-700` #8A5A12.

**The primary button is a `blush-200` #F9CFC8 fill with an `ink-900` label,
edge and pressed fill `blush-300` #F5B8AD.** White on that fill is 1.4:1 and
does not exist in this system.

Error text is `#A82B2B` on the `#F5DCDC` tint and `#C13333` on cream — two
tokens, picked by ground. Night Dive: page #0A2422, surface #0F2E2E, raised
#17403E, text #EAF2EF, muted #9DB5B0, link #8FE0D8, focus #7FD8D0, CTA fill
#C98A7E with a #0A2422 label. The mark line inverts to cream; the offset shape
stays pastel and dims — water #4E8F88, life #C98A7E, land #F0DDB0 undimmed.
Night status strips, surface then ink: success #143A2C / #6FD39C, warning
#3A2E14 / #F0C57A, danger #3E1E1E / #F5A099, info #0F3A3A / #7FD8D0.

Baloo 2 600 for display, brand and every price, never below 19px and never a
UI label. Rubik 300/400/500 for all UI and body. Arabic display Baloo Bhaijaan
2; Arabic body Rubik at +20% line-height, never below 15px. Use the eleven
named roles from section 04 — never an ad-hoc size.

Motion `buoyant` cubic-bezier(.34,1.35,.48,1) for tiles and sheets, `silk`
cubic-bezier(.22,1,.36,1) for transitions, `tide` cubic-bezier(.65,0,.35,1) for
progress; everything collapses to a 120ms fade under `prefers-reduced-motion`.

Touch targets 44px minimum, 8px apart. Status is never colour alone — colour
plus mark plus word, always. RTL is the layout model: logical properties only,
`text-align: auto`, a working en-GB / ar-EG toggle on every board, de-DE
wherever labels are dense. The map stays physically LTR in every locale.

## Make it friendlier, concretely

Not adjectives — these are the specific moves:

- **Thumb-first.** Primary actions live in the bottom third. Nothing important
  in a top corner.
- **Bottom sheets, not dense inline controls.** Filters, sort, participant
  pickers, date choice — each is a sheet on `cream-50` with a grab handle, big
  rows and one primary button pinned at the bottom.
- **Ask one thing per screen.** Booking is four short steps, not one long form.
- **Plain language, in the user's shoes.** "You will be back by 14:30", not
  "Duration 4h". "Bring your certification card" is a line on the screen, not
  a policy link.
- **Numbers get room.** One price, big, in Baloo 2 tabular. The EUR equivalent
  is a quiet second line, never a competing figure.
- **Empty and offline states are illustrated**, using the six-piece set at
  96px. They should be the nicest screens in the app, not apologies.
- **Confirmation deserves a moment.** A single large mark, the AI sparkle or
  the verified tick, one line, one action.

## The screens

One `.dc.html` per board, numbered in the existing series, each with the phone
frame, a notes column, working locale and theme toggles, and a short "what
changed" list. Build in this order.

**Board 09 · Home, redrawn.** Leave the real status bar's space blank and draw
no fake one. A warm greeting reading the actual conditions. **Today in Dahab**
as a row of tinted tiles — wind, water, visibility, sunset, moon — each a mark
at 40px with one number under it, tappable into a fuller conditions view.
Search as one soft pill with the AI sparkle. The twelve categories as large
symbol tiles on their family tints, 3 × 4, each mark at 56px — this is the
centrepiece of the screen and it should look like section 05 come to life. Then
a small number of well-spaced blocks separated by the woven divider: today's
featured trip on one hero tile with an arch mask; collections as illustration
tiles; the traveller's next booking; a safety strip only when it applies. End
with the FX caption. Four-tab bar — Home, Discover, Trips, Account — on `sun`,
`compass`, `pass`, `mask`, active state drawn as the camera-focus ring.

**Board 10 · Decide, the comparison engine.** The reason the product exists and
the board that deserves the most care. Up to ~70 attributes per category,
driven by attribute definitions rather than fixed columns, so diving and desert
comparisons are one component. Weight sliders that re-rank live. A hidden-cost
detector that normalises every inclusion — gear, marine park fees, transfer,
guide ratio, lunch, nitrox — into one shown price and re-ranks once it does.
Make this friendly, which is the hard part: lead with a plain-language verdict
before the table, mark rows that are identical across all options so the eye
skips them, and show missing data honestly rather than as a blank. Mobile
compare caps at three; design the fourth-pick refusal.

**Board 11 · Listing detail** — the trip itself. Illustrated hero, what
actually happens hour by hour, what is included and what is not, the operator,
certification requirements stated as a person would say them, and one price.

**Board 12 · Book** — four steps, one question each. Participants where infants
and accompanying instructors hold a seat without being charged; the itemised
breakdown in applied-rule order; the no-fly check against the traveller's
flight; the cancellation policy before the button, never after.

**Board 13 · Trip** — upcoming and past, the day-of view with meeting point and
what to bring, the offline voucher, the cancellation cascade when weather
cancels a boat, and the no-fly countdown.

**Board 14 · Account & identity** — first run, locale and currency, phone OTP
with Egypt default, guest mode and the moment a guest claims a cart,
certifications and logged dives, wallet, permissions, and the Arabic switch as
a real transaction.

**Board 15 · States** — loading, empty, no results, offline, permission denied,
error, expiry warnings. Each illustrated, each colour plus mark plus word.

## Do not

- Do not use a dark editorial hero on a light screen. The one dark moment is
  gone; Night Dive is a theme, not a band.
- Do not draw photo placeholders as a layout device. At most one image slot per
  screen, and the screen must look complete without it.
- Do not use marks below 40px in the interface.
- Do not add gradients as decoration. Gradients overlay photography or they do
  not appear.
- Do not use emoji, and do not introduce a second icon style. `Home.dc.html`'s
  24-unit waterline pictograms are a dead experiment — do not revive them.
- Do not write lorem ipsum or invent a fact. Real operators (Fanous Divers,
  Blue Beach Freediving, Sinai Nomads, Baraka Kite, Moya Yoga, Shamandura Boat
  Trips, Assalah Transfers), real sites (Blue Hole, The Bells, The Arch, El
  Canyon, Eel Garden, Gabr El Bint, Ras Abu Galum), real areas (Assalah,
  Masbat, Mashraba). Prices in EGP with a EUR equivalent at 53.4, and the
  caption "You are charged in EGP." Bracket any figure you do not have — never
  invent a discount percentage.

## Domain rules that must appear as real interface

No-fly after diving, 18h single and 24h multi-day, checked against the
traveller's flight. Certifications gate activities and The Arch is
technical-only — show why, not a disabled button. Permits, insurance, staff
certifications and tank hydrostatic dates expire and surface before they do.
Weather cancels boats and the cancellation cascades through the transfer and
the refund. Friday and Saturday are the weekend; Ramadan shifts hours. Offline
is a designed state, not an error. Dahab has a hyperbaric chamber, and
`chamber`, `first aid` and `SOS` are real marks for a real safety surface.

## Flag, do not guess

Night `text-brand` has no value in any export. `info-text` on `info-surface`
computes 4.29 against a 4.5 bar, and so does the secondary button
(`lagoon-600` on `mint-50`). `clay-700` on `cream-100` is 4.39. Mark each on
the board with an obviously provisional placeholder rather than inventing a
value.
