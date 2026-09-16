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

  // ── The modules ────────────────────────────────────────────────────────
  /** The launcher itself: every module at once. */
  home: { d: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z' },
  /** Which days are open, which are blacked out. */
  calendar: { d: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3' },
  /** A traveller asking an operator a question, and the answer. */
  chat: { d: 'M3.5 5.5h17v11h-11l-4.5 4v-4h-1.5zM8 9.5h8M8 12.5h5' },
  /**
   * The comparison engine — the reason this product exists. Two columns and
   * the rule that decides between them, which is what the engine is.
   */
  compare: { d: 'M5.5 20.5v-14M18.5 20.5v-9M12 3.5v17M3 6.5h5M16 11.5h5M9.5 8h5' },
  /** Boats, vans, tanks: things with a test date and a service record. */
  wrench: { d: 'M15.2 3.6a5.5 5.5 0 0 0-6.7 7.1L3.5 15.7l2.8 2.8 5-5a5.5 5.5 0 0 0 7.1-6.7l-3.2 3.2-2.5-2.5z' },
  /** A provider on the other end of a key: payments, SMS, maps. */
  plug: { d: 'M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0zM12 17v4' },
  /** Is it up. The one module that answers with a live probe. */
  pulse: { d: 'M2.5 12.5h4l2.5-7 4 14 2.5-7h6' },
  /** What a thing costs, and the rule that got it there. */
  tag: { d: 'M11.5 3.5H20v8.5l-8.7 8.7-8.5-8.5zM16.2 7.8v.02' },
  /** EGP to EUR, and the rate it happened at. */
  exchange: { d: 'M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5', directional: true },
  /** Who may do what, and who is pretending to be whom. */
  key: { d: 'M15.5 3.5a5 5 0 1 0-4.2 7.7l-7.8 7.8v2h3v-2h2v-2h2v-2.4l2.5-2.5a5 5 0 0 0 2.5-8.6ZM16.5 7.5v.02' },
  /** Something that runs on its own schedule and can fail on its own. */
  jobs: { d: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 1.8M12 3.5V2M20.5 12H22' },
  /** A rating somebody left. */
  star: { d: 'M12 3.5l2.7 5.6 6.1.85-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.85z' },
  /** A report somebody takes away with them. */
  export: { d: 'M12 3.5v11M8 11l4 3.5 4-3.5M4.5 17v3.5h15V17' },
} as const satisfies Record<string, IconShape>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];
