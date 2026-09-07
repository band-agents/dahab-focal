# Design import — v3 analysis

A standalone record of what the Claude Design project contained when it was
first read (2026-09-07), how revision **v3** differs from the pre-design brief
in `CLAUDE.md`, and every contrast value recomputed from the imported hexes.
Written so a session with no memory of the conversation that produced it can
pick it up cold.

## Status

The open questions at the end of this document **were answered by the owner on
2026-09-07**. v3 is the design of record; `CLAUDE.md`'s "Non-negotiables" were
rewritten to match it; `packages/tokens/tokens.json` was filled from v3 with two
in-code hex corrections. The resulting work landed in commits `1003e69`
(tokens + CLAUDE.md), `448e248` (the §7 model corrections), and `a29c743`
(the UI toolchain). `docs/FOUNDATION.md` → "Session 2" carries the resolutions.
This file is the analysis those decisions were made from; it is not a list of
outstanding work.

---

## 1. The design project — every file

Project: **"Travel booking design system refresh"**, id
`3faba25b-2220-49c3-b25d-2111cf8d8ef3`, owner `dannzz`, `canEdit: true`. Its
project type is `PROJECT_TYPE_PROJECT` (not `…_DESIGN_SYSTEM`) — reads work; it
is not a valid `DesignSync` push target. `list_files` returns ten entries:

| Path | What it is |
| --- | --- |
| `Design System.dc.html` | **The design of record — revision v3.** 8 sections (The hand · Logo & wordmark · Colour · Typography · The mark set · Components · Motion · Data viz & token export), ~105 KB. A Claude Design `.dc.html` canvas: an `<x-dc>` template plus a `<script type="text/x-dc" data-dc-script>` block holding the data arrays (`RAMPS`, `CONTRAST`, `TYPE`, `MARKS`, `CATS`, `LOCALES`, …). |
| `Design System v2.dc.html` | An earlier pass. Kept for history. Ignored. |
| `Design System v1.dc.html` | The first pass. Kept for history. Ignored. |
| `dahab-focal.tokens.json` | **DTCG token export.** `$schema` design-tokens.org, `$version: "3.0.0"`, `$generated: "2026-09-06"`. The board's token panel names this and the `.css` below as the two files "at the project root, updated to this direction" and says "Nothing on this board should be re-typed by hand in Claude Code." Treated as the authoritative source. |
| `dahab-focal.tokens.css` | The same tokens as CSS custom properties (`--df-*`), light under `:root` and dark under `[data-theme="night-dive"]`. Generated from the board. Where it and the JSON disagree, the JSON wins (see §5). |
| `support.js` | The Claude Design canvas runtime (`// GENERATED from dc-runtime/src/*.ts`). React-based rendering support for `.dc.html`. Not design content. |
| `uploads/pasted-1788642036735-0.png` | Reference image pasted into the board. |
| `uploads/pasted-1788642066955-0.png` | Reference image pasted into the board. |
| `.thumbnail` | Board chrome (preview thumbnail). |
| `uploads` | The uploads directory itself, as a listing entry. |

The board footer: *"Next boards: Entry & identity · Discover · Decide (listing
detail + the comparison engine) · Book · Trip · Account. Earlier passes are kept
as v1 and v2."* So **only the traveler design system exists** — no traveler
product artboards yet, and no vendor or admin design at all.

v3's own token descriptions narrate the departure from earlier passes:
*"The serif is gone."* · *"Display tracking is POSITIVE now, not negative."* ·
*"there is no white-on-coral button in this system"* · *"removes the
white-on-coral trap entirely."*

---

## 2. `CLAUDE.md` non-negotiables vs imported v3

`CLAUDE.md` was written from a brief **before the design existed**. Every colour
and type anchor it named was replaced across three design passes.

