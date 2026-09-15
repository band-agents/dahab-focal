import type { AppRouter } from '@dahab/api/router';

import { API_URL, readStored } from './auth';
import type { Result } from './api';

/**
 * Cancelling a departure, from the operator's own phone.
 *
 * `booking.manageVendor` is in vendorStaff as well as vendorOwner, and that is
 * deliberate: the person at the dock in the wind is the one who knows the sea
 * is unworkable, and making them phone the owner first is how a boat goes out
 * that should not have.
 *
 * Both calls are scoped to the session's vendor by the API, so neither takes
 * a vendor id. The preview reads the same rows the commit writes, so what an
 * operator agrees to is what happens.
 */

type VendorRouter = AppRouter['vendor'];
type Output<K extends keyof VendorRouter> = VendorRouter[K] extends {
  _def: { $types: { output: infer O } };
}
  ? O
  : never;

export type CancellationPreview = Output<'cancellationPreview'>;
export type CancellationResult = Output<'cancelDeparture'>;

async function post<T>(path: string, body: unknown): Promise<Result<T>> {
  const stored = readStored();
  if (stored === null) return { ok: false, problem: { kind: 'signedOut' } };

  try {
    const response = await fetch(`${API_URL}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${stored.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      result?: { data?: T };
      error?: { data?: { code?: string }; message?: string };
    };
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
  } catch {
    return { ok: false, problem: { kind: 'offline' } };
  }
}

async function get<T>(path: string, input: unknown): Promise<Result<T>> {
  const stored = readStored();
  if (stored === null) return { ok: false, problem: { kind: 'signedOut' } };

  try {
    const query = `?input=${encodeURIComponent(JSON.stringify(input))}`;
    const response = await fetch(`${API_URL}/${path}${query}`, {
      headers: { authorization: `Bearer ${stored.accessToken}` },
    });
    const payload = (await response.json()) as {
      result?: { data?: T };
      error?: { data?: { code?: string }; message?: string };
    };
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
  } catch {
    return { ok: false, problem: { kind: 'offline' } };
  }
}

export function previewCancellation(
  slotId: string,
  locale: string,
): Promise<Result<CancellationPreview>> {
  return get<CancellationPreview>('vendor.cancellationPreview', { slotId, locale });
}

export function cancelDeparture(
  slotId: string,
  reason: string,
): Promise<Result<CancellationResult>> {
  return post<CancellationResult>('vendor.cancelDeparture', { slotId, reason });
}
