/**
 * Tailwind base shared by every surface.
 *
 * It carries no visual values of its own: colors, spacing, radii, type and
 * shadows all arrive through the generated preset in @dahab/tokens, which is
 * built from tokens.json. This file only holds structural configuration.
 */
const tokensPreset = require('@dahab/tokens/tailwind-preset');

/** @type {Partial<import('tailwindcss').Config>} */
module.exports = {
  presets: [tokensPreset],
  theme: {
    extend: {},
  },
  corePlugins: {
    // Physical-direction utilities are disabled at the framework level so the
    // lint rule is a second line of defence rather than the only one.
    space: false,
  },
  plugins: [],
};