| `CLAUDE.md` non-negotiable (pre-design brief) | Imported design v3 (`dahab-focal.tokens.json@3.0.0`) |
| --- | --- |
| **Primary button** = `coral-500` `#FF6B5A` fill with an `abyss-900` label. Where a white label is required, the fill is `coral-800`. | Primary CTA = **`blush-200` `#F9CFC8`** fill with an **`ink-900` `#2E3B3A`** label. There is no coral-fill button. No `abyss-*`, no `coral-500`, no `coral-800` token exists. `blush-300` `#F5B8AD` is the 1px edge and the pressed fill. |
| **Muted text** is `sand-500`, never `sand-400` (2.15:1, borders only). | Muted text is **`clay-700` `#8A7B68`** (semantic `text-muted`). No `sand-500` token. The "borders / decoration only" fail token is **`cream-400` `#BFAB8F`** (2.1:1). |
| **Page ground** = `sand-50`; **primary text** = `abyss-900`. | Page ground = **`cream-50` `#FDFAF6`** ("No pure white anywhere"); primary text = **`ink-900` `#2E3B3A`**. The line for every mark is **`ink-line` `#3B4A48`**, "NEVER pure black". |
| **Fonts:** Fraunces (variable, display), Rubik (UI — latin, latin-ext, cyrillic, arabic), Cairo (Arabic display), JetBrains Mono (tabular & IDs). | **Baloo 2** (display, brand, every price; 600; round terminals; never below 19px, never a UI label). **Rubik** (all UI and body; 300/400/500; Latin + Cyrillic + Arabic in one family). **Baloo Bhaijaan 2** (Arabic display; Arabic body stays Rubik). Monospace is the **system `ui-monospace` stack** — no bundled mono face. No Fraunces. No Cairo. No JetBrains Mono. |
| **Dark pair:** `#E8F1F0` on `#04171E`, ≥ 15.9. | **Night Dive:** text `#EAF2EF` on page ground `#0A2422` (`bg`), card surface `#0F2E2E` (`surface`). The mark line inverts to cream; the offset pastel shape stays pastel; the CTA fill becomes `#C98A7E` with a near-black label. |
| **Documented required ratios:** `abyss-900` on `sand-50` ≥ 16.0 · `coral-700` on `sand-50` ≥ 5.17 · `lagoon-600` on `sand-50` ≥ 4.65 · `abyss-900` on `coral-500` ≥ 5.91 · `#E8F1F0` on `#04171E` ≥ 15.9. | **None of these token pairs exist in v3.** v3's own `a11y.measured` block documents a different set entirely (recomputed in §3). |
| **Forbidden pairings:** `coral-500` on `sand-50` < 3.0 (2.71) · white on `coral-500` < 3.0 (2.80) · `sand-400` on `sand-50` < 3.0 (2.15). | v3 equivalents: white on `blush-200` (the CTA fill) computes **1.42** · `clay-500` `#C99A80` on `cream-50` **2.40** (the word "focal" only) · `cream-400` `#BFAB8F` on `cream-50` **2.14**. |

---

## 3. Every documented ratio, computed from the imported hexes

Method: `packages/tokens/scripts/contrast.mjs` — WCAG 2.x relative luminance,
sRGB linearisation threshold `0.04045`, exponent `2.4`, coefficients
`0.2126 / 0.7152 / 0.0722`. Verified against the reference points
`#000/#fff = 21.00` and `#767676/#fff = 4.54` (rounds to the 4.5 AA boundary).

"Canvas" = the value annotated in `dahab-focal.tokens.json` (`a11y.measured` and
the `CONTRAST` data array) and/or the `.css` comments. **The computed value is
authoritative; the annotation is not.** AA verdict is for normal body text
(needs 4.5:1); non-text / UI-component contrast needs 3.0:1 (WCAG 1.4.11).

### Light theme (against `cream-50` `#FDFAF6` unless noted)

