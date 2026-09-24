import { describe, expect, it } from 'vitest';

import { KEY_PATTERN } from '../src/media/store';
import { PURPOSES, isPurpose, sniff } from '../src/media/sniff';

/**
 * The upload's security boundary.
 *
 * The file's own bytes decide what it is, and the served type follows from
 * that — never from what the browser claimed. The dangerous case is a file
 * that says it is an image and is really a page with a script in it, served
 * back from the platform's own origin, so the most important assertions here
 * are the refusals.
 */

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]).slice(0, 16);
const text = (value: string) => new Uint8Array([...value].map((c) => c.charCodeAt(0)));
const withHead = (head: Uint8Array) => {
  const out = new Uint8Array(16);
  out.set(head.slice(0, 16));
  return out;
};

describe('what a file is, from its first bytes', () => {
  it('knows a JPEG from a phone camera', () => {
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe1))?.mime).toBe('image/jpeg');
  });

  it('knows a PNG logo export', () => {
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe('image/png');
  });

  it('knows a WEBP', () => {
    const head = withHead(text('RIFF\0\0\0\0WEBPVP8 '));
    expect(sniff(head)?.mime).toBe('image/webp');
  });

  it('knows an Android MP4 and an iPhone MOV apart', () => {
    expect(sniff(withHead(text('\0\0\0 ftypisom')))?.mime).toBe('video/mp4');
    expect(sniff(withHead(text('\0\0\0 ftypqt  ')))?.mime).toBe('video/quicktime');
  });

  it('knows a WEBM', () => {
    expect(sniff(bytes(0x1a, 0x45, 0xdf, 0xa3))?.kind).toBe('video');
  });
});

describe('what it refuses', () => {
  it('refuses an HTML page whatever it was called', () => {
    expect(sniff(withHead(text('<!doctype html><s')))).toBeNull();
    expect(sniff(withHead(text('<svg onload=alert')))).toBeNull();
  });

  it('refuses a GIF, a PDF and an executable', () => {
    expect(sniff(withHead(text('GIF89a')))).toBeNull();
    expect(sniff(withHead(text('%PDF-1.7')))).toBeNull();
    expect(sniff(bytes(0x4d, 0x5a))).toBeNull();
  });

  it('refuses an empty head', () => {
    expect(sniff(new Uint8Array(16))).toBeNull();
  });
});

describe('what each upload may be', () => {
  it('lets only a story be a video', () => {
    expect(PURPOSES.story.kinds).toContain('video');
    for (const purpose of ['logo', 'cover', 'avatar'] as const) {
      expect(PURPOSES[purpose].kinds).not.toContain('video');
    }
  });

  /**
   * Supabase Storage's free plan refuses a single file over 50 MB. The local
   * store holding the same line is what stops a story that works on this
   * machine failing the day uploads move there.
   */
  it('never lets a file be bigger than Supabase will take', () => {
    for (const rules of Object.values(PURPOSES)) {
      expect(rules.maxBytes).toBeLessThanOrEqual(50 * 1024 * 1024);
    }
  });

  it('knows its own purposes and nothing else', () => {
    expect(isPurpose('story')).toBe(true);
    expect(isPurpose('toString')).toBe(false);
    expect(isPurpose('__proto__')).toBe(false);
  });
});

describe('a stored file cannot be asked for by a path it was not given', () => {
  const vendor = '01a0908f-0f7e-0cfd-058e-2384d1166c68';
  const file = '01a0aaa9-c331-03e9-23cc-ff216376ff5e';

  it('accepts the shape the server writes', () => {
    expect(KEY_PATTERN.test(`${vendor}/${file}.mp4`)).toBe(true);
  });

  it('refuses a climb out of the store', () => {
    expect(KEY_PATTERN.test(`../../.env`)).toBe(false);
    expect(KEY_PATTERN.test(`${vendor}/../${file}.jpg`)).toBe(false);
    expect(KEY_PATTERN.test(`${vendor}/${file}.jpg/../../x`)).toBe(false);
  });

  it('refuses an extension the store never writes', () => {
    expect(KEY_PATTERN.test(`${vendor}/${file}.html`)).toBe(false);
    expect(KEY_PATTERN.test(`${vendor}/${file}.svg`)).toBe(false);
  });
});
