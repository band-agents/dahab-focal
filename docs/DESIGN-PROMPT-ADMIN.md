# Claude Design prompt — admin dashboard, Boards A01–A08

Desktop web (Next.js). Same design system as the traveler app. Paste
everything below the rule into the Claude Design project.

---

Build the Dahab Focal **admin dashboard** — the platform operator's console.
Desktop web, 1440 × 900 frames. The traveler app's Board 03 is approved and
this uses the same design system, extended to desktop for the first time.

## Screens only

No board header, no description paragraph, no notes column, no shot list, no
contrast table. Frames on the canvas ground `#F1EAE0`, in reading order, 34px
padding around the set, 26–34px between frames, wrapping to a new row as
needed. Locale and theme ride on `data-props` tweak chips (`en-GB` / `ar-EG` /
`de-DE`, `Light` / `Night Dive`), not on rows inside the artboard. Include at
least one Arabic frame and one Night Dive frame per board.

## Reuse the system, extended to desktop

Lift `MARKS` (37), `ILLOS` (6), `CATS` (12), `NIGHT_TINT`, `tintOf()` and the
whole `LIGHT` / `NIGHT` theme objects verbatim from `Board 03 - Home.dc.html`.
Every colour comes from `th.*`. No symbol is redrawn and no new icon style is
introduced.

Desktop is new territory for this system, so extend it rather than invent:

- Page ground `th.page` #FDFAF6, panels and cards `th.raised` #F6F0E7,
  hairlines `th.hair` #EDE3D4. No pure white, no grey enterprise chrome. This
  console should look like it belongs to the same company as the traveler app.
- A persistent left rail, 248px, on `th.raised`, with section marks at 24px.
  Collapses to 72px icons-only. It is the only navigation — no top tabs.
- Content column max 1120px with a 24px gutter, 32px between major blocks.
- **Data tables** are the core component: rows 52px on `th.page`, 1px
  `th.hair` between, hover `th.raised`, sticky header in Rubik 500 13/20
  `th.muted`, numbers right-aligned in Baloo 2 tabular. Row density toggle
  (comfortable 52 / compact 40).
- Type: Rubik for all interface. Baloo 2 600 only for page titles and for
  numbers presented as a statement — a KPI, a total, a count. Never a Baloo 2
  table cell.
- **The 40px mark floor from the traveler app does not apply here.** Admin is
  data-dense: marks run 20–24px in tables, rails and status pills, and at 24px
  and below the line thickens to 4.6 per Board 03's own rule so it survives.
  Marks at 56–96px are for empty states and detail headers only.
- Arch masks are a traveler-facing brand device. Use them only on empty states
  and avatars here, so they keep their meaning.

Status is never colour alone — colour, mark and word, in every table cell.
Danger text is #A82B2B on the #F5DCDC tint and #C13333 on cream, picked by
ground. Primary buttons stay `blush-200` with an `ink-900` label. Focus ring
2px `lagoon-focus` at 2px offset. Logical properties only — the whole console
mirrors for `ar-EG`, tables included, but numeric columns keep their alignment
and the map stays physically LTR.

## What this console is for

The permission matrix in `packages/api-contract/src/auth.ts` defines it exactly.
Admin holds every permission except `vendor.writeOwn` and `payout.readOwn` —
an admin acts on any vendor through the `.readAny` / `.manage` forms, and
**every one of those actions is audited**. Design that: consequential actions
carry a reason field and land in the audit log visibly, never silently.

## The boards

**Board A01 · Today.** The operator's morning. Departures today with headcount
against capacity. Bookings needing action, by status — `awaitingVendor`,
`pendingPayment`, `disputed`. Open incidents by severity, `critical` and
`serious` first. Disputes waiting on the platform. Payouts due. **Documents
expiring inside 30 days across every vendor.** GMV today, week and month with
take rate, in EGP with a EUR equivalent. Weather for Dahab, because it cancels
boats and cascades. Keep this to what needs a decision today — no vanity
metrics, no data slop.

**Board A02 · Vendors & verification.** Vendor list across the five statuses
(`applied`, `inReview`, `active`, `suspended`, `closed`) with filters. Vendor
detail: profile, neighbourhood, contact, staff roster, resources, services,
bookings, money. The **verification queue** working `vendor_documents` — the
nine types, from `commercialRegister` and `taxCard` through `cdwsLicence`,
`diveAgencyAffiliation`, `publicLiabilityInsurance`, `boatLicence` and
`vehicleLicence` — each moving through `pending` → `inReview` → `verified` or
`rejected`, with a document viewer, the issuing body, the expiry date and a
rejection reason that the vendor actually receives. Suspend and reinstate, both
with a required reason.

**Board A03 · The expiry board.** Its own screen, because expiry is the theme
of the vendor model. One view of everything that lapses across the platform:
operating permits, CDWS licences, dive-agency affiliations, public liability
insurance, staff certifications, resource certifications and **tank
hydrostatic test dates**. Grouped by how long is left — expired, inside 7 days,
inside 30, inside 90 — with the vendor, the affected services and what stops
if it lapses. An expired public liability certificate should visibly block
publishing, not merely warn.

