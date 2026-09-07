import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The gate test drives a real Chrome against a fixture build.
    testTimeout: 200_000,
    hookTimeout: 200_000,
  },
});