| Pair | Hexes | Computed | Canvas | Verdict |
| --- | --- | --- | --- | --- |
| `text` (`ink-900`) / `bg` | `#2E3B3A` on `#FDFAF6` | **11.19** | 11.4 | AAA |
| `line` (`ink-line`) / `bg` — every mark | `#3B4A48` on `#FDFAF6` | **8.93** | 9.0 | AAA (non-text) |
| `cta-label` / `cta-fill` — **the primary button** | `#2E3B3A` on `#F9CFC8` | **8.20** | 9.4 | AAA |
| `text` / `shape-water` (`mint-200`) | `#2E3B3A` on `#A8E2DC` | **8.09** | 8.3 | AAA |
| `text` / `mint-50` | `#2E3B3A` on `#E6F5F3` | **10.38** | — | AAA |
| `text` / `sand-50` | `#2E3B3A` on `#FCF3E2` | **10.57** | — | AAA |
| `text` / `surface` (`cream-100`) | `#2E3B3A` on `#F6F0E7` | **10.28** | — | AAA |
| `text-brand` (`coral-700`) / `bg` — only coral for text | `#C13B2C` on `#FDFAF6` | **5.14** | 5.2 | AA |
| `coral-700` / `blush-50` | `#C13B2C` on `#FDEEEA` | **4.73** | — | AA |
| `text-link` (`lagoon-600`) / `bg` | `#0E7F80` on `#FDFAF6` | **4.62** | 4.7 | AA |
| `lagoon-600` / `mint-50` — secondary-button label, info strip | `#0E7F80` on `#E6F5F3` | **4.29** | — | **FAIL (text)** |
| `info-text` / `info-surface` | `#0E7F80` on `#E6F5F3` | **4.29** | — | **FAIL (text)** |
| `text-muted` (`clay-700`, **original** `#8A7B68`) / `bg` | `#8A7B68` on `#FDFAF6` | **3.95** | 4.9 | **FAIL (text)** |
| `text-muted` (`clay-700`, **corrected** `#7D6D5E`) / `bg` | `#7D6D5E` on `#FDFAF6` | **4.78** | — | AA |
| `text-muted` (corrected `#7D6D5E`) / `surface` (`cream-100`) | `#7D6D5E` on `#F6F0E7` | **4.39** | — | **FAIL (text)** |
| `dune-700` / `sand-50` — gold text | `#8A5A12` on `#FCF3E2` | **5.37** | 5.4 (json) / **5.7 (css comment)** | AA |
| `olive-700` / `olive-100` — wellness text | `#4A5940` on `#EDF0E7` | **6.52** | — | AA |
| `success-text` / `success-surface` | `#1F7A50` on `#E4F1EA` | **4.57** | — | AA |
| `warning-text` / `warning-surface` | `#8A5A12` on `#FCF3E2` | **5.37** | — | AA |
| `text` / `sand-300` — text on warning fill | `#2E3B3A` on `#E5C889` | **7.19** | — | AA |
| `danger-text` (**original** `#C13333`) / `danger-surface` | `#C13333` on `#F5DCDC` | **4.26** | — | **FAIL (text)** |
| `danger-text` `#C13030` / `danger-surface` | `#C13030` on `#F5DCDC` | **4.33** | — | FAIL (text) |
| `danger-text` (**chosen correction** `#B82D2D`) / `danger-surface` | `#B82D2D` on `#F5DCDC` | **4.68** | — | AA |
| `danger-text` `#AE2B2B` / `danger-surface` | `#AE2B2B` on `#F5DCDC` | **5.08** | — | AA |
| `danger-text` `#A62828` / `danger-surface` | `#A62828` on `#F5DCDC` | **5.47** | — | AA |
| `ink-900` / `blush-300` — pressed CTA | `#2E3B3A` on `#F5B8AD` | **6.85** | — | AA |
| `focus-ring` (`lagoon-focus`) / `bg` — UI 3:1 | `#17A2A0` on `#FDFAF6` | **3.01** | — | pass (bare) |
| `focus-ring` (`lagoon-focus`) / `surface` (`cream-100`) — UI 3:1 | `#17A2A0` on `#F6F0E7` | **2.76** | — | **FAIL (non-text)** |
| `clay-500` / `bg` — brand accent, **must fail** | `#C99A80` on `#FDFAF6` | **2.40** | 2.4 | FAIL (intended) |
| `cream-400` / `bg` — decoration, **must fail** | `#BFAB8F` on `#FDFAF6` | **2.14** | 2.2 | FAIL (intended) |
| white / `blush-300` (pressed fill) — must fail | `#FFFFFF` on `#F5B8AD` | **1.70** | — | FAIL (intended) |
| white / `cta-fill` (`blush-200`) — **must fail** | `#FFFFFF` on `#F9CFC8` | **1.42** | 1.5 | FAIL (intended) |

