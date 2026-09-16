# Claude Design prompt — Dahab Focal traveler app

Paste everything below the line into the Claude Design project
"Travel booking design system refresh" (`3faba25b-2220-49c3-b25d-2111cf8d8ef3`).

---

Continue the Dahab Focal traveler app in this project. The design system is
finished; the product boards are not. You are building Board 03 onward.

## Read these first, in this order

1. `Dahab Focal - Design System.html` — sections 01–10. This is the source of
   truth for every value. Section 09 (Corrections, 7 September) and section 10
   (Rhythm, photography & two new components) are the newest and override
   anything older on the board.
2. `Discover.dc.html` — "Board 02 · Discover · revision 2". This is the house
   style for a product board: how a phone frame, a notes column, locale and
   theme toggles and a shot list sit together. Match its construction.
3. `dahab-focal.tokens.json` / `.css` for anything the boards leave implicit.

Lift constants **verbatim** out of those files' `<script data-dc-script>`
blocks. Do not retype them from what you see rendered, and do not redraw
anything that already exists.

## The rule that matters most: reuse the symbols, never redraw them

Copy these three arrays out of the Design System board's script exactly as
written, including every path string:

- `MARKS` — the 37 marks: sun, sea, fish, coral fan, turtle, jellyfish, shell,
  bubbles, reef, diver, mask, tank, fin, depth, wind, moon, palm, camel, dunes,
  canyon, tent, kite, sail, tea, weave, arch, compass, camera, star, chat,
  no-fly, chamber, first aid, SOS, eco, offline, pass.
- `ILLOS` — the 6 illustrations: sea turtle, jellyfish, lionfish, coral fan,
  camel, dhow.
- `CATS` — the 12 categories with their `surface`, `tint`, `shape` and `d`:
  Diving (mint · fin), Freediving (mint · descent), Snorkeling (mint · snorkel),
  Boat & Sea (mint · sail), Courses (mint · card), Kite & Watersports
  (blush · kite), Food & Cooking (blush · pot), Rentals (blush · tag),
  Desert & Safari (sand · dunes), Bedouin & Culture (sand · tent),
  Wellness & Yoga (olive · figure), Transfers (clay · van).

Every mark is drawn the same way and this is not negotiable: a 100-unit
viewBox; the `shape` path filled in the family tint and offset **+4 / +4**
down-right; the `d` path stroked over it in `ink-line` **#3B4A48** at
stroke-width 3 (grid 100), round caps and joins, never pure black. Six strokes
or fewer. Purely abstract marks — sea, wind, weave, reef, depth, coral fan —
carry no silhouette, so their `shape` is empty and they are line only.

**One divergence you must not propagate.** `Home.dc.html` ("Home v3") uses a
different, incompatible icon language: twelve 24-unit pictograms built on one
shared horizontal waterline, no silhouette, no offset. That was an experiment.
This work uses the 37-mark set above. Do not mix the two in one board, and do
not introduce the waterline construction anywhere new.

## Palette — exact values

**Light.** Page and cards `cream-50` #FDFAF6. There is no pure white anywhere.
Raised panel `cream-100` #F6F0E7. Hairlines, tracks, disabled fill `cream-200`
#EDE3D4. Borders, empty dots `cream-300` #DCCDB6. Decoration only, never text,
`cream-400` #BFAB8F. Muted text `clay-700` **#7D6D5E** (4.78 — the old #8A7B68
failed at 4.0 and is gone).

Mint (water): `mint-50` #E6F5F3 · `mint-100` #C6EEEA · `mint-200` #A8E2DC (the
offset shape for water) · `mint-300` #7FD8D0 · `lagoon-600` #0E7F80 (link text)
· `lagoon-focus` #17A2A0 (focus ring only).

Blush (life and motion): `blush-50` #FDEEEA · `blush-200` #F9CFC8 · `blush-300`
#F5B8AD · `coral-700` #C13B2C — the only coral that may carry text.

Sand and clay (land and culture): `sand-50` #FCF3E2 · `sand-200` #F0DDB0 ·
`sand-300` #E5C889 · `clay-300` #E3C8BA · `clay-500` #C99A80 (brand secondary,
the word "focal", never text) · `dune-700` #8A5A12 (gold text).

Ink and status: `ink-line` #3B4A48 · `ink-900` #2E3B3A · `ink-scrim` #0F2E2E ·
`success-700` #1F7A50 on #E4F1EA · `danger-700` **#A82B2B** on #F5DCDC (5.30) ·
`olive-100` #EDF0E7 with text #4A5940.

Two danger tokens, not one — this is section 09's correction and it is easy to
get wrong: **#A82B2B** is error text on the #F5DCDC tint; **#C13333** stays
correct for error text on cream (5.26). Pick by ground.

**The primary button is a `blush-200` #F9CFC8 fill with an `ink-900` #2E3B3A
label.** White on blush is 1.4:1 and does not exist in this system. `blush-300`
is the 1px edge and the pressed fill.

