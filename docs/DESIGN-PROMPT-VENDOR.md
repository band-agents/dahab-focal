# Claude Design prompt — vendor dashboard, Boards V01–V07

Expo, mobile **and** desktop. Same design system as the traveler app. Paste
everything below the rule into the Claude Design project.

---

Build the Dahab Focal **vendor dashboard** — what a Dahab operator uses to run
their business. The traveler app's Board 03 is approved and this uses the same
design system.

## Screens only

No board header, no description paragraph, no notes column, no shot list, no
contrast table. Frames on the canvas ground `#F1EAE0`, in reading order, 34px
padding around the set, 26–34px between frames, wrapping to a new row as
needed. Locale and theme ride on `data-props` tweak chips, not on rows inside
the artboard.

## Two form factors, and the split is the product

This runs on a phone at the dock and on a laptop in the office, and those are
genuinely different jobs. Design both, and put them side by side on each board:

- **Phone, 390 × 844 — run the day.** Manifests, headcount, who has been
  picked up, cancel a departure, message a traveler, log an incident. Big
  targets, one-handed, readable in sunlight, works offline. Signal drops
  between Assalah and the Blue Hole most mornings, so every screen a guide
  needs on the water is an offline screen by design.
- **Desktop, 1440 × 900 — set up the business.** Services, pricing, staff,
  documents, payouts, availability. A 248px left rail on `th.raised`,
  content column max 1120, data tables at 52px rows.

Where a job exists on both, they are not the same screen scaled — the phone
shows the next four hours, the desktop shows the quarter.

## Arabic is not a translation here, it is the primary language

Traveler-facing Arabic is one of seven locales. A Dahab dive centre's staff
work in Arabic first. Treat `ar-EG` as a first-class default on this surface:
design the Arabic frames properly rather than mirroring an English one, keep
the display face Baloo Bhaijaan 2 with Rubik body at +20% line-height, and
render Western digits. **At least half the frames on each board are Arabic**,
including the dense ones — the manifest, the pricing rules and the payout
table. Include one `en-GB` and one `de-DE` frame per board for the layout
check.

## Reuse the system

Lift `MARKS` (37), `ILLOS` (6), `CATS` (12), `NIGHT_TINT`, `tintOf()` and the
whole `LIGHT` / `NIGHT` theme objects verbatim from `Board 03 - Home.dc.html`.
Every colour comes from `th.*`. No symbol is redrawn.

On phone, marks run 40px and up as in the traveler app. On desktop, marks run
20–24px in tables and rails, thickening the line to 4.6 at 24px and below per
Board 03's rule. Status is colour plus mark plus word, always. Primary buttons
are `blush-200` with an `ink-900` label. Danger text is #A82B2B on the #F5DCDC
tint, #C13333 on cream. Focus ring 2px `lagoon-focus` at 2px offset. Logical
properties only. Sheets on phone, side panels on desktop.

## Owner and staff are two different products

From the permission matrix: `vendorStaff` holds `catalog.read`,
`catalog.write`, `booking.readVendor`, `booking.manageVendor`, `vendor.readOwn`
and `resource.manage` — and nothing else. `vendorOwner` adds `catalog.publish`,
`vendor.writeOwn`, `staff.manage`, `pricing.manage` and `payout.readOwn`.

So a guide sees no money, sets no prices, manages no staff and cannot publish.
**Design that as a real difference, not a greyed-out button.** Add a `role`
tweak (`vendorOwner` / `vendorStaff`) and show the staff view of the same
screens: fewer nav entries, no money section, a service editor that saves a
draft and hands it to the owner for publishing, and — where a staff member
genuinely hits a wall — a line saying who can do it rather than a disabled
control with no explanation.

## The boards

**Board V01 · Today.** Phone first. The next four hours: each departure with
its time, service, guide, headcount against capacity, and the travelers who
have not yet been picked up. Tap a departure for the **manifest** —
participants by kind, certifications verified against what the service
requires, waivers signed or outstanding, emergency contacts, and medical
flags shown to the guide who needs them and nobody else. Check people in.
Mark a no-show. Today's weather with wind against every booked boat. An
offline banner that states what is already saved on this phone, in Board 03's
voice. Desktop beside it: the week, with capacity and utilisation.

**Board V02 · Bookings & the day.** The booking list across the ten statuses.
Booking detail with participants, add-ons, waivers and the full status
history. Confirm an `awaitingVendor` request. **Cancel a departure for
weather** — the cascade shown before it is committed: every traveler, the
Assalah Transfers pickup that fed it, the refund leg, the messages that go
out — then one action to commit the whole chain. Reschedule. Message the
travelers on a departure at once. Report an **incident** across the four
severities and ten kinds, with the hyperbaric chamber and SOS one tap away
and the report reaching the platform immediately.

