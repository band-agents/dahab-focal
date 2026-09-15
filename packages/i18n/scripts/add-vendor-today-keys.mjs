/**
 * Today's honest states and the on-phone cancellation, in all seven locales.
 *
 * Two of these replace things the design drew and the data cannot support:
 * the conditions strip and the wind-above-your-limit banner. No weather
 * source is connected, so the screen says that rather than printing a
 * plausible number — a wind speed nobody measured, on the screen that decides
 * whether a boat sails, is the most dangerous placeholder in the product.
 *
 *   node scripts/add-vendor-today-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'ar-EG': {
    today: {
      noWeather: 'مفيش مصدر طقس موصّل. الأرقام اللي كانت هنا مكانتش بتتقاس من حاجة.',
      nothing: 'مفيش أي رحلة النهارده.',
      noManifest: 'لسه محدش حاجز.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {مفيش ملاحظات طبية} zero {مفيش ملاحظات طبية} one {ملاحظة طبية واحدة} two {ملاحظتين طبيين} few {# ملاحظات طبية} many {# ملاحظة طبية} other {# ملاحظة طبية}}',
    },
    cancel: {
      open: 'ألغي الرحلة دي',
      title: 'الإلغاء هيمسّ إيه',
      summary:
        'هيلغي {bookings, plural, zero {# حجز} one {حجز واحد} two {حجزين} few {# حجوزات} many {# حجز} other {# حجز}}، يرجّع فلوس {refunds} ويفكّ {releases}.',
      irreversible: 'مش هينفع يترجع من هنا.',
      commit: 'ألغِ الرحلة',
      working: 'بيلغي…',
      failed: 'الإلغاء مامشيش. مفيش حاجة اتغيّرت.',
    },
  },
  'en-GB': {
    today: {
      noWeather: 'No weather source connected. The readings that were here were measured from nothing.',
      nothing: 'Nothing is going out today.',
      noManifest: 'Nobody has booked yet.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {No medical notes} one {# medical note} other {# medical notes}}',
    },
    cancel: {
      open: 'Cancel this departure',
      title: 'What cancelling touches',
      summary:
        'Cancels {bookings, plural, one {# booking} other {# bookings}}, refunds {refunds} and releases {releases}.',
      irreversible: 'This cannot be undone from here.',
      commit: 'Cancel the departure',
      working: 'Cancelling…',
      failed: 'That did not go through. Nothing was changed.',
    },
  },
  'ru-RU': {
    today: {
      noWeather: 'Источник погоды не подключён. Цифры, что были здесь, ничем не измерялись.',
      nothing: 'Сегодня выходов нет.',
      noManifest: 'Пока никто не забронировал.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {Медицинских отметок нет} one {# медицинская отметка} few {# медицинские отметки} many {# медицинских отметок} other {# медицинских отметок}}',
    },
    cancel: {
      open: 'Отменить этот выход',
      title: 'Что затронет отмена',
      summary:
        'Отменяет {bookings, plural, one {# бронь} few {# брони} many {# броней} other {# броней}}, возвращает {refunds} и освобождает {releases}.',
      irreversible: 'Отсюда это не отменить.',
      commit: 'Отменить выход',
      working: 'Отменяем…',
      failed: 'Не прошло. Ничего не изменилось.',
    },
  },
  'it-IT': {
    today: {
      noWeather: 'Nessuna fonte meteo collegata. I valori che erano qui non misuravano nulla.',
      nothing: 'Oggi non esce nulla.',
      noManifest: 'Ancora nessuna prenotazione.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {Nessuna nota medica} one {# nota medica} other {# note mediche}}',
    },
    cancel: {
      open: 'Annulla questa partenza',
      title: 'Cosa tocca l’annullamento',
      summary:
        'Annulla {bookings, plural, one {# prenotazione} other {# prenotazioni}}, rimborsa {refunds} e libera {releases}.',
      irreversible: 'Da qui non si torna indietro.',
      commit: 'Annulla la partenza',
      working: 'Annullamento…',
      failed: 'Non è andata a buon fine. Nulla è stato modificato.',
    },
  },
  'fr-FR': {
    today: {
      noWeather: 'Aucune source météo connectée. Les valeurs qui étaient ici ne mesuraient rien.',
      nothing: 'Rien ne part aujourd’hui.',
      noManifest: 'Personne n’a encore réservé.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {Aucune note médicale} one {# note médicale} other {# notes médicales}}',
    },
    cancel: {
      open: 'Annuler ce départ',
      title: 'Ce que l’annulation touche',
      summary:
        'Annule {bookings, plural, one {# réservation} other {# réservations}}, rembourse {refunds} et libère {releases}.',
      irreversible: 'C’est irréversible depuis ici.',
      commit: 'Annuler le départ',
      working: 'Annulation…',
      failed: 'Cela n’a pas abouti. Rien n’a été modifié.',
    },
  },
  'es-ES': {
    today: {
      noWeather: 'No hay ninguna fuente meteorológica conectada. Las cifras que había aquí no medían nada.',
      nothing: 'Hoy no sale nada.',
      noManifest: 'Todavía no ha reservado nadie.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {Sin notas médicas} one {# nota médica} other {# notas médicas}}',
    },
    cancel: {
      open: 'Cancelar esta salida',
      title: 'A qué afecta cancelar',
      summary:
        'Cancela {bookings, plural, one {# reserva} other {# reservas}}, reembolsa {refunds} y libera {releases}.',
      irreversible: 'Desde aquí no tiene vuelta atrás.',
      commit: 'Cancelar la salida',
      working: 'Cancelando…',
      failed: 'No salió adelante. No se cambió nada.',
    },
  },
  'de-DE': {
    today: {
      noWeather: 'Keine Wetterquelle verbunden. Die Werte, die hier standen, haben nichts gemessen.',
      nothing: 'Heute fährt nichts raus.',
      noManifest: 'Noch keine Buchung.',
    },
    outstanding: {
      medical:
        '{count, plural, =0 {Keine medizinischen Hinweise} one {# medizinischer Hinweis} other {# medizinische Hinweise}}',
    },
    cancel: {
      open: 'Diese Ausfahrt absagen',
      title: 'Was die Absage betrifft',
      summary:
        'Sagt {bookings, plural, one {# Buchung} other {# Buchungen}} ab, erstattet {refunds} und gibt {releases} frei.',
      irreversible: 'Von hier aus ist das endgültig.',
      commit: 'Ausfahrt absagen',
      working: 'Wird abgesagt…',
      failed: 'Das ist nicht durchgegangen. Es wurde nichts geändert.',
    },
  },
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  catalogue.vendor.today = { ...catalogue.vendor.today, ...block.today };
  catalogue.vendor.outstanding = { ...catalogue.vendor.outstanding, ...block.outstanding };
  catalogue.vendor.cancel = block.cancel;

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor today keys → ${locale}`);
}
