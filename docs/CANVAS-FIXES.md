# Canvas fixes — the worklist

Everything outstanding against the Claude Design canvas, in one list, ordered
so it can be worked through in a single pass.

The canvas is the source of truth. Nothing in this file has been written into
`packages/tokens/tokens.json` except where the "In code" column says so
explicitly — those two are documented in-code corrections that still need
pushing back. Everything else is a proposal for you to apply on the board,
after which the tokens are re-imported here.

- Project: `3faba25b-2220-49c3-b25d-2111cf8d8ef3`, "Travel booking design system refresh"
- Files: `Design System.dc.html` (v3), `dahab-focal.tokens.json@3.0.0`, `dahab-focal.tokens.css`
- Every ratio below was recomputed from the hexes by
  `packages/tokens/scripts/contrast.mjs` (WCAG 2.2, sRGB threshold 0.04045).
  Proposals come from `packages/tokens/scripts/propose-night.mjs`, which holds
  hue and chroma in OKLCH and walks lightness.
- Night grounds throughout: `bg` `#0A2422`, `surface` `#0F2E2E`. A proposal must
  clear its bar against **both**, because a link sits on the page and a status
  strip sits on the raised surface.

Bars: **4.5:1** for text, **3:1** for non-text UI (WCAG 1.4.11).

---

## 1. Two corrections already made in code, not yet on the canvas

These two are live in `tokens.json` today, so code and canvas currently
disagree. Applying them on the board removes the divergence.

| Token path | CSS key | Canvas value | In code now | Computed | Why |
| --- | --- | --- | --- | --- | --- |
| `color.light.clay-700` (`text-muted`) | `--df-clay-700` | `#8A7B68` | **`#7D6D5E`** | canvas **3.95**, ours **4.78** on `cream-50` | The canvas comment says "muted TEXT · 4.9 ✓ AA". It is 3.95:1 — a fail for normal text, and this token carries `small`, `caption` and `overline`, which includes the FX and legal disclosure. |
| `color.light.danger-text` | `--df-danger-600` | `#C13333` | **`#B82D2D`** | canvas **4.26**, ours **4.68** on `danger-surface` | Error text has to clear AA on its own, not lean on the icon and label beside it. `#B82D2D` is the nearest darker value in the same hue that clears it; `#C13030` (4.33) and everything between still fails. |

**Also fix the comment**, not just the value: `--df-clay-700`'s trailing
`/* muted TEXT, 4.9:1 */` is the annotation that hid the problem.

---

## 2. Stale ratio annotations

No value changes — the numbers written on the board are wrong and should be
corrected so the next reader is not misled the way the `clay-700` comment
misled this one.

| Where | Says | Computed | Note |
| --- | --- | --- | --- |
| `--df-text` (night) | `/* 12.6:1 */` | **14.32** | 12.6 was measured against `surface` `#0F2E2E` (computes 12.72), then the page ground was darkened to `#0A2422`. The darker ground is the better result; only the number is stale. |
| `--df-text-muted` (night) | `/* 6.2:1 */` | **7.51** | Same cause. |
| `--df-dune-700` | `/* gold TEXT, 5.7:1 */` | **5.37** | The JSON says 5.4, the CSS says 5.7. Both round the same computed value differently; 5.37 is correct. |
| `--df-ink-900` | `/* PRIMARY TEXT, 11.4:1 */` | **11.19** | Rounding only. |
| `--df-coral-700` | `/* the only coral for TEXT, 5.2:1 */` | **5.14** | Rounding only. |
| `--df-lagoon-600` | `/* link TEXT, 4.7:1 */` | **4.62** | Rounding only. |
| `--df-cta-*` | board says the CTA pair is 9.4:1 | **8.20** | `ink-900` on `blush-200`. Still comfortably AAA; the figure is just high. |

---

## 3. Night values the CSS has and the JSON does not

The DTCG JSON is what this repo imports, and its `color.night` block has no
counterpart for these five. The CSS export already carries them, so **nothing
needs designing** — the JSON just has to catch up.

Until it does, each falls back to its light value, and two of those failures
are severe enough to block dark mode outright.

