/**
 * `vendor.offline.showing`, in all seven locales.
 *
 * The sentence the operator app puts above anything it is drawing from its
 * own cache rather than from the API. CLAUDE.md: "Mobile signal in Dahab is
 * patchy. Offline is a designed state, not an error." The point of the
 * sentence is the *time* in it — a manifest from yesterday morning must not
 * look like one from four seconds ago, because a guide acting on a stale list
 * leaves somebody standing on the shore.
 *
 * The old `vendor.offline.title` / `.body` pair described a cache that did
 * not exist, counting vouchers nothing stored. They are replaced rather than
 * kept.
 *
 *   node scripts/add-vendor-offline-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const STRINGS = {
  'ar-EG': 'مفيش نت. ده اللي كان محفوظ على التليفون من {when}.',
  'en-GB': 'No signal. This is what the phone had at {when}.',
  'ru-RU': 'Нет связи. Это то, что было сохранено на телефоне в {when}.',
  'it-IT': 'Nessun segnale. Questo è quanto il telefono aveva alle {when}.',
  'fr-FR': 'Pas de réseau. Voici ce que le téléphone avait à {when}.',
  'es-ES': 'Sin cobertura. Esto es lo que el teléfono tenía a las {when}.',
  'de-DE': 'Kein Empfang. Das ist der Stand auf dem Telefon von {when}.',
};

for (const [locale, value] of Object.entries(STRINGS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  // Replaced, not merged: the old title/body described a cache that was never
  // built, and leaving them would leave two answers to the same question.
  catalogue.vendor.offline = { showing: value };

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor offline key → ${locale}`);
}
