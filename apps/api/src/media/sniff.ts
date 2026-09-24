/**
 * What a file actually is, from its first bytes.
 *
 * The browser's `content-type` is whatever the client says it is, and a file
 * the platform later serves back with the type it claimed is how an "image"
 * that is really an HTML page ends up running script on the platform's own
 * origin. So the claimed type is ignored for the decision: the bytes decide,
 * and the file is stored and served under the type the bytes prove.
 *
 * The list is short on purpose. These are the formats a phone camera and a
 * logo export actually produce; everything else is refused with a message
 * that says what to send instead.
 */

export type MediaFormat = {
  readonly mime: string;
  readonly ext: 'jpg' | 'png' | 'webp' | 'mp4' | 'webm' | 'mov';
  readonly kind: 'image' | 'video';
};

const JPEG: MediaFormat = { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
const PNG: MediaFormat = { mime: 'image/png', ext: 'png', kind: 'image' };
const WEBP: MediaFormat = { mime: 'image/webp', ext: 'webp', kind: 'image' };
const MP4: MediaFormat = { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
const MOV: MediaFormat = { mime: 'video/quicktime', ext: 'mov', kind: 'video' };
const WEBM: MediaFormat = { mime: 'video/webm', ext: 'webm', kind: 'video' };

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Needs the first 16 bytes. Returns null for anything not on the list. */
export function sniff(head: Uint8Array): MediaFormat | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return JPEG;
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return PNG;
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') return WEBP;
  if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) return WEBM;

  /*
   * MP4 and QuickTime share a container: a box whose type at byte 4 is
   * `ftyp`, with the brand after it. An iPhone video is `qt  ` — QuickTime —
   * and an Android one is `isom`, `mp42` or similar. Both play in a browser
   * served as their own type.
   */
  if (ascii(head, 4, 4) === 'ftyp') {
    const brand = ascii(head, 8, 4);
    return brand === 'qt  ' ? MOV : MP4;
  }

  return null;
}

/** What each purpose may be. A logo that is a video is a mistake, not a choice. */
export const PURPOSES = {
  logo: { kinds: ['image'], maxBytes: 5 * 1024 * 1024 },
  cover: { kinds: ['image'], maxBytes: 10 * 1024 * 1024 },
  avatar: { kinds: ['image'], maxBytes: 5 * 1024 * 1024 },
  /*
   * 50 MB is Supabase Storage's per-file limit on the free plan. Holding the
   * local store to the same number means nothing that works on this machine
   * starts failing the day uploads move there. About 60–90 seconds of phone
   * video, which is what a story is for.
   */
  story: { kinds: ['image', 'video'], maxBytes: 50 * 1024 * 1024 },
} as const;

export type MediaPurpose = keyof typeof PURPOSES;

export function isPurpose(value: string): value is MediaPurpose {
  return Object.hasOwn(PURPOSES, value);
}
