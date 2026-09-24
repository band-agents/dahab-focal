import { randomUUID } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';

import { and, eq, isNull, sum } from 'drizzle-orm';

import { schema } from '@dahab/db';

import { createContext } from '../context.ts';
import { KEY_PATTERN, ensureTempDir, mediaStore, tempWriter } from './store.ts';
import { PURPOSES, isPurpose, sniff } from './sniff.ts';

/**
 * Uploading a file, and getting it back.
 *
 * Two plain HTTP routes in front of tRPC rather than a tRPC procedure, because
 * tRPC speaks JSON and a video is not JSON. The body is the raw file — no
 * multipart envelope, no parsing library — so the browser sends
 * `fetch('/media?purpose=story', { method: 'POST', body: file })` and nothing
 * sits between the bytes and the disk.
 *
 * Uploading is deliberately a smaller act than it looks. It stores a file and
 * records who stored it; it does NOT make the file an operator's logo or post
 * it as a story. That happens in a tRPC procedure that takes the returned id,
 * checks it belongs to the same operator, and carries the real permission — so
 * the rule for who may change a logo lives in one place, next to the logo.
 */

/** A whole operator's library. Generous for a dive centre; a wall for abuse. */
const VENDOR_QUOTA_BYTES = 500 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

/**
 * Refusals carry a machine code and a sentence. The code is what the
 * dashboard translates; the sentence is for whoever reads the network tab.
 */
function refuse(res: ServerResponse, status: number, code: string, message: string): void {
  json(res, status, { error: { code, message } });
}

export async function handleUpload(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const ctx = createContext({ req, res });
  const url = new URL(req.url ?? '/', 'http://localhost');
  const purpose = url.searchParams.get('purpose') ?? '';

  const session = ctx.session;
  const vendorId = session?.vendorId ?? null;
  const isVendorMember =
    session?.roles.some((role) => role === 'vendorOwner' || role === 'vendorStaff') === true;

  if (session === null || session.userId === null) {
    refuse(res, 401, 'signedOut', 'Sign in again to upload.');
    return;
  }
  if (!isVendorMember || vendorId === null) {
    refuse(res, 403, 'notAMember', 'Only people who work at an operator can upload here.');
    return;
  }
  if (!isPurpose(purpose)) {
    refuse(res, 400, 'badPurpose', 'Say what the file is for: logo, cover, avatar or story.');
    return;
  }
  if (ctx.db === null) {
    refuse(res, 503, 'noDatabase', 'The database is not reachable. Try again in a moment.');
    return;
  }

  const rules = PURPOSES[purpose];

  // A declared length over the limit is refused before a byte is read — no
  // point streaming 300 MB of video to the disk to say no afterwards.
  const declared = Number(req.headers['content-length'] ?? 'NaN');
  if (Number.isFinite(declared) && declared > rules.maxBytes) {
    refuse(res, 413, 'tooBig', `That file is larger than ${rules.maxBytes} bytes.`);
    req.resume();
    return;
  }

  const [{ used } = { used: null }] = await ctx.db
    .select({ used: sum(schema.mediaUploads.bytes) })
    .from(schema.mediaUploads)
    .where(and(eq(schema.mediaUploads.vendorId, vendorId), isNull(schema.mediaUploads.deletedAt)));
  if (Number(used ?? 0) >= VENDOR_QUOTA_BYTES) {
    refuse(res, 507, 'quotaFull', 'This operator has used all of its storage. Delete old stories to make room.');
    req.resume();
    return;
  }

  // ── Stream to a temp file, counting as we go ──────────────────────────
  const tempDir = await ensureTempDir();
  const tempPath = join(tempDir, randomUUID());
  let received = 0;
  let overLimit = false;

  try {
    await new Promise<void>((done, fail) => {
      const out = tempWriter(tempPath);
      req.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > rules.maxBytes) {
          // A chunked upload has no declared length, so the limit is also
          // enforced while reading. Stop writing and let the request drain.
          overLimit = true;
          req.unpipe(out);
          out.destroy();
          req.resume();
        }
      });
      req.pipe(out);
      out.on('finish', done);
      out.on('close', () => (overLimit ? done() : undefined));
      out.on('error', (error) => (overLimit ? done() : fail(error)));
      req.on('error', fail);
    });
  } catch (error) {
    await rm(tempPath, { force: true });
    ctx.logger.warn('upload interrupted', { reason: String(error) });
    refuse(res, 400, 'interrupted', 'The upload stopped before it finished. Try again.');
    return;
  }

  if (overLimit) {
    await rm(tempPath, { force: true });
    refuse(res, 413, 'tooBig', `That file is larger than ${rules.maxBytes} bytes.`);
    return;
  }
  if (received === 0) {
    await rm(tempPath, { force: true });
    refuse(res, 400, 'empty', 'The file was empty.');
    return;
  }

  // ── Decide what it is from its bytes, not its label ───────────────────
  const handle = await open(tempPath, 'r');
  const head = new Uint8Array(16);
  await handle.read(head, 0, 16, 0);
  await handle.close();

  const format = sniff(head);
  if (format === null) {
    await rm(tempPath, { force: true });
    refuse(res, 415, 'unknownType', 'Send a JPG, PNG or WEBP photo, or an MP4, MOV or WEBM video.');
    return;
  }
  if (!(rules.kinds as readonly string[]).includes(format.kind)) {
    await rm(tempPath, { force: true });
    refuse(res, 415, 'wrongKind', `A ${purpose} has to be a photo, not a video.`);
    return;
  }

  const store = mediaStore();
  const key = `${vendorId}/${randomUUID()}.${format.ext}`;
  await store.commit(tempPath, key, format.mime);
  const publicUrl = store.urlFor(key);

  const [row] = await ctx.db
    .insert(schema.mediaUploads)
    .values({
      vendorId,
      uploaderUserId: session.userId,
      kind: format.kind,
      mimeType: format.mime,
      bytes: received,
      storageKey: key,
      url: publicUrl,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    })
    .returning({ id: schema.mediaUploads.id });

  ctx.logger.info('media uploaded', { vendorId, purpose, kind: format.kind, bytes: received });
  json(res, 201, {
    id: row?.id,
    url: publicUrl,
    kind: format.kind,
    mimeType: format.mime,
    bytes: received,
  });
}