| Token path | CSS key | Value to add | on bg | on surface | Bar | Consequence today |
| --- | --- | --- | --- | --- | --- | --- |
| `color.night.text-link` | `--df-text-link` | `#7FD8D0` | 9.81 | 8.71 | 4.5 | **Blocks dark mode.** Inherits light `#0E7F80` at ~1.6:1 — invisible. Visible in `apps/gallery/screenshots/gallery-dark-ltr-en.png` as an unreadable "See more". |
| `color.night.focus-ring` | `--df-focus-ring` | `#7FD8D0` | 9.81 | 8.71 | 3 | **Blocks the a11y gate.** Inherits `lagoon-focus #17A2A0` at ~2.0:1. |
| `color.night.text-brand` | `--df-text-brand` | `#E8A99C` | 8.22 | 7.30 | 4.5 | Coral text has no night value. |
| `color.night.cta-edge` | `--df-cta-edge` | `#E8A99C` | 8.22 | 7.30 | 3 | The 1px CTA edge has no night value. |
| `color.night.cta-fill-pressed` | `--df-cta-fill-pressed` | `#E8A99C` | 8.22 | 7.30 | 3 | The pressed CTA fill has no night value. |

All five pass comfortably. Adding them to the JSON is a copy, not a decision.

---

## 4. Night values that exist nowhere — proposed

No night counterpart in either export. These are proposals; the hue is held
and only lightness (and chroma, where the gamut forces it) moves.

### 4a. Status strips

A status strip is a **tinted panel**, not a beacon. Night's own
`surface-raised` `#17403E` sits **1.43:1** above `bg`, so the proposed strips
match that lift with a hue on them. A pale mint strip on a near-black page
would technically clear 3:1 and would still be a hole burned in the screen —
which is why the surfaces below are dark, and the bar that actually matters is
the **ink on its own strip**.

| Token path | Light value | Proposed | on bg | on surface | ink on its strip |
| --- | --- | --- | --- | --- | --- |
| `color.night.success-surface` | `#E4F1EA` | `#323C37` | 1.43 | 1.27 | — |
| `color.night.success-text` | `#1F7A50` | `#5FB386` | 6.43 | 5.71 | **4.51** |
| `color.night.warning-surface` | `#FCF3E2` | `#40392C` | 1.43 | 1.27 | — |
| `color.night.warning-text` | `#8A5A12` | `#CD9959` | 6.44 | 5.72 | **4.51** |
| `color.night.danger-surface` | `#F5DCDC` | `#483535` | 1.43 | 1.27 | — |
| `color.night.danger-text` | `#B82D2D` | `#FF7A71` | 6.42 | 5.70 | **4.51** |
| `color.night.info-surface` | `#E6F5F3` | `#303C3B` | 1.42 | 1.27 | — |
| `color.night.info-text` | `#0E7F80` | `#52B1B2` | 6.43 | 5.72 | **4.52** |

Every ink clears 4.5:1 three ways: on its own strip, on `bg`, and on `surface`
— so the token is safe used bare as well as on the strip.

Visible today in `gallery-dark-ltr-en.png`: the three strips keep their light
pastel surfaces and read as glowing rectangles on the dark ground.

### 4b. Category shapes — three are already answered

`cat-water-shape`, `cat-life-shape` and `cat-land-shape` are byte-identical to
the generic `shape-*` tokens in light, and the canvas **already** dims those
for night. So they should alias, not be invented:

| Token path | Light value | Night value | Source |
| --- | --- | --- | --- |
| `color.night.cat-water-shape` | `#A8E2DC` | `#4E8F88` | = canvas night `--df-shape-water` |
| `color.night.cat-life-shape` | `#F9CFC8` | `#C98A7E` | = canvas night `--df-shape-life` |
| `color.night.cat-land-shape` | `#F0DDB0` | `#F0DDB0` | = canvas night `--df-shape-land` (deliberately undimmed) |

Only two have no twin. The canvas dimmed its shapes by a mean OKLCH lightness
factor of **×0.737** (water ×0.694, life ×0.780, land ×1.0); these apply the
same factor, so they sit with the others rather than beside them.

| Token path | Light value | Proposed | on bg | on surface |
| --- | --- | --- | --- | --- |
| `color.night.cat-wellness-shape` | `#D6DDC9` | `#8D9381` | 5.14 | 4.57 |
| `color.night.cat-transfers-shape` | `#E3C8BA` | `#9B8376` | 4.58 | 4.07 |

### 4c. Category surfaces

Same reasoning as the status strips: matched to the `surface-raised` lift.