### Night Dive (dark theme)

`bg` `#0A2422` · `surface` `#0F2E2E` · `raised` `#17403E` · `border` `#255450` ·
`border-strong` `#3A6E68` · `text` `#EAF2EF` · `muted` `#9DB5B0` · shapes
`#4E8F88` (water) / `#C98A7E` (life, also CTA fill) / `#F0DDB0` (land) ·
`ctaLabel` `#0A2422`.

| Pair | Hexes | Computed | Canvas | Verdict |
| --- | --- | --- | --- | --- |
| `text` / `bg` | `#EAF2EF` on `#0A2422` | **14.32** | 12.6 | AAA |
| `text` / `surface` | `#EAF2EF` on `#0F2E2E` | **12.72** | (≈ the 12.6, see §4) | AAA |
| `text` / `raised` | `#EAF2EF` on `#17403E` | **10.03** | — | AAA |
| `muted` / `bg` | `#9DB5B0` on `#0A2422` | **7.51** | 6.2 | AA |
| `muted` / `surface` | `#9DB5B0` on `#0F2E2E` | **6.67** | — | AA |
| `mint-300` / `bg` — night link (css `--df-text-link`) | `#7FD8D0` on `#0A2422` | **9.81** | — | AA |
| `mint-300` / `surface` | `#7FD8D0` on `#0F2E2E` | **8.71** | — | AA |
| `ctaLabel` / `ctaFill` — night CTA | `#0A2422` on `#C98A7E` | **5.76** | — | AA |
| `shape-life` (`#C98A7E`, night CTA fill) / `bg` — UI 3:1 | `#C98A7E` on `#0A2422` | **5.76** | — | pass |
| `#E8A99C` (css-only night `text-brand` / `cta-edge`) / `bg` | `#E8A99C` on `#0A2422` | **8.22** | — | AA (value fine, but not in JSON — §5) |
| `#E8A99C` / `surface` | `#E8A99C` on `#0F2E2E` | **7.30** | — | AA |
| `border-strong` (`#3A6E68`) / `bg` — "min. control boundary", UI 3:1 | `#3A6E68` on `#0A2422` | **2.80** | — | **FAIL (non-text)** |
| `border-strong` (`#3A6E68`) / `surface` — UI 3:1 | `#3A6E68` on `#0F2E2E` | **2.49** | — | **FAIL (non-text)** |
| `border` (`#255450`) / `bg` — dividers | `#255450` on `#0A2422` | **1.91** | — | decorative; 1.4.11 not strictly required |

---

## 4. Findings, stated plainly

### `clay-700` — the muted-text AA failure

`clay-700` `#8A7B68` is the semantic `text-muted` token. The canvas labels it
*"muted TEXT · 4.9 ✓ AA"* in all three exports (`tokens.json` `a11y.measured`,
the `CONTRAST` data array, and the `.css` comment). **Recomputed from the hex it
is 3.95:1 on `cream-50`** — it fails WCAG AA for normal text (needs 4.5:1) and
only clears the 3:1 large-text bar. The type scale puts `small` (metadata),
`caption` (the FX and legal disclosure) and `overline` in this colour, so
sub-AA body copy ships wherever muted text is used. This is a ~1.0 gap and a
level change — not a rounding artefact.

Resolution taken: replaced in code with **`#7D6D5E`**, which computes **4.78:1**
on `cream-50`. Not yet corrected on the canvas. Note it still computes **4.39:1**
on `cream-100` (raised panels) — a darker value again would clear both grounds;
that was out of scope for the correction.

### `danger-text` — the same class, smaller stakes

`danger-text` `#C13333` (`status.dangerText` / css `--df-danger-600`) on its own
`danger-surface` `#F5DCDC` computes **4.26:1** — sub-AA as text. The canvas gives
no ratio for it. Error text has to clear AA on its own, independent of the icon
and word that reinforce it (status is never colour alone).