**Board V03 · Services.** The service builder, desktop-led, and the screen
this whole product is judged on: comparable attributes are **data**, so the
form is generated from `attribute_definitions` for the chosen category, never a
fixed set of fields. Show the nine data types rendering as real controls
(`measure` with its unit, `multiEnum` as chips, `duration`, `date`,
`boolean`), each with the hint text that says how it will be compared against
other operators, and a live preview of how the service will read in the
traveler's comparison table. The **inclusions matrix** — gear, marine park
fee, transfer, guide ratio, lunch, nitrox — stated explicitly, because the
hidden-cost detector normalises against exactly this and an operator who fills
it honestly ranks better. Variants, tiers and option groups. Dive-site
association. Translations across the seven locales with `machine` / `human` /
`needsReview` status and a "write it yourself in Arabic, we translate the
rest" path. Draft → `underReview` → `published`, where publishing is the
owner's alone.

**Board V04 · Pricing.** Owner only. The five pricing models (`perPerson`,
`perGroup`, `perPersonTiered`, `perUnitPerDay`, `free`), with `unitBasis`
required and explicit for `perUnitPerDay` — per person, per item or per group —
because a party of two renting one scooter is one scooter. Pricing rules across
the eight condition kinds (`seasonal`, `dayOfWeek`, `earlyBird`, `lastMinute`,
`participantKind`, `groupSize`, `currency`, `always`) and the three adjustment
kinds (`percentage`, `fixed`, `override`). **Priority order is the operator's
explicit choice and it must be visible and reorderable**, because 10% then a
300 EGP voucher is not the same total as the reverse. Exclusion groups. A
**price simulator** that runs a real party through the rules and itemises the
result in applied order — the same computation the traveler checkout and the
comparison engine use, never a second implementation. Seasonal ranges that
cross the new year are two rules, and the form should say so rather than infer
it.

**Board V05 · Resources & staff.** Resources across the ten kinds (`boat`,
`vehicle`, `tank`, `kite`, `board`, `bcd`, `regulator`, `wetsuit`, `camera`,
`other`) with capacity, certifications and the **maintenance log**. Tanks carry
hydrostatic test dates and a tank inside its window cannot go on a manifest —
show that as a real block on the departure, not a note. Boats and vehicles carry
licences that expire. Staff, owner only: the roster, roles, and staff
certifications with their agency, level and expiry — an instructor whose rating
lapsed cannot be assigned as guide, and the calendar should refuse it with the
reason. An expiry summary for this vendor mirroring the platform's expiry
board.

**Board V06 · Money.** Owner only. Earnings by period in EGP with a EUR
equivalent, gross, commission, payment fees and net stated separately — never
one blended figure. Payouts across the five statuses and the seven providers,
with the payout account and its verification state. Per-booking breakdown so a
disputed charge can be reproduced exactly. Refunds the operator issued and
their ledger effect. Disputes needing a response, with what evidence is
wanted. Every figure integer minor units plus currency code.

**Board V07 · Profile, reviews & messages.** The vendor record, owner only:
legal and display name, neighbourhood, location, contact, WhatsApp, the public
storefront preview. **Documents** — the nine types with expiry dates, upload,
and the verification state coming back from the platform including a rejection
reason that is actually readable. Reviews with the per-attribute scores, and a
right of reply. Q&A. Message threads with travelers, on the `chat` mark, with
the seven-locale translation shown inline so an Arabic-speaking guide can
answer a German traveler. Notification settings. Onboarding: the `applied` →
`inReview` → `active` path a new operator walks, with a checklist of what is
still missing before they can publish.

## Do not

Do not scale the desktop layout down and call it the phone. Do not put money,
pricing, staff management or publishing in the staff role. Do not use colour
alone for status. Do not show a disabled control without saying who can use
it. Do not invent commission rates, fees or figures — bracket anything you do
not hold. Do not use emoji or a second icon style. Do not add a board header,
notes column, shot list or contrast table. Never lorem ipsum: this vendor is
Fanous Divers in Masbat, CDWS licensed, 4.9 from 128 reviews, insurance valid
to 30 Jun 2026, operating permit expiring 29 Feb 2026, two tanks due
hydrostatic test this month.

## Flag, do not guess

Night `text-brand` has no token. `info-text` on `info-surface` and
`lagoon-600` on `mint-50` both compute 4.29 — dashed `#C13B2C` edge on
anything using them. Muted on raised is `ink-900` until #786757 is ratified.
Two things this surface needs that the system has not specified: a **table row
hover and selected state**, and a **dense-table type role below Small 13/20**.
Draw them as marked proposals.
