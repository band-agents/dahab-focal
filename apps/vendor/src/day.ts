/**
 * Fanous Divers' day.
 *
 * The phone screen is "run the day", so this is what a guide standing at
 * Masbat actually needs: who is on which departure, whether their certification
 * covers it, whether the waiver is signed, and who has not been picked up yet.
 *
 * Shaped like `bookings` + `booking_participants` + `resources` so swapping in
 * the API is a change of import. Money is integer minor units.
 */

export type ParticipantKind = 'adult' | 'child' | 'infant' | 'student' | 'resident' | 'instructor';

/** Mirrors PARTICIPANT_RULES in @dahab/api-contract. */
export const PARTICIPANT_RULES: Record<
  ParticipantKind,
  { isChargeable: boolean; occupiesCapacity: boolean }
> = {
  adult: { isChargeable: true, occupiesCapacity: true },
  child: { isChargeable: true, occupiesCapacity: true },
  student: { isChargeable: true, occupiesCapacity: true },
  resident: { isChargeable: true, occupiesCapacity: true },
  infant: { isChargeable: false, occupiesCapacity: true },
  instructor: { isChargeable: false, occupiesCapacity: true },
};

export interface Participant {
  readonly id: string;
  readonly name: string;
  readonly kind: ParticipantKind;
  /** What they presented. Null where the service needs none. */
  readonly certification: string | null;
  /** True when the service's minimum is not met by what they presented. */
  readonly certificationShort: boolean;
  readonly waiverSigned: boolean;
  /** Shown to the guide who needs it and to nobody else. */
  readonly medicalFlag: boolean;
  readonly pickedUp: boolean;
}

export interface Departure {
  readonly id: string;
  readonly time: string;
  readonly service: string;
  readonly site: string;
  readonly guide: string;
  readonly capacity: number;
  readonly mark: 'fin' | 'depth' | 'mask' | 'camel' | 'sail' | 'kite';
  readonly participants: readonly Participant[];
  /** Set when weather threatens it. */
  readonly windForecastKt?: number;
  readonly windLimitKt?: number;
}

export const DEPARTURES: readonly Departure[] = [
  {
    id: 'd-1',
    time: '09:30',
    service: 'Two shore dives · The Bells',
    site: 'The Bells → Blue Hole',
    guide: 'Yasmin',
    capacity: 8,
    mark: 'fin',
    participants: [
      {
        id: 'p-1',
        name: 'Lena Fischer',
        kind: 'adult',
        certification: 'Advanced Open Water · 41 dives',
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: true,
      },
      {
        id: 'p-2',
        name: 'Marco Rossi',
        kind: 'adult',
        certification: 'Open Water · 12 dives',
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: true,
        pickedUp: true,
      },
      {
        id: 'p-3',
        name: 'Yuki Tanaka',
        kind: 'adult',
        certification: 'Open Water · 6 dives',
        // The Bells wants Advanced or 20 logged dives; this one is short and
        // the guide has to know before the briefing, not at the water.
        certificationShort: true,
        waiverSigned: false,
        medicalFlag: false,
        pickedUp: false,
      },
      {
        id: 'p-4',
        name: 'Hana Okonkwo',
        kind: 'instructor',
        certification: 'Instructor · accompanying',
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: true,
      },
    ],
  },
  {
    id: 'd-2',
    time: '11:15',
    service: 'Snorkel & tea · Eel Garden',
    site: 'Eel Garden',
    guide: 'Omar',
    capacity: 12,
    mark: 'mask',
    participants: [
      {
        id: 'p-5',
        name: 'Amira Saleh',
        kind: 'resident',
        certification: null,
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: true,
      },
      {
        id: 'p-6',
        name: 'Sofia Marín',
        kind: 'adult',
        certification: null,
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: false,
      },
      {
        id: 'p-7',
        name: 'Tomás Marín',
        kind: 'infant',
        certification: null,
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: false,
      },
    ],
  },
  {
    id: 'd-3',
    time: '14:00',
    service: 'Boat trip · The Islands',
    site: 'The Islands & Umm Sid',
    guide: 'Mahmoud',
    capacity: 16,
    mark: 'sail',
    windForecastKt: 22,
    windLimitKt: 18,
    participants: [
      {
        id: 'p-8',
        name: 'Erik Johansson',
        kind: 'adult',
        certification: null,
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: false,
      },
      {
        id: 'p-9',
        name: 'Nadia Haddad',
        kind: 'adult',
        certification: null,
        certificationShort: false,
        waiverSigned: true,
        medicalFlag: false,
        pickedUp: false,
      },
    ],
  },
];

export interface Conditions {
  readonly windKt: number;
  readonly waterC: number;
  readonly visibilityM: number;
}

export const CONDITIONS: Conditions = { windKt: 6, waterC: 22, visibilityM: 25 };

/** Seats held versus seats billed — the number a boat's headcount depends on. */
export function seatCounts(participants: readonly Participant[]): {
  capacity: number;
  chargeable: number;
} {
  let capacity = 0;
  let chargeable = 0;
  for (const person of participants) {
    const rule = PARTICIPANT_RULES[person.kind];
    if (rule.occupiesCapacity) capacity += 1;
    if (rule.isChargeable) chargeable += 1;
  }
  return { capacity, chargeable };
}

/** What still needs doing before a departure can leave. */
export function outstanding(departure: Departure): {
  waivers: number;
  certifications: number;
  pickups: number;
} {
  return {
    waivers: departure.participants.filter((p) => !p.waiverSigned).length,
    certifications: departure.participants.filter((p) => p.certificationShort).length,
    pickups: departure.participants.filter((p) => !p.pickedUp).length,
  };
}

/** Everything saved to this phone, because the Blue Hole road drops out. */
export const OFFLINE_READY = {
  vouchers: 3,
  meetingPoints: 2,
  manifests: DEPARTURES.length,
};
