/**
 * Structural only. Every visual value arrives through the generated preset in
 * @dahab/tokens, which is built from tokens.json.
 */
const tokensPreset = require('@dahab/tokens/tailwind-preset');
const base = require('@dahab/config/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...base,
  presets: [tokensPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui-web/src/**/*.{ts,tsx}',
  ],
};
