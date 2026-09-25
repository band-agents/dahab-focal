import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The component contracts that exist to make a design rule unbreakable.
 *
 * These read the source rather than rendering, because what is being asserted
 * is the shape of the API — that a caller *cannot* express the wrong thing —
 * and that survives a refactor of the markup while a snapshot would not.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const button = read('../src/primitives/Button.tsx');
const statusPill = read('../src/primitives/StatusPill.tsx');
const mark = read('../src/marks/Mark.tsx');

describe('the Button cannot express white-on-fill', () => {
  it('takes no colour prop at all', () => {
    // White on blush-200 is 1.4:1. The design system says the primitive must
    // make it impossible rather than merely discouraged, so there is no prop
    // through which a caller could supply a colour.
    expect(button).not.toMatch(/readonly (color|colour|background|fill)\??:/);
  });

  it('offers exactly three variants', () => {
    expect(button).toContain("export type ButtonVariant = 'primary' | 'secondary' | 'ghost'");
  });

  it('keeps the 44px floor and the focus ring in the primitive', () => {
    expect(button).toContain('min-h-11');
    expect(button).toContain('outline-focus-ring');
  });
});

describe('status is never colour alone', () => {
  it('requires a label', () => {
    // `children` is not optional: a pill with no word is a pill nobody can read.
    expect(statusPill).toMatch(/readonly children: ReactNode;/);
    expect(statusPill).not.toMatch(/readonly children\?: ReactNode;/);
  });

  it('gives every tone a mark', () => {
    for (const tone of ['success', 'warning', 'danger', 'info', 'neutral']) {
      expect(statusPill).toMatch(new RegExp(`${tone}: \\{[^}]*mark:`));
    }
  });

  it('uses only semantic surfaces, which carry a Night Dive value', () => {
    // A raw ramp step (cream-100, mint-50, ink-900) has no dark value, so a
    // pill built from one silently stays light on a dark ground.
    expect(statusPill).not.toMatch(/bg-(cream|mint|blush|sand|clay|olive)-\d/);
    expect(statusPill).not.toMatch(/text-ink-\d/);
  });
});

describe('the mark construction lives in one place', () => {
  it('keeps the +4/+4 offset and the dense line weight', () => {
    expect(mark).toContain('SHAPE_OFFSET = 4');
    expect(mark).toContain('LINE_WEIGHT = 3');
    expect(mark).toContain('LINE_WEIGHT_DENSE = 4.6');
  });

  it('mirrors by default and treats noFlip as the exception', () => {
    // An SVG does not mirror on its own when the layout does, so mirroring is
    // the transform and noFlip is its absence — the inverse is a real bug.
    expect(mark).toContain('noFlip ? null :');
  });
});
