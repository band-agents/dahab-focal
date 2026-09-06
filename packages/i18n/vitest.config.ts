import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      // `intl-messageformat` publishes no `exports` map, so Node's ESM loader
      // falls back to its CommonJS `main` and `import IntlMessageFormat from
      // 'intl-messageformat'` yields a namespace object rather than the class
      // — which makes i18next-icu's `new IntlMessageFormat(...)` throw and
      // every ICU message render as its raw source.
      //
      // Metro, Next and Vite all resolve the package's `module` field to this
      // ESM build in the real apps. Pointing at it explicitly makes the test
      // run agree with them.
      'intl-messageformat': fileURLToPath(
        new URL('../../node_modules/intl-messageformat/lib/index.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    server: {
      deps: {
        inline: ['intl-messageformat', 'i18next-icu'],
      },
    },
  },
});