| Token path | Light value | Proposed | on bg | on surface |
| --- | --- | --- | --- | --- |
| `color.night.cat-water-surface` | `#E6F5F3` | `#303C3B` | 1.42 | 1.27 |
| `color.night.cat-life-surface` | `#FDEEEA` | `#423734` | 1.42 | 1.26 |
| `color.night.cat-land-surface` | `#FCF3E2` | `#40392C` | 1.43 | 1.27 |
| `color.night.cat-wellness-surface` | `#EDF0E7` | `#383B34` | 1.43 | 1.27 |
| `color.night.cat-transfers-surface` | `#F5E6DE` | `#433831` | 1.43 | 1.27 |

### 4d. Data viz — a decision, not a defect

All seven light viz colours already clear 3:1 against both night grounds by a
wide margin, so the honest recommendation is **keep the light values**.

| Token path | Value | on bg | on surface |
| --- | --- | --- | --- |
| `color.night.viz-1` | `#A8E2DC` | 11.31 | 10.05 |
| `color.night.viz-2` | `#7FD8D0` | 9.81 | 8.71 |
| `color.night.viz-3` | `#C6EEEA` | 13.05 | 11.59 |
| `color.night.viz-4` | `#F9CFC8` | 11.48 | 10.19 |
| `color.night.viz-5` | `#F0DDB0` | 12.17 | 10.81 |
| `color.night.viz-6` | `#E3C8BA` | 10.27 | 9.13 |
| `color.night.viz-7` | `#D6DDC9` | 11.68 | 10.37 |

Worth a deliberate call, though: 10–13:1 is very bright for a dark theme. For a
thin chart line that is right; for a large area fill it will glare, and you
dimmed `shape-water` and `shape-life` for exactly that reason. If viz colours
are ever used as fills, they want the same ×0.737 treatment. **Your call — I
have not proposed dimmed values because nothing in the design says these are
used as fills.**

---

## 5. Existing night values that fail their bar

Values that are on the canvas already and do not meet 1.4.11.

| Token path | Value | on bg | on surface | Bar | Note |
| --- | --- | --- | --- | --- | --- |
| `color.night.border-strong` | `#3A6E68` | **2.80** | **2.49** | 3.0 | The CSS comment calls it "minimum for the sole boundary of a control". It is not: a control whose only boundary is this border fails 1.4.11. Needs to be lighter, or controls need a second cue. |
| `color.night.border` | `#255450` | 1.91 | 1.70 | — | Dividers only, so 1.4.11 does not strictly apply. Recorded so it is not mistaken for a control boundary later. |

---

## 6. Light-theme pairings below their bar — decide, do not necessarily change

Found on recompute, flagged and **not** fixed, because each is a design call
rather than an error.

| Pair | Computed | Bar | Where it bites |
| --- | --- | --- | --- |
| `info-text` `#0E7F80` on `info-surface` `#E6F5F3` | **4.29** | 4.5 | Info callouts; the "Good today — 25m visibility" conditions strip on the listing card. |
| `lagoon-600` on `mint-50` | **4.29** | 4.5 | The **secondary button** label. |
| `clay-700` corrected `#7D6D5E` on `surface` `cream-100` | **4.39** | 4.5 | Muted text on a raised panel. 4.78 on `bg`, 4.39 on `surface`. A darker `#786757` would clear both. |
| `focus-ring` `#17A2A0` on `surface` `cream-100` | **2.76** | 3.0 | The focus ring against a raised panel. 3.01 on `bg` — a bare pass there. |

The `clay-700`-on-`surface` one is worth resolving in the same pass as item 1,
since you are touching that token anyway.

---

## 7. Structural, not a value

| Item | Note |
| --- | --- |
| Project type | The project is `PROJECT_TYPE_PROJECT`, not `PROJECT_TYPE_DESIGN_SYSTEM`. Reads work; it is not a valid `DesignSync` push target, and that type is immutable at creation. If you ever want tokens pushed back automatically, it needs a new design-system project. |
| JSON/CSS naming | The JSON `night` block omits the `raised` vs `surface-raised` naming the CSS uses. Cosmetic, but it is why an importer has to special-case one of them. |
| Motion signatures | The six named motion signatures exist only as one prose `$note` in the JSON, not as structured tokens. Components cannot read them. Worth promoting to real entries. |
| `noFlip` icon list | The per-mark list is not published on the board. `tokens.json` carries a conservative first pass in `icon.noFlip.names` (27 of 48 marks) that needs sign-off. |

---

## After you push

```bash
# Re-import and regenerate, then check nothing regressed.
pnpm --filter @dahab/tokens build
pnpm verify
pnpm shoot
```

`pnpm shoot` is the one that will show the night fixes landing: the "See more"
link and the status strips in `gallery-dark-ltr-en.png` are the visible
symptoms of items 3 and 4a.
