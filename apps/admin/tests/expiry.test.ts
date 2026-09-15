import { describe, expect, it } from 'vitest';

import { BANDS, bandFor } from '../lib/expiry';

/**
 * The banding decides what an operator sees as "expired" versus "inside 7
 * days". An off-by-one means either a permit that lapsed this morning shows as
 * still valid, or one valid until midnight shows as expired and a departure
 * gets cancelled for nothing.
 *
 * Every case is measured against a fixed `now`, because a test that depends on
 * the wall clock passes in the morning and fails in the evening.
 */

const NOW = new Date('2026-09-11T09:30:00Z');

describe('the expiry bands', () => {
  it('treats yesterday as expired', () => {
    expect(bandFor('2026-09-10', NOW)).toBe('expired');
  });

  it('treats today as still valid, not expired', () => {
    // A permit expiring today has not lapsed until tomorrow. Telling an
    // operator otherwise costs them a departure.
    expect(bandFor('2026-09-11', NOW)).toBe('within7');
  });

  it('is not fooled by the time of day', () => {
    // Late in the evening, "today" is still today.
    const evening = new Date('2026-09-11T22:45:00Z');
    expect(bandFor('2026-09-11', evening)).toBe('within7');
    expect(bandFor('2026-09-10', evening)).toBe('expired');
  });

  it('puts each boundary in the tighter band', () => {
    expect(bandFor('2026-09-18', NOW)).toBe('within7'); // exactly 7 days
    expect(bandFor('2026-09-19', NOW)).toBe('within30');
    expect(bandFor('2026-10-11', NOW)).toBe('within30'); // exactly 30
    expect(bandFor('2026-10-12', NOW)).toBe('within90');
    expect(bandFor('2026-12-10', NOW)).toBe('within90'); // exactly 90
  });

  it('returns null past the furthest window and for no expiry', () => {
    // The board shows four windows, not everything ever.
    expect(bandFor('2026-12-11', NOW)).toBeNull();
    expect(bandFor(null, NOW)).toBeNull();
  });

  it('returns null rather than throwing on an unparseable date', () => {
    // The API supplies these; a bad row should not take the screen down.
    expect(bandFor('not-a-date', NOW)).toBeNull();
  });

  it('never returns a band the board does not render', () => {
    const samples = ['2026-01-01', '2026-09-11', '2026-09-30', '2027-06-01', null];
    for (const sample of samples) {
      const band = bandFor(sample, NOW);
      if (band !== null) expect(BANDS).toContain(band);
    }
  });
});
