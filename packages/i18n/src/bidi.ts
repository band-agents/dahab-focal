/**
 * Bidi isolation.
 *
 * Dahab's dive sites are Latin proper nouns that appear inside Arabic
 * sentences: "الغطس في Blue Hole يبدأ الساعة 08:00". Without isolation the
 * bidi algorithm resolves the Latin run against its neighbours and the
 * trailing punctuation, digits and parentheses migrate to the wrong end of
 * the phrase. The fix is not a wrapper element — it is these characters.
 *
 * U+2066 LRI  first-strong-independent left-to-right isolate
 * U+2067 RLI  right-to-left isolate
 * U+2068 FSI  first-strong isolate: direction taken from the first strong
 *             character in the run, which is what we almost always want
 * U+2069 PDI  pop directional isolate
 *
 * FSI/PDI are preferred over the deprecated LRM/RLM marks and over
 * LRE/RLE/PDF embeddings, which do not nest correctly.
 */

export const LRI = '⁦';
export const RLI = '⁧';
export const FSI = '⁨';
export const PDI = '⁩';

/** Left-to-right mark and right-to-left mark, for the rare single-point fix. */
export const LRM = '‎';
export const RLM = '‏';

export type IsolationDirection = 'auto' | 'ltr' | 'rtl';

const OPENING: Readonly<Record<IsolationDirection, string>> = {
  auto: FSI,
  ltr: LRI,
  rtl: RLI,
};

/**
 * Wrap a run of text so its internal direction cannot leak into, or be
 * overridden by, the surrounding paragraph.
 *
 * Use it for any value whose script is not the UI's script: dive-site and
 * operator names, e-mail addresses, phone numbers, booking references,
 * currency pairs, file names.
 *
 * ```ts
 * t('booking.meetAt', { site: isolate('Blue Hole') })
 * ```
 */
export function isolate(text: string, direction: IsolationDirection = 'auto'): string {
  if (text.length === 0) return text;
  return `${OPENING[direction]}${text}${PDI}`;
}

/** True when the value already carries isolation, so we do not double-wrap. */
export function isIsolated(text: string): boolean {
  const first = text.charAt(0);
  return (first === FSI || first === LRI || first === RLI) && text.endsWith(PDI);
}

export function isolateOnce(text: string, direction: IsolationDirection = 'auto'): string {
  return isIsolated(text) ? text : isolate(text, direction);
}

/** Remove isolation marks — for logs, sort keys, tests and CSV export. */
export function stripIsolation(text: string): string {
  return text.replace(/[⁦⁧⁨⁩‎‏]/g, '');
}

/** Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Arabic presentation forms. */
const STRONG_RTL =
  /[֐-׿؀-޿ࠀ-࡟ࢠ-ࣿיִ-﷿ﹰ-﻿]|[𐠀-𐳿]|[𞠀-𞿿]/u;
/** Latin, Greek, Cyrillic — the scripts our seven locales actually use. */
const STRONG_LTR = /[A-Za-zÀ-ʯͰ-ӿḀ-῿]/u;

/**
 * The direction the bidi algorithm would infer from a string's first strong
 * character. Used to decide whether a value needs isolating at all, and by
 * the gallery to label mixed-script samples.
 */
export function firstStrongDirection(text: string): 'ltr' | 'rtl' | 'neutral' {
  for (const character of text) {
    if (STRONG_RTL.test(character)) return 'rtl';
    if (STRONG_LTR.test(character)) return 'ltr';
  }
  return 'neutral';
}

/**
 * Isolate only when the run's direction differs from the paragraph's, so
 * Arabic text inside Arabic UI stays free of stray control characters.
 */
export function isolateIfForeign(text: string, paragraph: 'ltr' | 'rtl'): string {
  const runDirection = firstStrongDirection(text);
  if (runDirection === 'neutral' || runDirection === paragraph) return text;
  return isolateOnce(text);
}
