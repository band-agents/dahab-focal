import { describe, expect, it } from 'vitest';

import { outstanding, seatCounts } from '../src/manifest';
import type { CountableParticipant, ParticipantKind } from '../src/manifest';

/**
 * The manifest arithmetic a boat's headcount depends on.
 *
 * The subtle rule is that a paying head and an occupied seat are different
 * things: an infant and an accompanying instructor hold a place without being
 * billed, so the manifest and the invoice never match. Getting this wrong
 * oversells a boat or refunds someone who never paid.
 *
 * These moved here from the fixture module when the app went onto the API.
 * The rule did not change — it is the same one `PARTICIPANT_RULES` in
 * @dahab/api-contract states, and the pricing engine applies.
 */

function person(
  kind: ParticipantKind,
  overrides: Partial<CountableParticipant> = {},
): CountableParticipant {
  return { kind, waiverSigned: true, medicalFlag: false, ...overrides };
}

function departure(participants: readonly CountableParticipant[]) {
  return { participants: [...participants] };
}

describe('seats held versus seats billed', () => {
  it('bills adults, children, students and residents', () => {
    for (const kind of ['adult', 'child', 'student', 'resident'] as const) {
      const counts = seatCounts([person(kind)]);
      expect(counts.capacity, `${kind} should hold a seat`).toBe(1);
      expect(counts.chargeable, `${kind} should be billed`).toBe(1);
    }
  });

  it('seats infants and accompanying instructors without billing them', () => {
    for (const kind of ['infant', 'instructor'] as const) {
      const counts = seatCounts([person(kind)]);
      expect(counts.capacity, `${kind} should hold a seat`).toBe(1);
      expect(counts.chargeable, `${kind} should not be billed`).toBe(0);
    }
  });

  it('counts a family the way the boat does', () => {
    // Two adults, a child and an infant: four seats, three billed. This is
    // the party the pricing simulator uses, and the two must agree.
    const counts = seatCounts([
      person('adult'),
      person('adult'),
      person('child'),
      person('infant'),
    ]);
    expect(counts.capacity).toBe(4);
    expect(counts.chargeable).toBe(3);
  });

  it('is zero for an empty manifest, not an error', () => {
    expect(seatCounts([])).toEqual({ capacity: 0, chargeable: 0 });
  });
});

describe('what is still outstanding', () => {
  it('counts unsigned waivers', () => {
    const counts = outstanding(
      departure([
        person('adult', { waiverSigned: false }),
        person('adult', { waiverSigned: true }),
        person('child', { waiverSigned: false }),
      ]),
    );
    expect(counts.waivers).toBe(2);
  });

  it('counts medical flags separately from waivers', () => {
    // A medical note is read before the briefing and a waiver is signed
    // before boarding. Collapsing them into one number loses which of the
    // two a guide still has to do.
    const counts = outstanding(
      departure([
        person('adult', { medicalFlag: true, waiverSigned: true }),
        person('adult', { medicalFlag: false, waiverSigned: false }),
      ]),
    );
    expect(counts.medical).toBe(1);
    expect(counts.waivers).toBe(1);
  });

  it('reports nothing outstanding on a clean manifest', () => {
    const counts = outstanding(departure([person('adult'), person('resident')]));
    expect(counts).toEqual({ waivers: 0, medical: 0 });
  });
});
