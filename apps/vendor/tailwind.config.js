/* eslint-env node */
/**
 * The operator app's Tailwind config.
 *
 * Every colour, size, radius and shadow arrives through the generated preset
 * in @dahab/tokens, which is built from tokens.json (CLAUDE.md). Nothing
 * visual is declared here.
 *
 * The one thing overridden is the **shape** of the font stacks, not their
 * content. The preset emits web-style stacks with fallbacks —
 * `"Baloo 2", system-ui, sans-serif` — because that is what a browser wants.
 * React Native has no notion of a stack: it takes the whole string as one
 * family name, finds nothing called `"Baloo 2", system-ui, sans-serif`, and
 * silently draws the system font instead. The design system's entire type
 * layer disappears and nothing reports it.
 *
 * So the four roles that name a real bundled typeface are reduced to the
 * family alone. The name is unchanged, so on the web it still matches the
 * `@font-face` the token build emits, and on a phone it matches what
 * `app.config.js` registers through expo-font. One name, two platforms, no
 * second source of truth.
 *
 * `mono` is deliberately left as the preset wrote it. The design system
 * bundles no monospace face — that stack is generic keywords all the way down
 * — so there is nothing for expo-font to register and nothing to reduce.
 */
const tokensPreset = require('@dahab/tokens/tailwind-preset');

/** The roles that name a real, bundled typeface. */
const BUNDLED_ROLES = ['display', 'ui', 'arabicDisplay', 'arabicBody'];

/**
 * The family at the head of a stack, quoted if CSS requires it.
 *
 * `'"Baloo 2", system-ui, sans-serif'` → `'"Baloo 2"'`.
 *
 * The quotes are not decoration: CSS requires them around a family name
 * containing a space, and Tailwind does not add them. Emitting
 * `font-family: Baloo 2` produces an invalid declaration the browser drops
 * silently, which is how every display heading on the web reverted to the
 * system font the first time this was tried.
 */
function head(stack) {
  const raw = Array.isArray(stack) ? stack[0] : stack;
  const family = String(raw)
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '');
  return family.includes(' ') ? `"${family}"` : family;
}

const fontFamily = Object.fromEntries(
  Object.entries(tokensPreset.theme.extend.fontFamily)
    .filter(([role]) => BUNDLED_ROLES.includes(role))
    .map(([role, stack]) => [role, [head(stack)]]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset'), tokensPreset],
  theme: { extend: { fontFamily } },
  plugins: [],
};