**Board A04 · Catalog & taxonomy.** Services across the six statuses (`draft`,
`underReview`, `published`, `paused`, `archived`, `rejected`) with the review
queue: what changed, side by side, approve or reject with a reason. Then the
**taxonomy manager**, which is the most consequential screen in this console —
comparable attributes are data, never columns. Categories; `attribute_definitions`
with the nine data types (`text`, `longText`, `number`, `measure`, `boolean`,
`enum`, `multiEnum`, `duration`, `date`), each with its normalisation rule, its
unit, whether it is comparable, and its weight default in the comparison
engine; the options tree as variant → tier → group → option; and the
inclusions matrix that the hidden-cost detector normalises against. Show what
breaks downstream when an attribute is edited or retired — which services carry
a value, and what the traveler comparison loses. Add-and-retire, never
hard-delete.

**Board A05 · Bookings & operations.** Every booking across the ten statuses,
from `pendingPayment` to `refunded` and `disputed`. Booking detail:
participants by kind (`adult`, `child`, `infant`, `student`, `resident`,
`instructor`) showing which hold capacity without being charged, add-ons,
waivers, and the full `booking_status_history` as an audit trail. The
**weather-cancellation console**: cancel a departure and see the cascade
before committing — every booking, every transfer that fed it, every refund
leg, every traveler to notify — then commit it as one operation. Availability
oversight across templates, slots and blackout dates.

**Board A06 · Money.** Payments across the nine statuses including
`chargeback`. Refunds, full and partial. Payouts across the five statuses and
the seven providers (`paymob`, `kashier`, `paypal`, `fawry`, `instapay`,
`wise`, `bankTransfer`), with a run that batches, previews and releases. The
**double-entry ledger** across its eight accounts — `travelerReceivable`,
`providerClearing`, `platformCash`, `vendorPayable`, `platformCommission`,
`paymentFees`, `refundsPayable`, `taxPayable` — append-only, corrected by
reversal and never by edit, so design the reversal flow rather than an edit
button. Exchange rates with their source and refresh time, and the rate each
booking actually used. Commission and fee configuration. Every figure is
integer minor units with a currency code — never a bare number.

**Board A07 · Safety, disputes & trust.** **Incidents** across the four
severities (`nearMiss`, `minor`, `serious`, `critical`) and ten kinds,
including `decompressionIllness`, `lostDiver`, `vesselIncident` and
`marineLifeInjury`: report detail, the vendor, the site, the people involved,
the hyperbaric chamber referral, and what changed as a result. This is a
safety record, not a ticket queue — design it with that seriousness.
**Disputes** across the seven statuses with evidence from both sides and a
resolution that writes a ledger reversal. **Moderation** for reviews,
`review_attribute_scores`, Q&A and message threads across the four
`moderation_status` values. Users: search, roles, certifications, and
**impersonation** — which must state why, be time-boxed, be obvious on screen
while active, and land in the audit log.

**Board A08 · Platform.** The **audit log** — every admin action, actor,
target, reason, before and after, filterable and exportable. Feature flags,
with what each gates and where it is on. Geography: dive sites with depths,
hazards, difficulty (`beginner` through `technical`) and entry type;
neighbourhoods; meeting points; pickup zones. The **translation console** for
`service_translations`, `review_translations` and `message_translations` across
the seven locales, showing `machine` / `human` / `needsReview` status, what is
missing, and a review queue — this is how vendor-authored Arabic content
reaches six other languages. Staff and role management for the platform team.

## Do not

Do not design a generic grey admin theme — this console uses the cream, mint,
blush and sand system. Do not use colour alone for status anywhere. Do not
invent metrics, currencies or figures; bracket anything you do not hold. Do not
use emoji or a second icon style. Do not add a board header, notes column,
shot list or contrast table. Do not put a destructive action behind a single
click without a reason field, and do not show a hard-delete where the model
says append-and-reverse. Never lorem ipsum: use the seeded operators (Fanous
Divers, Blue Beach Freediving, Sinai Nomads, Baraka Kite, Moya Yoga, Shamandura
Boat Trips, Assalah Transfers), the real sites and the real neighbourhoods.

## Flag, do not guess

Night `text-brand` has no token, so no coral text appears in Night Dive.
`info-text` on `info-surface` and `lagoon-600` on `mint-50` both compute 4.29
against a 4.5 bar — anything using those pairs carries a dashed `#C13B2C`
edge. Muted text on raised panels is set in `ink-900` until #786757 is
ratified. Three things this console needs that the system has never specified:
a **table row hover and selected state**, a **chart palette beyond the seven
viz colours**, and a **dense-table type role below Small 13/20**. Draw them
provisionally and mark them as proposals rather than adopting them silently.
