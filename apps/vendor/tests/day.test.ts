import { describe, expect, it } from 'vitest';

import { DEPARTURES, PARTICIPANT_RULES, outstanding, seatCounts } from '../src/day';
import type { Participant, ParticipantKind } from '../src/day';

/**
 * The manifest arithmetic a boat's headcount depends on.
 *
 * The subtle rule is that a paying head and an occupied seat are different
 * things: an infant and an accompanying instructor hold a place without being
 * billed, so the manifest and the invoice never match. Getting this wrong
 * oversells a boat or refunds someone who never paid.
 */

function person(kind: ParticipantKind, overrides: Partial<Participant> = {}): Participant {
  return {
    id: `p-${kind}-${Math.random()}`,
    name: 'Test Diver',
    kind,
    certification: null,
    certificationShort: false,
    waiverSigned: true,
    medicalFlag: false,
    pickedUp: true,
    ...overrides,
  };
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
      expect(counts.capacity, `${kind} still takes a place on the boat`).toBe(1);
      expect(counts.chargeable, `${kind} is not billed`).toBe(0);
    }
  });

  it('never reports more billed than seated', () => {
    for (const departure of DEPARTURES) {
      const counts = seatCounts(departure.participants);
      expect(counts.chargeable).toBeLessThanOrEqual(counts.capacity);
    }
  });

  it('matches the rules table it mirrors from @dahab/api-contract', () => {
    // Every kind occupies capacity; only two are free. If a future kind breaks
    // that, this is where it surfaces rather than in a manifest at the dock.
    const kinds = Object.keys(PARTICIPANT_RULES) as ParticipantKind[];
    expect(kinds.every((kind) => PARTICIPANT_RULES[kind].occupiesCapacity)).toBe(true);
    expect(kinds.filter((kind) => !PARTICIPANT_RULES[kind].isChargeable).sort()).toEqual([
      'infant',
      'instructor',
    ]);
  });
});

describe('what still has to happen before a departure leaves', () => {
  it('counts unsigned waivers, short certifications and uncollected people', () => {
    const todo = outstanding({
      id: 'd-test',
      time: '09:30',
      service: 'Test',
      site: 'The Bells',
      guide: 'Yasmin',
      capacity: 8,
      mark: 'fin',
      participants: [
        person('adult', { waiverSigned: false }),
        person('adult', { certificationShort: true, pickedUp: false }),
        person('adult'),
      ],
    });

    expect(todo.waivers).toBe(1);
    expect(todo.certifications).toBe(1);
    expect(todo.pickups).toBe(1);
  });

  it('reports zero rather than undefined when a departure is ready', () => {
    // The screen renders a success pill on zero, so this must be a number.
    const todo = outstanding({
      id: 'd-ready',
      time: '11:15',
      service: 'Test',
      site: 'Eel Garden',
      guide: 'Omar',
      capacity: 12,
      mark: 'mask',
      participants: [person('adult')],
    });

    expect(todo).toEqual({ waivers: 0, certifications: 0, pickups: 0 });
  });
});