Resolution taken: replaced with **`#B82D2D`** — the nearest darker value in the
same hue (R ≫ G = B, hue 0°) that clears 4.5:1: it computes **4.68:1**. `#C13030`
(4.33) and values between it still fail.

### Sub-bar pairings found but not fixed

Flagged for a canvas decision, not corrected in code:

- `lagoon-600` / `mint-50` = **4.29** — the secondary-button label (`mint-50`
  fill, `lagoon-600` text) and the "Good today — 25m visibility" info strip.
- `info-text` / `info-surface` = **4.29** — same hex pair, info callouts.
- `text-muted` corrected (`#7D6D5E`) / `cream-100` = **4.39** — muted metadata on
  a raised panel.
- `focus-ring` (`lagoon-focus` `#17A2A0`) / `cream-100` = **2.76** — the focus
  ring against a raised surface fails the 3:1 non-text requirement (3.01 on `bg`,
  a bare pass).
- Night `border-strong` (`#3A6E68`) / night `bg` = **2.80**, / night `surface` =
  **2.49** — the canvas calls `#3A6E68` "minimum for the sole boundary of a
  control"; it does not meet 1.4.11.
- Night `border` (`#255450`) / night `bg` = **1.91** — dividers only, so 1.4.11
  does not strictly apply, but noted.

---

## 5. Night Dive surface-vs-bg discrepancy

`dahab-focal.tokens.json` documents `nightText_on_nightBg: 12.6` (and the
`CONTRAST` array labels the same row *"cream-50 on ink-scrim — Night Dive",
ratio 12.6*, with background `#0F2E2E`).

- `night.bg` = `#0A2422`, `night.surface` = `#0F2E2E`.
- `#EAF2EF` on `#0A2422` (**bg**) computes **14.32**.
- `#EAF2EF` on `#0F2E2E` (**surface**) computes **12.72** ≈ the annotated 12.6.
- The light palette's `ink-scrim` token is also `#0F2E2E`, and the `CONTRAST`
  row is labelled against `ink-scrim`.

Conclusion: the annotated **12.6 was measured against `surface` / `ink-scrim`
`#0F2E2E`**, and the page ground was then darkened to `#0A2422` without the
annotation being updated. Resolution taken: **kept `#0A2422`** as the dark page
ground (the darker ground is the better result) and corrected the documented
number to the computed **14.32**.

---

## 6. JSON vs CSS export inconsistencies

Where `dahab-focal.tokens.json` and `dahab-focal.tokens.css` disagree, the
**DTCG JSON is treated as the source of truth**. Do not invent JSON entries to
paper over a CSS-only key — list it and push it back onto the canvas.

### Value disagreements

| Token | JSON | CSS | Computed | Handling |
| --- | --- | --- | --- | --- |
| `dune-700` on `sand-50` | annotated **5.4** (`a11y.measured.dune700_on_sand50`, `CONTRAST` array) | comment says **5.7** (`--df-dune-700: #8A5A12; /* gold TEXT, 5.7:1 */`) | **5.37** | Neither annotation trusted; computed value written to docs. The hex `#8A5A12` is consistent across both files. |

### CSS-only keys with no JSON counterpart (orphans)

`dahab-focal.tokens.css` defines these under `[data-theme="night-dive"]`;
`dahab-focal.tokens.json`'s `color.night` block defines only `bg`, `surface`,
`raised`, `border`, `borderStrong`, `line`, `text`, `muted`, `shapeWater`,
`shapeLife`, `shapeLand`, `ctaFill`, `ctaLabel`. So the night theme in
`tokens.json` carries **none** of the following:

