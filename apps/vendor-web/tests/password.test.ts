import { describe, expect, it } from 'vitest';

import { MIN_OPERATOR_PASSWORD_LENGTH, usernameSchema } from '@dahab/api-contract';

import { MIN_PASSWORD_LENGTH, USERNAME } from '../lib/password';

describe('operator login rules', () => {
  it('the password length matches what the API enforces', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(MIN_OPERATOR_PASSWORD_LENGTH);
  });

  it('the username pattern agrees with the API on every case', () => {
    for (const name of ['jellyfish.owner', 'guide_2', 'a-b', 'ab', '-lead', 'has space', 'x@y', 'a'.repeat(40), 'a'.repeat(41)]) {
      expect(USERNAME.test(name), name).toBe(usernameSchema.safeParse(name).success);
    }
  });
});
