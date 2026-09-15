import type { AppRouter } from '@dahab/api/router';

import { API_URL, readStored } from './auth';

/**
 * The operator app's reads.
 *
 * Plain `fetch` against the tRPC HTTP endpoints, for the same reason sign-in
 * is: this app carries no tRPC client, and adding one to make six GETs would
 * be a dependency for six GETs. What is not hand-written is the **shapes** —
 * every type below is inferred from the router itself, so a procedure that
 * changes breaks the build here rather than rendering `undefined` at the dock.
 *
 * Nothing here passes a vendor id. The API reads it from the session and
 * refuses a session that does not act for one; a vendor id this app could
 * send is a vendor id an operator could change.
 */

type VendorRouter = AppRouter['vendor'];
type Output<K extends keyof VendorRouter> = VendorRouter[K] extends {
  _def: { $types: { output: infer O } };
}
  ? O
  : never;

export type Departure = Output<'today'>[number];
export type Participant = Departure['participants'][number];
export type VendorBooking = Output<'bookings'>[number];
export type VendorService = Output<'services'>[number];
export type Earnings = Output<'earnings'>;
export type StaffMember = Output<'staff'>[number];
export type Resource = Output<'resources'>[number];

/**
 * Why a screen has no data, in terms an operator can act on.
 *
 * The same distinction the console draws, and for the same reason: a manifest
 * that renders empty because the request failed looks exactly like a boat
 * with nobody on it. On this surface it matters more — signal drops on the
 * Blue Hole road most mornings, so "we could not ask" is the common case,
 * not the exceptional one.
 */
export type Problem =
  | { kind: 'offline' }
  | { kind: 'signedOut' }
  | { kind: 'forbidden' }
  | { kind: 'failed'; detail: string };

export type Result<T> = { ok: true; data: T } | { ok: false; problem: Problem };

async function read<T>(path: string, input?: unknown): Promise<Result<T>> {
  const stored = readStored();
  if (stored === null) return { ok: false, problem: { kind: 'signedOut' } };

  const query = input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify(input))}`;

  let payload: { result?: { data?: T }; error?: { data?: { code?: string }; message?: string } };
  try {
    const response = await fetch(`${API_URL}/${path}${query}`, {
      headers: { authorization: `Bearer ${stored.accessToken}` },
    });
    payload = await response.json();
  } catch {
    return { ok: false, problem: { kind: 'offline' } };
  }

  if (payload.error !== undefined) {
    const code = payload.error.data?.code;
    if (code === 'UNAUTHORIZED') return { ok: false, problem: { kind: 'signedOut' } };
    if (code === 'FORBIDDEN') return { ok: false, problem: { kind: 'forbidden' } };
    return { ok: false, problem: { kind: 'failed', detail: payload.error.message ?? '' } };
  }

  if (payload.result?.data === undefined) {
    return { ok: false, problem: { kind: 'failed', detail: 'The API returned nothing.' } };
  }
  return { ok: true, data: payload.result.data };
}

export const api = {
  today: (locale: string, dayOffset = 0) =>
    read<Output<'today'>>('vendor.today', { locale, dayOffset }),
  bookings: (locale: string) => read<Output<'bookings'>>('vendor.bookings', { locale }),
  services: (locale: string) => read<Output<'services'>>('vendor.services', { locale }),
  earnings: () => read<Output<'earnings'>>('vendor.earnings', {}),
  staff: () => read<Output<'staff'>>('vendor.staff'),
  resources: () => read<Output<'resources'>>('vendor.resources'),
};

/**
 * Seats held versus heads billed.
 *
 * Mirrors PARTICIPANT_RULES in @dahab/api-contract: an infant and an
 * accompanying instructor are not charged but do take a place, which is why a
 * manifest and an invoice never agree — and why the boat's number is the
 * first one, not the second.
 */
const CHARGEABLE: Readonly<Record<Participant['kind'], boolean>> = {
  adult: true,
  child: true,
  student: true,
  resident: true,
  infant: false,
  instructor: false,
};

export function seatCounts(participants: readonly Participant[]): {
  capacity: number;
  chargeable: number;
} {
  return {
    capacity: participants.length,
    chargeable: participants.filter((person) => CHARGEABLE[person.kind]).length,
  };
}

/** What is still outstanding on a manifest, counted once for the header. */
export function outstanding(departure: Departure): {
  waivers: number;
  medical: number;
} {
  return {
    waivers: departure.participants.filter((person) => !person.waiverSigned).length,
    medical: departure.participants.filter((person) => person.medicalFlag).length,
  };
}
