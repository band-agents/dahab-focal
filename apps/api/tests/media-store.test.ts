import { mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SupabaseStore, mediaStoreProblem } from '../src/media/store';

const BASE = 'https://example.supabase.co';
const KEY = '01a0d5da-d46a-0702-3e9e-8065f8a69a5f/0d37ed45-283f-490b-ab2e-8bcf019beb26.png';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
}

/** A fetch that records every call and answers from a script. */
function fakeFetch(answer: (call: Call) => Response) {
  const calls: Call[] = [];
  const http = (async (input: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(call);
    if (init?.body instanceof ReadableStream) await new Response(init.body).arrayBuffer();
    return answer(call);
  }) as typeof fetch;
  return { http, calls };
}

async function tempFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'store-'));
  const path = join(dir, 'upload');
  await writeFile(path, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return path;
}

describe('SupabaseStore', () => {
  it('makes the bucket public the first time, uploads under the key, and removes the temp file', async () => {
    const { http, calls } = fakeFetch((call) =>
      call.url.endsWith('/bucket/operator-media') ? new Response('', { status: 404 }) : new Response('{}', { status: 200 }),
    );
    const store = new SupabaseStore(BASE, 'service-key', 'operator-media', http);
    const path = await tempFile();

    await store.commit(path, KEY, 'image/png');

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      `GET ${BASE}/storage/v1/bucket/operator-media`,
      `POST ${BASE}/storage/v1/bucket`,
      `POST ${BASE}/storage/v1/object/operator-media/${KEY}`,
    ]);
    const upload = calls[2]!;
    expect(upload.headers['authorization']).toBe('Bearer service-key');
    expect(upload.headers['content-type']).toBe('image/png');
    expect(upload.headers['content-length']).toBe('4');
    expect(upload.headers['x-upsert']).toBe('false');
    expect(existsSync(path)).toBe(false);
  });

  it('asks about the bucket once, not on every upload', async () => {
    const { http, calls } = fakeFetch(() => new Response('{}', { status: 200 }));
    const store = new SupabaseStore(BASE, 'k', 'operator-media', http);
    await store.commit(await tempFile(), KEY, 'image/png');
    await store.commit(await tempFile(), KEY, 'image/png');
    expect(calls.filter((call) => call.url.includes('/bucket/')).length).toBe(1);
  });

  it('throws when Supabase refuses, and still removes the temp file', async () => {
    const { http } = fakeFetch((call) =>
      call.url.includes('/object/') ? new Response('too big', { status: 413 }) : new Response('{}', { status: 200 }),
    );
    const store = new SupabaseStore(BASE, 'k', 'operator-media', http);
    const path = await tempFile();
    await expect(store.commit(path, KEY, 'image/png')).rejects.toThrow(/413/);
    expect(existsSync(path)).toBe(false);
  });

  it('hands out the public URL, and refuses a key it did not make', () => {
    const store = new SupabaseStore(BASE, 'k', 'operator-media');
    expect(store.urlFor(KEY)).toBe(`${BASE}/storage/v1/object/public/operator-media/${KEY}`);
    expect(() => store.urlFor('../../.env')).toThrow();
  });
});

describe('mediaStoreProblem', () => {
  it('accepts the local store and a complete Supabase one', () => {
    expect(mediaStoreProblem({})).toBeNull();
    expect(mediaStoreProblem({ MEDIA_STORE: 'supabase', SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: 'k' })).toBeNull();
  });

  it('names what is missing', () => {
    expect(mediaStoreProblem({ MEDIA_STORE: 'supabase' })).toMatch(/SUPABASE_URL/);
    expect(mediaStoreProblem({ MEDIA_STORE: 'supabase', SUPABASE_URL: BASE })).toMatch(/SERVICE_ROLE_KEY/);
    expect(mediaStoreProblem({ MEDIA_STORE: 's3' })).toMatch(/not a store/);
  });
});

describe('SupabaseStore signed uploads', () => {
  it('signs an upload and returns an absolute link under /storage/v1', async () => {
    const { http, calls } = fakeFetch((call) =>
      call.url.includes('/upload/sign/')
        ? Response.json({ url: `/object/upload/sign/operator-media/${KEY}?token=abc` })
        : new Response('{}', { status: 200 }),
    );
    const store = new SupabaseStore(BASE, 'k', 'operator-media', http);
    const link = await store.signUpload(KEY);
    expect(link).toBe(`${BASE}/storage/v1/object/upload/sign/operator-media/${KEY}?token=abc`);
    expect(calls.at(-1)?.method).toBe('POST');
  });

  it('reads only the first bytes of a stored file', async () => {
    const { http, calls } = fakeFetch(() => new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])));
    const store = new SupabaseStore(BASE, 'k', 'operator-media', http);
    const head = await store.readStart(KEY, 4);
    expect([...(head ?? [])]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(calls[0]?.headers['range']).toBe('bytes=0-3');
  });
});
