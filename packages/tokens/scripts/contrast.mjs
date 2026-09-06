/**
 * WCAG 2.2 relative luminance and contrast ratio.
 *
 * Hand-written rather than pulled from a package: it is fifteen lines, it is
 * frozen in a published standard, and it is the arithmetic that decides
 * whether a label is legible. A dependency here would be a dependency on
 * someone else's reading of the same fifteen lines.
 *
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */

/** @param {string} hex `#RGB`, `#RRGGBB` or `#RRGGBBAA` (alpha ignored). */
export function parseHex(hex) {
  const cleaned = hex.trim().replace(/^#/, '');
  const expanded =
    cleaned.length === 3 || cleaned.length === 4
      ? cleaned
          .split('')
          .map((character) => character + character)
          .join('')
      : cleaned;

  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(expanded)) {
    throw new TypeError(`"${hex}" is not a hex colour.`);
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

/** sRGB 0–255 to linear-light 0–1. */
function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Ratio from 1 (identical) to 21 (black on white). Order-independent. */
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounded the way a design tool reports it, so comparisons read the same. */
export function round(ratio, places = 2) {
  const factor = 10 ** places;
  return Math.round(ratio * factor) / factor;
}
