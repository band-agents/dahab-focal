'use client';

import { useId, useRef, useState } from 'react';

import { uploadTarget } from '@/app/[locale]/(app)/actions';

import { Icon } from './Icon';

/**
 * Pick a photo or a video, see it, send it.
 *
 * This is the part of the dashboard most likely to go wrong for somebody who
 * is not technical, so it is built to make the usual failures impossible
 * rather than to explain them well afterwards:
 *
 *   - **Photos are shrunk on the phone before they are sent.** A 12-megapixel
 *     camera photo is 5–8 MB, larger than a logo may be, and uploading it on
 *     the signal at the Blue Hole takes minutes. Redrawn at 2048px it is a few
 *     hundred kilobytes and nobody ever sees "file too big" for a photo.
 *   - **A video that is too long is caught before a byte is sent**, with the
 *     answer ("keep it under a minute") rather than the size in megabytes.
 *   - **Progress is shown**, as a bar and a number, so a slow upload on a boat
 *     looks slow rather than broken.
 *
 * When the file is up, its id is written into a hidden input named `name`,
 * and — for a logo, a cover or a profile picture, where there is nothing more
 * to decide — the surrounding form is submitted straight away. A story waits
 * for its caption and the Post button instead.
 */

export interface UploaderLabels {
  readonly choose: string;
  readonly change: string;
  readonly uploading: string;
  readonly done: string;
  readonly tooLongVideo: string;
  readonly failed: string;
  readonly wrongType: string;
}

type Purpose = 'logo' | 'cover' | 'avatar' | 'story';

/** Largest edge a photo is sent at. Sharp on a phone, sharp on a laptop. */
const MAX_EDGE = 2048;
/** Supabase's per-file limit on the free plan — the same line the API holds. */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Redraws a photo at most MAX_EDGE on its longest side. Also turns a HEIC or
 * any other format the browser can decode into a JPEG the server accepts —
 * an iPhone's default photo format is not one of them.
 */
async function shrink(file: File, purpose: Purpose): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve) => {
    // A logo stays a PNG: it is often a mark on a transparent background, and
    // a transparent canvas saved as JPEG turns black — every logo would arrive
    // on a black square. Photos are JPEG, a fraction of the size.
    if (purpose === 'logo') canvas.toBlob((blob) => resolve(blob ?? file), 'image/png');
    else canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.86);
  });
}

/**
 * Sends the file straight to the API, with a short-lived ticket this app
 * fetches for it on the server. Not through this app: its host caps a
 * request at 4.5 MB, and a story video is far larger.
 */
async function send(
  body: Blob,
  purpose: Purpose,
  onProgress: (fraction: number) => void,
): Promise<{ id: string; url: string; kind: 'image' | 'video' }> {
  const target = await uploadTarget(purpose);
  if (target === null) throw new Error('signedOut');
  return new Promise((resolve, reject) => {
    // XHR rather than fetch: fetch still cannot report upload progress, and
    // progress is the whole point on a slow connection.
    const request = new XMLHttpRequest();
    request.open('POST', target);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      try {
        const payload = JSON.parse(request.responseText) as {
          id?: string;
          url?: string;
          kind?: 'image' | 'video';
          error?: { code?: string };
        };
        if (request.status >= 200 && request.status < 300 && payload.id !== undefined && payload.url !== undefined) {
          resolve({ id: payload.id, url: payload.url, kind: payload.kind ?? 'image' });
        } else {
          reject(new Error(payload.error?.code ?? `http ${request.status}`));
        }
      } catch {
        reject(new Error(`http ${request.status}`));
      }
    };
    request.onerror = () => reject(new Error('network'));
    request.send(body);
  });
}