**Night Dive.** Page #0A2422, surface #0F2E2E, raised #17403E, border #255450,
border-int #3A6E68, text #EAF2EF, muted #9DB5B0. The mark line inverts to
#EAF2EF; the offset shape stays pastel but dims — water #4E8F88, life #C98A7E,
land #F0DDB0 (deliberately undimmed). CTA fill #C98A7E with a #0A2422 label,
edge #E8A99C. Link **#8FE0D8**. Focus ring **#7FD8D0**. Status strips, surface
then ink: success #143A2C / #6FD39C · warning #3A2E14 / #F0C57A · danger
#3E1E1E / #F5A099 · info #0F3A3A / #7FD8D0.

## Type

Baloo 2 600 for display, brand and every price — never below 19px, never a UI
label, positive tracking. Rubik 300/400/500 for all UI and body, one family
across Latin, Cyrillic and Arabic; 500 is the heaviest UI weight. Arabic
display is Baloo Bhaijaan 2; Arabic body stays Rubik at +20% line-height and
never below 15px. Monospace is the system `ui-monospace` stack — slot ids and
specs only. The serif is gone; do not reintroduce one.

Roles, used by name, never an ad-hoc size:

| Role | Spec |
| --- | --- |
| Display-XL | Baloo 2 600 · 36/48 · +0.5% — hero titles, max 2 lines |
| Display-L | Baloo 2 600 · 29/40 · +0.5% — screen titles |
| H1 | Baloo 2 600 · 23/32 — section heads, prices as statements |
| H2 | Rubik 500 · 19/28 — card and module titles |
| H3 | Rubik 500 · 17/24 — row titles |
| Body-L | Rubik 400 · 17/28 — listing descriptions |
| Body | Rubik 400 · 15/24 — default |
| Small | Rubik 400 · 13/20 — metadata, in clay-700 |
| Caption | Rubik 400 · 11/17 · +1% — legal, FX disclosure |
| Overline | Rubik 500 · 11/16 · +8% uppercase — eyebrow, clay-700 |
| Tabular | Baloo 2 600 · tabular-nums — prices, totals, depths |

Arabic takes neither the uppercase nor the tracking on overlines.

## Layout, photography, motion

Frame 390 wide. **One gutter, 20px, everywhere** — it is a rule, not a
per-screen decision. Rails start at the gutter and bleed right by exactly 24px
of the next card, which fixes rail widths at 390: **330 single-up, 157
two-up**. The collection tile is **157 × 232**. Arch masks are the doorway
radius (`border-radius: 50% 50% X X / 40% 40% X X`); `pill` is 999px.

**Photo recipe — four layers over the photograph, in this order.** Warm
golden-hour LUT in soft-light; 4% film grain in multiply; the Blue Hole scrim,
0 → 70% from the bottom, wherever text overlays; viewfinder brackets on
featured images only, plus the focal-point indicator. Every image carries one
focal point and all crops hold it. Gradients are an overlay on photography,
never a substitute for it.

There are still no photographs in the uploads, so **fake nothing**. Use
`image-slot.js` as Board 02 does: every frame 120px and wider is a live drop
target carrying the full treatment over a neutral placeholder with its slot id
printed on it; anything under 120px — avatars, operator logos, category tiles,
row thumbnails, map chips — carries a treated stand-in instead, because a 44px
box cannot hold a caption. Close each board with a numbered shot list naming
every drop target: golden hour 06:00–08:00 or blue hour 18:00–19:00, real
people mid-activity never posed, lower third of every landscape frame kept
clear of faces and horizon detail because the scrim and type sit there.

Motion: `buoyant` cubic-bezier(.34,1.35,.48,1) for cards and sheets; `silk`
cubic-bezier(.22,1,.36,1) for transitions and scrims; `tide`
cubic-bezier(.65,0,.35,1) for loaders and progress. Every signature collapses
to a 120ms opacity fade under `prefers-reduced-motion`.

## Accessibility and RTL

WCAG 2.2 AA is a gate. Touch targets at least 44px and at least 8px apart —
where the visual is smaller the hit area is not. Focus ring is 2px
`lagoon-focus` at 2px offset, drawn as the brand's camera-focus ring. **Status
is never colour alone** — always colour plus mark plus word. State every
contrast ratio you rely on and compute it rather than estimating.

RTL is the layout model, not a feature. Logical properties only — no
`margin-left`, `padding-right`, `left:`, `right:`; `text-align` is `auto`.
Ship every board with a working **en-GB / ar-EG** toggle as Board 02 does, and
add **de-DE** on any board with dense labels so text expansion is visible.
Marks of physical objects and media controls do not mirror; everything else
does. Arabic renders Western digits. The map layer stays physically LTR in
every locale — Dahab's coast runs water-east, land-west, and geography is not
chrome.

## Content — real, always

Never lorem ipsum, and never invent a fact. Operators: Fanous Divers, Blue
Beach Freediving, Sinai Nomads, Baraka Kite, Moya Yoga, Shamandura Boat Trips,
Assalah Transfers. Dive sites: Blue Hole, The Bells, The Arch, El Canyon, Three
Pools, The Islands, Eel Garden, Lighthouse, Moray Garden, Caves, Umm Sid, Gabr
El Bint, Ras Abu Galum, Blue Lagoon. Neighbourhoods: Assalah, Masbat, Mashraba,
Eel Garden, Lighthouse, Blue Beach. Prices in EGP with a EUR equivalent at
53.4 EGP, refreshed hourly, with the caption "You are charged in EGP." Water is
~22 °C in January and ~28 °C in August; kite season is March–June; flat-calm
mornings suit freediving.

