/**
 * The four reasons a console screen has no data.
 *
 * "Nothing is expiring" and "we could not ask" are different facts, so the
 * console needs words for the second one.
 *
 *   node scripts/add-problem-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    unreachable: 'The API did not answer, so this screen has nothing to show — not an empty result.',
    noDatabase: 'The API is running but has no database configured.',
    forbidden: 'This account does not hold the permission this screen needs.',
    unauthorized: 'This console has no valid session.',
  },
  'ar-EG': {
    unreachable: 'الـ API مردّش، فالشاشة دي مفيهاش حاجة تتعرض — دي مش نتيجة فاضية.',
    noDatabase: 'الـ API شغّال بس مفيش داتابيز متظبطة.',
    forbidden: 'الحساب ده معهوش الصلاحية اللي الشاشة دي محتاجاها.',
    unauthorized: 'الكونسول ده مفيهوش جلسة صالحة.',
  },
  'de-DE': {
    unreachable:
      'Die API hat nicht geantwortet — dieser Bildschirm hat nichts zu zeigen, kein leeres Ergebnis.',
    noDatabase: 'Die API läuft, hat aber keine Datenbank konfiguriert.',
    forbidden: 'Dieses Konto hat die Berechtigung nicht, die dieser Bildschirm braucht.',
    unauthorized: 'Diese Konsole hat keine gültige Sitzung.',
  },
  'ru-RU': {
    unreachable: 'API не ответил, поэтому на экране ничего нет — это не пустой результат.',
    noDatabase: 'API работает, но база данных не настроена.',
    forbidden: 'У этой учётной записи нет права, которое нужно этому экрану.',
    unauthorized: 'У консоли нет действующей сессии.',
  },
  'it-IT': {
    unreachable: "L'API non ha risposto, quindi questa schermata non ha nulla da mostrare — non è un risultato vuoto.",
    noDatabase: "L'API è attiva ma non ha un database configurato.",
    forbidden: 'Questo account non ha il permesso richiesto da questa schermata.',
    unauthorized: 'Questa console non ha una sessione valida.',
  },
  'fr-FR': {
    unreachable:
      "L'API n'a pas répondu : cet écran n'a rien à montrer — ce n'est pas un résultat vide.",
    noDatabase: "L'API fonctionne mais aucune base de données n'est configurée.",
    forbidden: "Ce compte ne détient pas la permission dont cet écran a besoin.",
    unauthorized: "Cette console n'a pas de session valide.",
  },
  'es-ES': {
    unreachable: 'La API no respondió, así que esta pantalla no tiene nada que mostrar — no es un resultado vacío.',
    noDatabase: 'La API está en marcha pero no tiene base de datos configurada.',
    forbidden: 'Esta cuenta no tiene el permiso que necesita esta pantalla.',
    unauthorized: 'Esta consola no tiene una sesión válida.',
  },
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.admin.problem = block;
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`problem keys → ${locale}`);
}
