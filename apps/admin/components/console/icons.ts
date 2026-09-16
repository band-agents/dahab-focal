/**
 * The console icon set.
 *
 * Deliberately NOT the design system's 37 marks. Those are a 3px line over a
 * pastel silhouette, drawn to be the subject of a tile at 40px and up — that
 * is what makes the traveller app look like its mark sheet. Shrunk to 20px
 * beside a row of metadata they turn to mud, and `<Mark>` already has to
 * thicken its line to 4.6 below 24px to survive at all.
 *
 * These are the opposite object: a single 1.75px stroke on a 24-unit grid, no
 * fill, no offset shape, sized 16–24px, and they take `currentColor` so an
 * icon in a danger row is danger-coloured without anyone passing a colour.
 *
 * `directional` is data rather than a prop, because it is a property of the
 * drawing and not of the call site. A chevron points at where the reader is
 * going, so it mirrors with the text direction; a boat and a dive tank are
 * physical objects and keep their orientation in Arabic. Getting that wrong
 * is a bug you only see in the RTL screenshot, so there is no way to pass it.
 */

export interface IconShape {
  /** Path data on a 24×24 grid, stroked — never filled. */
  readonly d: string;
  /** Mirrors with the writing direction. False for anything physical. */
  readonly directional?: true;
  /** Drawn as a filled dot rather than a stroke; used for status marks. */
  readonly dot?: true;
}

export const ICONS = {
  // ── Navigation ─────────────────────────────────────────────────────────
  /** The day's work. A date frame with today marked. */
  today: { d: 'M4 6.5h16v13H4zM4 10.5h16M8 3.5v4M16 3.5v4M11 14h2.5v2.5H11z' },
  /** An operator: a shopfront on the Assalah strip. */
  operators: { d: 'M4 9.5h16v11H4zM3 9.5 5 4h14l2 5.5M9.5 20.5v-6h5v6' },
  /** People — travellers and staff both. */
  people: {
    d: 'M9 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM3.5 20.5c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5M16 5.6a3.25 3.25 0 0 1 0 6.3M17.5 15.4c1.9.7 3 2.6 3 5.1',
  },
  /** Money: a note, not a coin — payouts here are transfers. */
  money: { d: 'M2.5 6.5h19v11h-19zM12 14.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM6 9.8v4.4M18 9.8v4.4' },
  /** Everything that did not fit in four slots. */
  more: { d: 'M4 7.5h16M4 12h16M4 16.5h16' },

  // ── Movement ───────────────────────────────────────────────────────────
  /** Into the detail. Mirrors, because it points where the reader is going. */
  chevronEnd: { d: 'M9.5 5.5 16 12l-6.5 6.5', directional: true },
  /** Back out of it. */
  chevronStart: { d: 'M14.5 5.5 8 12l6.5 6.5', directional: true },
  chevronDown: { d: 'M5.5 9.5 12 16l6.5-6.5' },
  /** Reversal — a ledger entry is corrected by its opposite, never edited. */
  reverse: { d: 'M20 11.5a8 8 0 1 0-2.4 5.7M20 5.5v6h-6', directional: true },
  refresh: { d: 'M20 12a8 8 0 1 1-2.6-5.9M20.5 4.5v5h-5', directional: true },

  // ── State ──────────────────────────────────────────────────────────────
  /** Something is wrong now. */
  alert: { d: 'M12 3.8 22 20.2H2L12 3.8ZM12 10v4.2M12 17.2v.6' },
  /** Verified, balanced, done. */
  check: { d: 'M4.5 12.5 9.5 18 19.5 6.5' },
  /** Verification itself — a document that was checked, not just filed. */
  shield: { d: 'M12 3.2 20 6v6.4c0 4-3.3 6.8-8 8.4-4.7-1.6-8-4.4-8-8.4V6l8-2.8ZM8.6 12l2.4 2.6 4.4-5' },
  /** Suspended. Not a delete — the rows stay, the operator stops trading. */
  ban: { d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM6 6l12 12' },
  close: { d: 'M6 6l12 12M18 6 6 18' },
  plus: { d: 'M12 5v14M5 12h14' },

  // ── The domain ─────────────────────────────────────────────────────────
  /** Expiry is the theme of the whole vendor model. */
  clock: { d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7v5.3l3.4 2' },
  /** A licence, an insurance certificate, a tax card. */
  doc: { d: 'M6 2.5h8l4.5 4.5v14.5H6zM14 2.5V7h4.5M9 12h6M9 16h4' },
  /** Weather cancels boats, so the boat is a first-class object here. */
  boat: { d: 'M3.5 15.5h17l-2.2 5H5.7zM12 3v12.5M12 5.5l6 8M12 5.5l-6 8' },
  /** A tank carries a hydrostatic test date, which is why it has an icon. */
  tank: { d: 'M8.5 8h7v13h-7zM10 8V5.5h4V8M11 3h2v2.5h-2zM8.5 12h7' },
  /** 18 kt and the departures start falling over. */
  wind: { d: 'M3 8.5h10a2.75 2.75 0 1 0-2.75-2.75M3 12.5h14a2.75 2.75 0 1 1-2.75 2.75M3 16.5h7.5' },
  /** A dive site, a pickup point, a neighbourhood. */
  pin: { d: 'M12 21.5c4.3-4.7 6.5-8.1 6.5-10.5a6.5 6.5 0 1 0-13 0c0 2.4 2.2 5.8 6.5 10.5ZM12 13.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z' },
  search: { d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16 16l4.5 4.5' },
  filter: { d: 'M3.5 6.5h17l-6.5 7.2v5.3l-4 2v-7.3z' },
} as const satisfies Record<string, IconShape>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];
