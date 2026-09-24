/**
 * A phone number the way people in Egypt write it, turned into the
 * international form the API stores.
 *
 * `010 0123 4567`, `01001234567`, `201001234567`, `+20 100 123 4567` and
 * `0020 100 123 4567` are all the same mobile. Anything that already starts
 * with `+` is taken as given, so a foreign guide's number works too. Arabic
 * digits are accepted, because that is what some phones type.
 *
 * Not in a 'use server' file on purpose: everything such a file exports
 * becomes an endpoint anybody can call.
 */
export function normalisePhone(input: string): string | null {
  const western = input.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
  const compact = western.replace(/[\s\-().]/g, '');
  let e164: string;
  if (compact.startsWith('+')) e164 = compact;
  else if (compact.startsWith('00')) e164 = `+${compact.slice(2)}`;
  else if (compact.startsWith('20')) e164 = `+${compact}`;
  else if (compact.startsWith('0')) e164 = `+20${compact.slice(1)}`;
  else e164 = `+20${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}
