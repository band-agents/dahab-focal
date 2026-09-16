/**
 * Adds the console's conditions strip keys to all seven catalogues.
 *
 * Wind speed has no formatter in this package (temperature and distance do),
 * so the unit travels with the message as an ICU argument rather than being
 * concatenated onto a number at the call site — which is what put the "6" at
 * the wrong end of the Arabic string.
 *
 *   node scripts/add-conditions-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const COND = {
  'en-GB': { wind: '{value} kt', windLabel: 'Wind', waterLabel: 'Water', visLabel: 'Visibility' },
  'ar-EG': { wind: '{value} عقدة', windLabel: 'الريح', waterLabel: 'الماء', visLabel: 'الرؤية' },
  'de-DE': { wind: '{value} kn', windLabel: 'Wind', waterLabel: 'Wasser', visLabel: 'Sicht' },
  'ru-RU': { wind: '{value} уз', windLabel: 'Ветер', waterLabel: 'Вода', visLabel: 'Видимость' },
  'it-IT': { wind: '{value} kt', windLabel: 'Vento', waterLabel: 'Acqua', visLabel: 'Visibilità' },
  'fr-FR': { wind: '{value} nd', windLabel: 'Vent', waterLabel: 'Eau', visLabel: 'Visibilité' },
  'es-ES': { wind: '{value} kt', windLabel: 'Viento', waterLabel: 'Agua', visLabel: 'Visibilidad' },
};

/** Same string as the source, and legitimately so. */
const IDENTICAL = {
  'de-DE': ['admin.cond.windLabel'],
  'it-IT': ['admin.cond.wind'],
  'es-ES': ['admin.cond.wind'],
};

for (const [locale, block] of Object.entries(COND)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.admin.cond = block;

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`conditions keys → ${locale}`);
}
