import { describe, expect, it } from 'vitest';

import { MIN_PASSWORD_LENGTH as contract } from '@dahab/api-contract';

import { MIN_PASSWORD_LENGTH } from '../lib/password';

describe('password length', () => {
  it('matches what the API enforces', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(contract);
  });
});