/**
 * Serves a stored file. Local store only — in production the files come from
 * the storage CDN and never touch this process.
 *
 * Supports a single byte range. Without it Safari will not play a video at
 * all, and no browser can seek within one: a story you cannot scrub is a
 * story you watch from the start every time.
 */
export async function handleServe(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const key = decodeURIComponent(url.pathname.replace(/^\/media\//, ''));

  if (!KEY_PATTERN.test(key)) {
    res.writeHead(404);
    res.end();
    return;
  }

  const store = mediaStore();
  const size = await store.sizeOf(key);
  if (size === null) {
    res.writeHead(404);
    res.end();
    return;
  }

  const ext = key.slice(key.lastIndexOf('.') + 1);
  const headers = {
    'content-type': MIME_BY_EXT[ext] ?? 'application/octet-stream',
    // The browser must believe the type above and nothing else — this is the
    // other half of sniffing on upload.
    'x-content-type-options': 'nosniff',
    'content-disposition': 'inline',
    'accept-ranges': 'bytes',
    // Keys are UUIDs and a stored file never changes, so a browser can keep
    // it forever. A new logo is a new key.
    'cache-control': 'public, max-age=31536000, immutable',
    // Pictures are loaded by the dashboard and, later, the traveller app —
    // both on other origins.
    'cross-origin-resource-policy': 'cross-origin',
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
  if (range === null) {
    const whole = await store.open(key);
    if (whole === null) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { ...headers, 'content-length': size });
    whole.stream.pipe(res);
    return;
  }

  const [, rawStart = '', rawEnd = ''] = range;
  // `bytes=-500` is the last 500 bytes; `bytes=100-` is from byte 100 on.
  const start = rawStart === '' ? Math.max(0, size - Number(rawEnd)) : Number(rawStart);
  const end = rawStart !== '' && rawEnd !== '' ? Math.min(Number(rawEnd), size - 1) : size - 1;

  if (Number.isNaN(start) || start > end || start >= size) {
    res.writeHead(416, { 'content-range': `bytes */${size}` });
    res.end();
    return;
  }

  const part = await store.open(key, { start, end });
  if (part === null) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(206, {
    ...headers,
    'content-range': `bytes ${start}-${end}/${size}`,
    'content-length': end - start + 1,
  });
  part.stream.pipe(res);
}