## Domain rules that must appear as real interface, not decoration

- **No-fly after diving** — 18h after a single dive, 24h after multi-day. The
  trip planner detects the traveller's flight and warns against it. Use the
  `no-fly` mark.
- **Certifications gate activities.** The Arch at Blue Hole is technical-only.
  A traveller without the level sees why, not just a disabled button.
- **Expiry is a first-class state** — vendor permits, insurance, staff
  certifications and tank hydrostatic test dates all expire and surface before
  they do.
- **Weather cancels boats**, and cancellation cascades: the booking, the
  transfer that fed it, the refund leg. Design the cascade, not a toast.
- **Friday and Saturday are the weekend. Ramadan shifts operating hours.**
- **Offline is a designed state, not an error.** Signal between Assalah and the
  Blue Hole drops most mornings. Vouchers, meeting points and the dive-site map
  are already on the phone. Use the `offline` mark.
- Dahab has a hyperbaric chamber; `chamber`, `first aid` and `SOS` are real
  marks for a real safety surface.

## The boards to build

One `.dc.html` per board, numbered in the existing series and titled the way
Board 02 is. Each carries the phone frame, a notes column explaining the rules
it introduces, the locale and theme toggles, a shot list, and a short "what
changed" list. Build them in this order.

**Board 03 · Home** — and make this one comprehensive; it is the board the rest
hangs off. Working top to bottom: leave the real status bar's space blank and
draw no fake one; top bar with date, place, language/currency chip,
notification bell and avatar; a greeting that reads the actual conditions;
**Today in Dahab** — wind, water temp, visibility, sunset, moon and air temp on
the seven-colour viz ramp, each with its mark, opening a fuller conditions
view; search with the "Ask Bahri" AI affordance on `sand-50`; a safety strip
that appears only when it applies (a live no-fly window, a wind warning against
a booked boat); the 12 categories as a 4 × 3 grid of tinted arch tiles; the
dark editorial hero for today's featured trip, carrying the full photo recipe,
the operator, rating, EGP price with EUR equivalent and one CTA; **promotions**
as an honest rail — early-bird, multi-dive packages, first-timer courses,
Ramadan hours — never invented percentages, bracket any figure you do not have;
**Starting soon** with per-row compare toggles; **Collections** on the 157 × 232
tile; a dive-site spotlight with a depth profile; an operator spotlight; the
traveller's next booking if there is one; a rewards strip; events this week;
the offline strip; and the FX caption. Floating compare bar over the tab bar,
and a four-tab bar — Home, Discover, Trips, Account — using `sun`, `compass`,
`pass` and `mask`, with the active state drawn as the camera-focus ring.

**Board 04 · Decide — the comparison engine.** This is the reason the product
exists and it deserves the most attention on this list. Side-by-side across up
to ~70 attributes per category, driven by attribute definitions rather than a
fixed column set, so the diving comparison and the desert comparison are the
same component. Weight sliders that re-rank live. A hidden-cost detector that
normalises every inclusion — gear, marine park fees, transfer, guide ratio,
lunch, nitrox surcharge — into one shown price and re-ranks once it does.
Design the row states honestly: identical across all options, materially
different, and missing-data. Board 02 already caps mobile compare at **3 of 3**
— respect that and design the fourth-pick refusal. Show the listing detail this
opens from.

**Board 05 · Book** — participant picker where infants and accompanying
instructors hold a seat without being charged; the itemised price breakdown in
applied-rule order, with percentages compounding visibly; voucher and payment;
the no-fly check against the traveller's flight; and the cancellation policy
stated before the button, not after.

**Board 06 · Trip** — upcoming and past, the day-of view with meeting point and
what to bring, the offline voucher, the live cancellation cascade, and the
no-fly countdown against a flight.

**Board 07 · Account & identity** — first run, locale and currency, phone OTP
with Egypt as default, guest mode and the moment a guest claims their cart,
certifications and logged dives, wallet and rewards, permissions, and the
Arabic/RTL switch as a real transaction.

**Board 08 · States** — loading, empty, no results, offline, permission denied,
error, and expiry warnings, each as colour plus mark plus word.

## Surface these rather than guessing

Four known gaps. Flag each on the board with an obviously provisional
placeholder; do not quietly invent a value.

1. Night `text-brand` — coral text at night — has no value in either export.
   Section 09 added the link, the focus ring and the four status strips, but
   not this one.
2. `info-text` #0E7F80 on `info-surface` #E6F5F3 computes **4.29** against a
   4.5 bar. It carries the conditions strip on the listing card.
3. The secondary button — `lagoon-600` on `mint-50` — is the same **4.29**.
4. `clay-700` #7D6D5E on `cream-100` is **4.39**, so muted text on a raised
   panel is just under. It clears on `cream-50` at 4.78. A darker #786757 would
   clear both.
