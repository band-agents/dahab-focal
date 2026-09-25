/**
 * Structural Tailwind configuration shared by every surface.
 *
 * It deliberately does NOT require @dahab/tokens: the tokens package already
 * depends on this one for its tsconfig, and adding the reverse edge makes a
 * build cycle that Turbo refuses. Each surface composes the two itself:
 *
 *   const tokensPreset = require('@dahab/tokens/tailwind-preset');
 *   const base = require('@dahab/config/tailwind');
 *   module.exports = { ...base, presets: [tokensPreset], content: [...] };
 *
 * So this file carries no visual values of its own — colours, spacing, radii,
 * type and shadows all arrive through the generated preset.
 */

/** @type {Partial<import('tailwindcss').Config>} */
module.exports = {
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
