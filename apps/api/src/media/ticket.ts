import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A ticket to upload one kind of file, straight from a phone to this API.
 *
 * Why it exists: the operator dashboard runs on Vercel, where a request body
 * is capped at 4.5 MB. A one-minute story video is ten times that, so the file
 * cannot pass through the dashboard on its way here. And the dashboard's
 * session lives in an httpOnly cookie precisely so no script on the page can
 * read it — so the browser cannot carry the session to this API either.
 *
 * So the dashboard asks for a ticket (server to server, with the session),
 * and the browser uploads with the ticket. A ticket is not a session: it is
 * good for ten minutes, for one operator, for one purpose (a logo ticket
 * cannot upload a story), and for nothing but `POST /media`. It names the
 * session it was issued under, and the upload is refused if that session has
 * been revoked since — a guide removed from the team at 10:00 cannot use the
 * ticket they fetched at 9:59.
 *
 * Signed with AUTH_SECRET under its own label, so no ticket can ever verify
 * as an access token, nor an access token as a ticket.
 */

export const UPLOAD_TICKET_TTL_SECONDS = 10 * 60;

export interface UploadTicket {
  readonly userId: string;
  readonly vendorId: string;
  readonly sessionId: string;
  readonly purpose: string;
  readonly exp: number;
}

function sign(body: string, label = 'upload-ticket.v1'): string {
  const secret = process.env['AUTH_SECRET'];
  if (secret === undefined || secret.length < 32) throw new Error('AUTH_SECRET must be set.');
  return createHmac('sha256', secret).update(`${label}.${body}`).digest('base64url');
}

/**
 * The receipt for a signed upload straight to Storage: which file, for whom,
 * of which declared type. `vendor.finishUpload` takes it back, checks the
 * bytes that arrived, and only then records the file. Labelled apart from
 * the upload ticket, so neither can stand in for the other.
 */
export interface FinishToken {
  readonly userId: string;
  readonly vendorId: string;
  readonly purpose: string;
  readonly key: string;
  readonly mimeType: string;
  readonly exp: number;
}

const FINISH_LABEL = 'upload-finish.v1';
/** Long enough for a one-minute video on a slow boat connection. */
export const FINISH_TTL_SECONDS = 60 * 60;

export function issueFinishToken(token: Omit<FinishToken, 'exp'>, now = new Date()): string {
  const full: FinishToken = { ...token, exp: Math.floor(now.getTime() / 1000) + FINISH_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  return `${body}.${sign(body, FINISH_LABEL)}`;
}

export function verifyFinishToken(token: string, now = new Date()): FinishToken | null {
  const [body, signature, extra] = token.split('.');
  if (body === undefined || signature === undefined || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, FINISH_LABEL), 'utf8');
  const provided = Buffer.from(signature, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>;
    for (const field of ['userId', 'vendorId', 'purpose', 'key', 'mimeType'] as const) {
      if (typeof value[field] !== 'string') return null;
    }
    if (typeof value['exp'] !== 'number' || value['exp'] * 1000 <= now.getTime()) return null;
    return value as unknown as FinishToken;
  } catch {
    return null;
  }
}

export function issueUploadTicket(ticket: Omit<UploadTicket, 'exp'>, now = new Date()): string {
  const full: UploadTicket = { ...ticket, exp: Math.floor(now.getTime() / 1000) + UPLOAD_TICKET_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyUploadTicket(token: string, now = new Date()): UploadTicket | null {
  const [body, signature, extra] = token.split('.');
  if (body === undefined || signature === undefined || extra !== undefined) return null;
  const expected = Buffer.from(sign(body), 'utf8');
  const provided = Buffer.from(signature, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const value = parsed as Record<string, unknown>;
  if (
    typeof value['userId'] !== 'string' ||
    typeof value['vendorId'] !== 'string' ||
    typeof value['sessionId'] !== 'string' ||
    typeof value['purpose'] !== 'string' ||
    typeof value['exp'] !== 'number'
  ) {
    return null;
  }
  if (value['exp'] * 1000 <= now.getTime()) return null;
  return value as unknown as UploadTicket;
}
