import { describe, expect, it } from 'vitest';

import { normalisePhone } from '../lib/phone';

describe('normalisePhone', () => {
  it('reads an Egyptian mobile however it is written', () => {
    for (const typed of ['010 0123 4567', '01001234567', '201001234567', '+20 100 123 4567', '0020 100 123 4567', '010-0123-4567']) {
      expect(normalisePhone(typed)).toBe('+201001234567');
    }
  });

  it('accepts Arabic-Indic digits, as some phones type them', () => {
    expect(normalisePhone('٠١٠٠١٢٣٤٥٦٧')).toBe('+201001234567');
  });

  it('keeps a foreign number that already has its country code', () => {
    expect(normalisePhone('+44 7700 900123')).toBe('+447700900123');
  });

  it('refuses what is not a phone number', () => {
    expect(normalisePhone('')).toBeNull();
    expect(normalisePhone('hello')).toBeNull();
    expect(normalisePhone('123')).toBeNull();
  });
});
