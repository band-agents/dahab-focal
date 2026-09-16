/**
 * The empty and absent states the operator app grew when it moved off
 * fixtures, in all seven locales.
 *
 * A fixture always had three staff and two cylinders. Real rows do not, and
 * each of these says which kind of nothing it is — no rows at all, versus a
 * row with no expiry on it, versus no payout scheduled. "Nothing scheduled"
 * and "a payout of zero" are different facts to an operator chasing money.
 *
 *   node scripts/add-vendor-empty-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'ar-EG': {
    more: {
      noStaff: 'مفيش حد مضاف للفريق لسه.',
      noResources: 'مفيش معدات مسجّلة.',
      noPayout: 'مفيش تحويل متجدول دلوقتي.',
      noExpiry: 'من غير تاريخ انتهاء',
    },
    services: { none: 'مفيش خدمات لسه.', unpriced: 'من غير سعر', noInclusions: 'مفيش حاجة متسجّلة كمشمولة.' },
    bookings: { none: 'مفيش حجوزات.', guest: 'ضيف' },
  },
  'en-GB': {
    more: {
      noStaff: 'Nobody has been added to the team yet.',
      noResources: 'No equipment on record.',
      noPayout: 'No payout scheduled.',
      noExpiry: 'No expiry recorded',
    },
    services: { none: 'No services yet.', unpriced: 'Not priced', noInclusions: 'Nothing declared as included.' },
    bookings: { none: 'No bookings.', guest: 'Guest' },
  },
  'ru-RU': {
    more: {
      noStaff: 'В команду ещё никого не добавили.',
      noResources: 'Снаряжение не внесено.',
      noPayout: 'Выплата не запланирована.',
      noExpiry: 'Срок не указан',
    },
    services: { none: 'Услуг пока нет.', unpriced: 'Без цены', noInclusions: 'Ничего не указано как включённое.' },
    bookings: { none: 'Броней нет.', guest: 'Гость' },
  },
  'it-IT': {
    more: {
      noStaff: 'Nessuno è ancora stato aggiunto al team.',
      noResources: 'Nessuna attrezzatura registrata.',
      noPayout: 'Nessun versamento programmato.',
      noExpiry: 'Nessuna scadenza registrata',
    },
    services: { none: 'Ancora nessun servizio.', unpriced: 'Senza prezzo', noInclusions: 'Nulla dichiarato come incluso.' },
    bookings: { none: 'Nessuna prenotazione.', guest: 'Ospite' },
  },
  'fr-FR': {
    more: {
      noStaff: 'Personne n’a encore été ajouté à l’équipe.',
      noResources: 'Aucun matériel enregistré.',
      noPayout: 'Aucun versement prévu.',
      noExpiry: 'Aucune échéance enregistrée',
    },
    services: { none: 'Pas encore de prestations.', unpriced: 'Sans tarif', noInclusions: 'Rien de déclaré comme inclus.' },
    bookings: { none: 'Aucune réservation.', guest: 'Invité' },
  },
  'es-ES': {
    more: {
      noStaff: 'Todavía no se ha añadido a nadie al equipo.',
      noResources: 'No hay equipo registrado.',
      noPayout: 'No hay ningún pago programado.',
      noExpiry: 'Sin fecha de caducidad',
    },
    services: { none: 'Aún no hay servicios.', unpriced: 'Sin precio', noInclusions: 'No se ha declarado nada como incluido.' },
    bookings: { none: 'No hay reservas.', guest: 'Invitado' },
  },
  'de-DE': {
    more: {
      noStaff: 'Dem Team wurde noch niemand hinzugefügt.',
      noResources: 'Keine Ausrüstung erfasst.',
      noPayout: 'Keine Auszahlung geplant.',
      noExpiry: 'Kein Ablaufdatum erfasst',
    },
    services: { none: 'Noch keine Angebote.', unpriced: 'Ohne Preis', noInclusions: 'Nichts als enthalten angegeben.' },
    bookings: { none: 'Keine Buchungen.', guest: 'Gast' },
  },
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  catalogue.vendor.more = { ...catalogue.vendor.more, ...block.more };
  catalogue.vendor.services = { ...catalogue.vendor.services, ...block.services };
  catalogue.vendor.bookings = { ...catalogue.vendor.bookings, ...block.bookings };

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor empty-state keys → ${locale}`);
}
