/**
 * Two keys the catalogue screen was borrowing from the wrong noun.
 *
 * The review queue counts SERVICES, not documents, and the attributes table's
 * numeric column counts OPTIONS on an enum, not services. Reusing a nearby
 * plural because it happened to be there is how a console ends up saying
 * "5 documents" over a list of dive trips.
 *
 *   node scripts/add-catalog-count-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const KEYS = {
  'en-GB': {
    serviceCount: '{count, plural, one {# service} other {# services}}',
    options: 'Options',
  },
  'ar-EG': {
    serviceCount:
      '{count, plural, zero {لا خدمات} one {خدمة واحدة} two {خدمتان} few {# خدمات} many {# خدمة} other {# خدمة}}',
    options: 'الخيارات',
  },
  'de-DE': {
    serviceCount: '{count, plural, one {# Leistung} other {# Leistungen}}',
    options: 'Optionen',
  },
  'ru-RU': {
    serviceCount:
      '{count, plural, one {# услуга} few {# услуги} many {# услуг} other {# услуги}}',
    options: 'Варианты',
  },
  'it-IT': {
    serviceCount: '{count, plural, one {# servizio} other {# servizi}}',
    options: 'Opzioni',
  },
  'fr-FR': {
    serviceCount: '{count, plural, one {# prestation} other {# prestations}}',
    options: 'Options',
  },
  'es-ES': {
    serviceCount: '{count, plural, one {# servicio} other {# servicios}}',
    options: 'Opciones',
  },
};

/** "Options" is the same word in French. */
const IDENTICAL = { 'fr-FR': ['admin.col3.options'] };

for (const [locale, block] of Object.entries(KEYS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.admin.catalog.serviceCount = block.serviceCount;
  catalogue.admin.col3.options = block.options;

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`catalogue count keys → ${locale}`);
}
