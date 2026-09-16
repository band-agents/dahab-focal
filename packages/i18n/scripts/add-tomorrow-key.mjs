/**
 * `admin.bookings.noneTomorrow`, in all seven locales.
 *
 * A05's cancellation panel reads the *next* day's departures, because a
 * weather cancellation is about a boat that has not sailed yet. Its empty
 * state was borrowing `admin.today.noDepartures` — "Nothing is going out
 * today" — on a panel about tomorrow, which tells an operator something
 * false about the day they are actually looking at.
 *
 *   node scripts/add-tomorrow-key.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const STRINGS = {
  'en-GB': 'Nothing is going out tomorrow.',
  'ar-EG': 'مفيش أي رحلة بكرة.',
  'ru-RU': 'Завтра выходов нет.',
  'it-IT': 'Domani non esce nulla.',
  'fr-FR': 'Rien ne part demain.',
  'es-ES': 'Mañana no sale nada.',
  'de-DE': 'Morgen fährt nichts raus.',
};

for (const [locale, value] of Object.entries(STRINGS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.admin.bookings = { ...catalogue.admin.bookings, noneTomorrow: value };
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`tomorrow key → ${locale}`);
}
