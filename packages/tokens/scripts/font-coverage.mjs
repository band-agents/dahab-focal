/**
 * Which characters a TrueType file can actually draw.
 *
 * Reads the `cmap` table directly, because this is the one question about the
 * native fonts that matters and no filename answers it. On the web a missing
 * script is caught by `unicode-range`: the browser simply does not use that
 * face. On a phone there is no such mechanism — a Rubik with no Arabic in it
 * registers happily, reports its name correctly, and renders every Arabic
 * screen as a row of empty boxes.
 *
 * Only formats 4 and 12 are handled. Those are what Google Fonts serves, and
 * a file using anything else should fail loudly here rather than be assumed
 * complete.
 */

/** @param {Buffer} font */
export function coveredCodepoints(font) {
  const numTables = font.readUInt16BE(4);
  let cmapOffset = null;

  for (let index = 0; index < numTables; index += 1) {
    const record = 12 + index * 16;
    if (font.subarray(record, record + 4).toString('latin1') === 'cmap') {
      cmapOffset = font.readUInt32BE(record + 8);
      break;
    }
  }
  if (cmapOffset === null) throw new Error('No cmap table: this is not a usable font.');

  const subtableCount = font.readUInt16BE(cmapOffset + 2);
  const covered = new Set();

  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmapOffset + 4 + index * 8;
    const subtable = cmapOffset + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(subtable);

    if (format === 4) readFormat4(font, subtable, covered);
    else if (format === 12) readFormat12(font, subtable, covered);
  }

  return covered;
}

function readFormat4(font, at, covered) {
  const segCountX2 = font.readUInt16BE(at + 6);
  const segCount = segCountX2 / 2;
  const endAt = at + 14;
  const startAt = endAt + segCountX2 + 2;

  for (let segment = 0; segment < segCount; segment += 1) {
    const end = font.readUInt16BE(endAt + segment * 2);
    const start = font.readUInt16BE(startAt + segment * 2);
    if (start === 0xff_ff) continue;
    for (let code = start; code <= end && code !== 0xff_ff; code += 1) covered.add(code);
  }
}

function readFormat12(font, at, covered) {
  const groups = font.readUInt32BE(at + 12);
  for (let index = 0; index < groups; index += 1) {
    const group = at + 16 + index * 12;
    const start = font.readUInt32BE(group);
    const end = font.readUInt32BE(group + 4);
    // A single group can span thousands; the caller only ever asks whether
    // specific characters are present, so the range is recorded sparsely for
    // anything large.
    const limit = Math.min(end, start + 4096);
    for (let code = start; code <= limit; code += 1) covered.add(code);
  }
}

/** One representative character per script the design system has to draw. */
export const SCRIPT_SAMPLES = {
  latin: 'A'.codePointAt(0),
  latinExt: 'ő'.codePointAt(0),
  cyrillic: 'Д'.codePointAt(0),
  // ARABIC LETTER BEH — the script the whole operator app is written in.
  arabic: 'ب'.codePointAt(0),
  arabicIndicDigit: '٧'.codePointAt(0),
};
