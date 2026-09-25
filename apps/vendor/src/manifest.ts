/**
 * The manifest arithmetic.
 *
 * Its own module, and typed structurally rather than against the router,
 * because it is pure and the two things that use it should not have to load
 * the API's type graph to do so. A value import from `./api` pulls
 * `@dahab/api/router` — the whole server — into anything that touches it,
 * which is exactly what broke the test that covers this.
 *
 * The rule itself mirrors `PARTICIPANT_RULES` in @dahab/api-contract, which
 * is where the pricing engine reads it. A paying head and an occupied seat
 * are different things: an infant and an accompanying instructor hold a place
 * without being billed, so the manifest and the invoice never agree — and the
 * boat's number is the first one.
 */

export type ParticipantKind =
  | 'adult'
  | 'child'
  | 'infant'
  | 'student'
  | 'resident'
  | 'instructor';

/** Only what the arithmetic reads, so any shape carrying these will do. */
export interface CountableParticipant {
  readonly kind: ParticipantKind;
  readonly waiverSigned: boolean;
  readonly medicalFlag: boolean;
}

const CHARGEABLE: Readonly<Record<ParticipantKind, boolean>> = {
  adult: true,
  child: true,
  student: true,
  resident: true,
  infant: false,
  instructor: false,
};

export function seatCounts(participants: readonly CountableParticipant[]): {
  capacity: number;
  chargeable: number;
} {
  return {
    capacity: participants.length,
    chargeable: participants.filter((person) => CHARGEABLE[person.kind]).length,
  };
}

/**
 * What is still outstanding, counted once for the header.
 *
 * Waivers and medical notes stay separate: a waiver is signed before boarding
 * and a medical note is read before the briefing. One number would lose which
 * of the two a guide still has to do.
 */
export function outstanding(departure: {
  readonly participants: readonly CountableParticipant[];
}): { waivers: number; medical: number } {
  return {
    waivers: departure.participants.filter((person) => !person.waiverSigned).length,
    medical: departure.participants.filter((person) => person.medicalFlag).length,
  };
}
