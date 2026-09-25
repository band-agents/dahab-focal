/**
 * `admin.cancelReview.reasonHint`, in all seven locales.
 *
 * The cancellation form was borrowing `admin.review.reasonHint` — "a
 * rejection is sent to the operator in full" — which is the document queue's
 * sentence and says the wrong thing here. A weather cancellation's reason
 * does not go to one operator as a rejection; it goes to the operator *and*
 * to every traveller who was booked, and it lands on their refund.
 *
 *   node scripts/add-cancel-hint-key.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const STRINGS = {
  'en-GB': 'Recorded against your name, and sent to the operator and everyone booked.',
  'ar-EG': 'بيتسجّل باسمك، وبيوصل للمركز ولكل اللي حاجزين.',
  'ru-RU': 'Записывается на ваше имя и отправляется оператору и всем, кто забронировал.',
  'it-IT': 'Registrato a tuo nome, e inviato all’operatore e a tutti i prenotati.',
  'fr-FR': 'Enregistré à votre nom, et transmis à l’opérateur et à toutes les personnes inscrites.',
  'es-ES': 'Se registra a tu nombre y se envía al operador y a todas las personas con reserva.',
  'de-DE': 'Wird unter Ihrem Namen festgehalten und an den Betrieb sowie alle Gebuchten gesendet.',
};

for (const [locale, value] of Object.entries(STRINGS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.admin.cancelReview = { ...catalogue.admin.cancelReview, reasonHint: value };
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`cancel hint → ${locale}`);
}
