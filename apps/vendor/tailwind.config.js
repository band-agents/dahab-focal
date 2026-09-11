/* eslint-env node */
/**
 * The gallery's Tailwind config carries no visual values of its own. Every
 * colour, size, radius and shadow arrives through the generated preset in
 * @dahab/tokens, which is built from tokens.json (CLAUDE.md).
 */
const tokensPreset = require('@dahab/tokens/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset'), tokensPreset],
  theme: { extend: {} },
  plugins: [],
};
