/**
 * The shortest password the API accepts, for the form's own check and hint.
 *
 * A copy, not an import: `@dahab/api-contract` pulls in `@dahab/i18n`'s React
 * bindings, which break a server component. The API is what enforces it, and
 * `tests/password.test.ts` fails if this ever drifts from the contract.
 */
export const MIN_PASSWORD_LENGTH = 12;