| CSS key (night) | CSS value | Consequence of the gap |
| --- | --- | --- |
| `--df-text-brand` | `#E8A99C` | Night-mode brand / coral text has no token. `#E8A99C` computes 8.22:1 on `#0A2422`, so the *value* is fine — it simply is not in the JSON. (Light `--df-text-brand` = `var(--df-coral-700)` and JSON `semantic.light.textBrand` = `{color.coral.700}` — those agree.) |
| `--df-cta-edge` | `#E8A99C` | Night CTA 1px edge has no token. (Light: JSON `semantic.light.ctaEdge` = `{color.blush.300}`, agrees with CSS.) |
| `--df-cta-fill-pressed` | `#E8A99C` | Night CTA pressed fill has no token. (Light: JSON `ctaFillPressed` = `{color.blush.300}`, agrees.) |
| `--df-text-link` | `#7FD8D0` | Night-mode links have no token. Without it a link inherits the light `#0E7F80` (~1.6:1 on `#0A2422` — invisible). **Blocks dark mode for any linked text.** |
| `--df-focus-ring` | `#7FD8D0` | Night-mode focus ring has no token. Inherits `lagoon-focus #17A2A0` (~2.0:1 on the night surface). **Blocks the a11y focus requirement in dark.** |

The user's brief singled out `--df-text-brand` and `--df-cta-edge`; all five are
the same class (CSS-only night keys) and are listed here together. `text-link`
and `focus-ring` are the two that block shipping dark mode.

### Naming inconsistency

The JSON `color.night` block uses `raised`; the light `semantic` layer and the
CSS use `surface-raised` / `--df-surface-raised`. Cosmetic; JSON taken as
authoritative and normalised to `surface-raised` on import.

---

## 7. The three open questions (verbatim, as put to the owner)

> 1. **Is `Design System.dc.html` v3 / `dahab-focal.tokens.json@3.0.0` the design
>    of record?** If yes, CLAUDE.md's "Non-negotiables" section (coral-500
>    button, abyss/sand palette, Fraunces/Cairo/JetBrains, the documented
>    ratios) is stale and needs rewriting to match — and I'd like your go-ahead
>    to update it in the same series of commits, since `pnpm lint:hardcoded` and
>    the token tests encode those rules. If v3 is a rejected experiment, tell me
>    which pass (v1/v2) governs and I'll read that instead.
>
> 2. **`clay-700` at 3.95:1 for muted text** — three options, your call: (a) the
>    hex is wrong and the real one is darker (need the corrected value from the
>    board), (b) the "4.9" claim is wrong and muted text is knowingly
>    large-text-only, or (c) something else. Same question, smaller stakes, for
>    `danger-600` on `danger-100` (4.26:1).
>
> 3. **The Night-Dive base** — was `12.6` measured against `surface #0F2E2E`
>    (matches: 12.72) rather than `bg #0A2422`? And is the intended dark page
>    ground `#0A2422` or `#0F2E2E`?

### The answers given (2026-09-07)

1. **Yes — v3 is the design of record.** CLAUDE.md was written from a brief
   before the design existed; the design won across three passes. Rewrite the
   "Non-negotiables" to match v3 exactly (blush-200/ink-900 CTA, cream/ink/clay
   palette, Baloo 2 + Rubik + Baloo Bhaijaan 2, system mono, the real computed
   ratios) in the same series of commits. v1 and v2 are history — ignore them.
2. **`clay-700`: option (a)** — correct the hex, not the claim. Use `#7D6D5E`
   (4.78:1 on `cream-50`). Apply the same rule to `danger-600` on `danger-100`:
   error text must clear 4.5:1 as text; pick the nearest darker value in the
   same hue (chosen: `#B82D2D`, 4.68:1). Flag both in `docs/FOUNDATION.md` as
   corrections made in code but **not yet made in the design canvas**, so they
   can be pushed back into Claude Design.
3. **Yes** — `12.6` was measured against `surface #0F2E2E`, then the page ground
   was darkened. **Keep `#0A2422`** as the dark page ground and correct the
   documented number to the computed **14.32**.

General rule set at the same time: the computed value is authoritative, never
the annotation — recompute every documented ratio from the hexes, write the
computed value into the docs, and list anything that fails. Where the JSON and
CSS disagree on whether a key exists, the DTCG JSON is the source of truth;
list the orphaned CSS keys rather than inventing JSON entries for them.
