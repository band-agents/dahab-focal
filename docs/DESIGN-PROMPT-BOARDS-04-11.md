# Claude Design prompt — traveler app, Boards 04–11

Continues from `Board 03 - Home.dc.html`, which is approved. Paste everything
below the rule into the Claude Design project holding Board 03.

---

Board 03 · Home is approved. Build the rest of the traveler app on exactly the
same foundation, with one structural change.

## The structural change: screens only

Board 03 carries a board header, a description paragraph and a long notes
column. **Drop all of it.** These boards contain phone screens and nothing
else — no eyebrow, no title, no explanatory paragraph, no rules column, no
shot list, no contrast table, no "what changed" list, no captions under the
frames.

Lay the screens out edge to edge on the canvas ground `#F1EAE0`, in reading
order, 34px of padding around the set and 26–34px between frames. If a board
has more screens than fit one row, wrap to a second row with the same gap.
Nothing but frames.

Locale and theme move out of the artboard entirely and onto the canvas tweak
chips. Board 03 already reads `this.props.locale` and `this.props.theme` — keep
that, declare them in `data-props` with `enum` editors (`en-GB` / `de-DE` /
`ar-EG`, and `Light` / `Night Dive`), and delete the in-canvas chip rows. Add
board-specific tweaks the same way where a screen has a meaningful variant.

Even with the tweaks, every board must include **at least one Arabic frame and
at least one Night Dive frame** among its screens, so RTL and dark are actually
designed rather than assumed.

## Reuse Board 03's scaffolding verbatim

Copy these straight out of `Board 03 - Home.dc.html`'s script and do not
re-derive or redraw any of it:

- `MINT` / `BLUSH` / `SAND`, `CIRC`, `MARKS` (37), `ILLOS` (6), `CATS` (12),
  `GRAIN`, `NIGHT_TINT`, the `key()` helper and the `MK` lookup.
- The `LIGHT` and `NIGHT` theme objects, whole. Every colour on every new
  screen comes from `th.*` — no literal hex in the markup except where Board 03
  already uses one.
- The `COPY` shape: one object per locale, `en-GB` / `de-DE` / `ar-EG`, with
  tuple arrays for repeated rows. Write real copy in all three for every new
  string, in the same voice — second person, plain, specific. German runs
  roughly 35% longer than English; make sure it still fits.
- `tintOf()`, and the Arabic branch that switches display to Baloo Bhaijaan 2,
  sets `lhDisplay` 48 / `lhBody` 29 / `lhSmall` 24, and drops the uppercase and
  the +8% tracking on overlines while keeping Western digits.

## Construction rules, unchanged from Board 03

One gutter, 20px: every full-width block and the first card of every rail
starts at 20. Rails bleed right by 24px of the next card — 330 single-up, 157
two-up at a 390 frame. Sections 26–32 apart, cards 16, header to content 12.

Marks on a 100-unit viewBox: family-tint shape offset +4/+4, `ink-line`
#3B4A48 over it at stroke-width 3, round caps and joins, six strokes or fewer.
Abstract marks — sea, wind, weave, reef, depth, coral fan — carry no shape. At
24px the line thickens to 4.6 and nothing else changes. Marks are 40px minimum
in the interface and up to 96px as a tile's subject.

Status is never colour alone — colour, mark and word, always. Danger text is
#A82B2B on the #F5DCDC tint and #C13333 on cream, picked by ground. The primary
button is `blush-200` with an `ink-900` label; white on blush does not exist.

Logical properties only, no left/right anywhere. Every control at least 44px
with 8px between. Focus ring 2px `lagoon-focus` at 2px offset, drawn as the
camera-focus ring. Motion `buoyant` for tiles and sheets, `silk` for
transitions, `tide` for progress, all collapsing to a 120ms fade under
`prefers-reduced-motion`.

Sheets are the interaction pattern: `cream-50` ground, grab handle, big rows,
one primary button pinned at the bottom. Prefer a sheet over a dense inline
control.

Image slots keep Board 03's rule — 120px and wider is a live drop target with
the four-layer treatment over a neutral placeholder and a `bNN-*` slot id;
anything smaller carries a treated stand-in. Keep image slots rare: at most one
per screen, and every screen must look finished without it.

## The gaps stay flagged, in the design rather than in prose

The four open gaps are unchanged, and Board 03's in-design treatment carries
over with no explanatory text: night `text-brand` has no token, so no coral
text appears in Night Dive and prices fall back to `th.text`; `info-text` on
`info-surface` and `lagoon-600` on `mint-50` both compute 4.29, so anything
using those pairs is drawn with a dashed `#C13B2C` edge; muted text on raised
panels is set in `ink-900` until #786757 is ratified. Never invent a value to
close one of these.

## The boards

