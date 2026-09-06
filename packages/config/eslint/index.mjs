import tseslint from 'typescript-eslint';
import rtl from './rtl-plugin.mjs';

/**
 * Shared flat config. Apps and packages extend this; nothing turns off
 * `dahab-rtl/no-physical-properties` — see CLAUDE.md.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/src/generated/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { 'dahab-rtl': rtl },
    rules: {
      'dahab-rtl/no-physical-properties': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='toFixed'][callee.object.name=/[Pp]rice|[Aa]mount|[Tt]otal/]",
          message:
            'Money is never formatted with toFixed. Use formatCurrency from @dahab/i18n (CLAUDE.md).',
        },
      ],
    },
  },
);
