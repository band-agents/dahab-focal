/**
 * The shortest password an operator login accepts, for the form's own check
 * and hint.
 *
 * A copy, not an import: `@dahab/api-contract` pulls in `@dahab/i18n`'s React
 * bindings, which break a server component. The API is what enforces it, and
 * `tests/password.test.ts` fails if this ever drifts from the contract.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Same rule as the API's `usernameSchema`, checked here to point at the box. */
export const USERNAME = /^[a-z0-9][a-z0-9._-]{2,39}$/;