export function Uploader({
  purpose,
  name,
  labels,
  currentUrl = null,
  autoSubmit = false,
  shape = 'wide',
}: {
  readonly purpose: Purpose;
  /** The hidden input the uploaded file's id is written to. */
  readonly name: string;
  readonly labels: UploaderLabels;
  readonly currentUrl?: string | null;
  /** Submit the surrounding form as soon as the upload finishes. */
  readonly autoSubmit?: boolean;
  /** How the preview is drawn: a logo is square, a cover and a story are wide. */
  readonly shape?: 'square' | 'round' | 'wide' | 'tall';
}) {
  const inputId = useId();
  const hidden = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; kind: 'image' | 'video' } | null>(
    currentUrl === null ? null : { url: currentUrl, kind: 'image' },
  );
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const accept = purpose === 'story' ? 'image/*,video/*' : 'image/*';

  async function onPick(file: File | undefined) {
    if (file === undefined) return;
    setMessage(null);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/') || file.type === '';
    if (!isVideo && !isImage) {
      setState('error');
      setMessage(labels.wrongType);
      return;
    }
    if (isVideo && purpose !== 'story') {
      setState('error');
      setMessage(labels.wrongType);
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setState('error');
      setMessage(labels.tooLongVideo);
      return;
    }

    // Show it at once, before the upload — seeing your own photo appear is
    // what tells you the tap worked.
    setPreview({ url: URL.createObjectURL(file), kind: isVideo ? 'video' : 'image' });
    setState('working');
    setProgress(0);

    try {
      const body = isVideo ? file : await shrink(file, purpose);
      const uploaded = await send(body, purpose, setProgress);
      if (hidden.current !== null) hidden.current.value = uploaded.id;
      setState('done');
      if (autoSubmit) hidden.current?.form?.requestSubmit();
    } catch (error) {
      setState('error');
      const code = error instanceof Error ? error.message : '';
      setMessage(code === 'wrongKind' || code === 'unknownType' ? labels.wrongType : labels.failed);
    }
  }

  const frame =
    shape === 'square'
      ? 'aspect-square w-32'
      : shape === 'round'
        ? 'aspect-square w-28 rounded-full'
        : shape === 'tall'
          ? 'aspect-[9/16] w-full max-w-[18rem]'
          : 'aspect-[16/7] w-full';

  return (
    <div className="flex flex-col gap-3">
      <input ref={hidden} type="hidden" name={name} />

      <label
        htmlFor={inputId}
        className={`group relative grid cursor-pointer place-items-center overflow-hidden border-2 border-dashed border-c-edge-strong bg-c-raised text-c-muted transition-colors hover:border-c-accent hover:text-c-link ${
          shape === 'round' ? '' : 'rounded-lg'
        } ${frame}`}
      >
        {preview === null ? (
          <span className="flex flex-col items-center gap-2 p-4 text-center">
            <Icon name="plus" size={30} />
            <span className="text-body font-semibold">{labels.choose}</span>
          </span>
        ) : preview.kind === 'video' ? (
          <video src={preview.url} className="absolute inset-0 size-full object-cover" muted playsInline autoPlay loop />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt="" className="absolute inset-0 size-full object-cover" />
        )}

        {state === 'working' ? (
          <span className="absolute inset-x-0 bottom-0 bg-c-text px-3 py-2 text-c-bg opacity-90">
            <span className="mb-1 block text-small font-semibold">
              {labels.uploading} {Math.round(progress * 100)}%
            </span>
            <span className="block h-1.5 overflow-hidden rounded-pill bg-c-muted">
              <span className="block h-full rounded-pill bg-c-bg" style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          </span>
        ) : null}
      </label>

      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => void onPick(event.target.files?.[0])}
      />

      {state === 'done' ? (
        <p className="flex items-center gap-1.5 text-body font-semibold text-c-ok">
          <Icon name="check" size={18} />
          {labels.done}
        </p>
      ) : null}
      {message === null ? null : (
        <p role="alert" className="flex items-start gap-1.5 text-body font-semibold text-c-bad">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}
      {preview !== null && state !== 'working' ? (
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md px-3 text-body font-semibold text-c-link hover:bg-c-raised"
        >
          <Icon name="refresh" size={18} />
          {labels.change}
        </label>
      ) : null}
    </div>
  );
}