One `.dc.html` per board, named in the existing series. Each holds the screens
listed, as frames, in this order.

**Board 04 · Discover.** Search empty, with recent searches and the twelve
category tiles. Search with a natural-language query parsed into chips ("two
calm shore dives near Masbat, under EGP 1,500, back before 13:00" → area,
entry, price, return time), each chip removable. Results as a list with the
compare toggle on every row. The same results as a map — the map layer stays
physically LTR in every locale, because Dahab's coast runs water-east and
land-west. Category hub for Diving. Filter sheet. Sort sheet. Dive-site sheet
for the Blue Hole with the depth profile, the saddle at 6 m, the Arch at 56 m
and its technical-only gate. An Ask Bahri conversation screen.

**Board 05 · Decide.** Listing detail for "The Bells to the Blue Hole": what
happens hour by hour, what is included and what is not, the operator, the
certification requirement in plain words, one price. Then the comparison
engine — three options side by side, driven by attribute definitions rather
than fixed columns, so diving and desert use one component. A plain-language
verdict above the table. Rows that are identical across all three collapse so
the eye skips them. Materially different rows are marked. Missing data reads as
missing, never as a blank or a zero. Weight sliders that re-rank live. The
hidden-cost normaliser as its own screen: gear, marine park fee, transfer,
guide ratio, lunch and nitrox surcharge folded into one shown price, with the
re-rank visible. The fourth-pick refusal at 3 of 3.

**Board 06 · Book.** Four steps, one question each — participants, date and
time, extras, review. Participants where infants and accompanying instructors
hold a seat without being charged, shown as such. The review screen carries the
itemised breakdown in applied-rule order with percentages compounding visibly,
and the cancellation policy above the button, never below it. A no-fly warning
if the booking sits inside the window against the traveller's flight. Payment.
Confirmation as a single large mark, one line and one action.

**Board 07 · Trip.** Trips list, upcoming and past. Trip detail. The day-of
view with meeting point, what to bring and the walking time from Mashraba. The
offline voucher, saved to the phone. The cancellation cascade when Thursday's
wind cancels the Shamandura boat — the booking, the 07:10 Assalah Transfers
pickup and the refund leg, shown as one chain before it happens. The no-fly
countdown against the 06:20 Thursday flight from Sharm. Log a dive.

**Board 08 · Account & identity.** First run. Locale and currency. Phone OTP
with Egypt as the default country code. Guest mode, and the moment a guest
claims a cart. Profile. Certifications and logbook — Advanced Open Water, 41
logged dives, and what the Arch would require. Wallet and rewards, three dives
to the fifth. Settings. Permissions. The Arabic switch as a real transaction,
since it needs a reload.

**Board 09 · Operator & messages.** The Fanous Divers store page — services,
Masbat location, 4.9 from 128 reviews, CDWS licence, insurance valid to 30 Jun
2026, and the permit expiring in 19 days surfaced rather than hidden. Reviews.
A message thread with the operator, on the `chat` mark. Notifications.
Wishlist.

**Board 10 · Conditions & safety.** Full conditions, which is where Home's
"Full conditions" link goes — wind, water, visibility, sunset, moon and air
across the week on the seven-colour ramp. A dive-site guide listing the sites
with depths and hazards. Wetsuit guidance by month, 22 °C in January to 28 °C
in August. Kite season March to June. The safety hub on `chamber`, `first aid`
and `SOS` — the hyperbaric chamber six minutes away, what to do and who to
call. Ramadan hours and the Friday–Saturday weekend as real scheduling
information.

**Board 11 · States.** Loading as skeletons on the real layout, not a spinner.
Empty. No results, with a way out. Offline. Permission denied for location and
for notifications. Error. Expiry warnings for a permit, an insurance
certificate and a tank hydrostatic test. Each illustrated from the six-piece
set at 96px, each colour plus mark plus word. These should be the nicest
screens in the app, not apologies.

## Do not

Do not add a board header, a description, a notes column, a shot list or a
contrast table — screens only. Do not use a dark editorial band on a light
screen; Night Dive is a theme. Do not use marks below 40px in the interface. Do
not lay out a screen around photo placeholders. Do not use emoji, and do not
introduce a second icon style — the waterline pictograms are a dead
experiment. Do not write lorem ipsum or invent a fact: real operators (Fanous
Divers, Blue Beach Freediving, Sinai Nomads, Baraka Kite, Moya Yoga, Shamandura
Boat Trips, Assalah Transfers), real sites (Blue Hole, The Bells, The Arch, El
Canyon, Eel Garden, Lighthouse, Gabr El Bint, Ras Abu Galum, Umm Sid, The
Islands), real areas (Assalah, Masbat, Mashraba). Prices in EGP with a EUR
equivalent at 53.4, and bracket any figure you do not hold — never invent a
discount percentage.
