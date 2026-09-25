/**
 * The console's review and commit strings, in all seven locales.
 *
 * These sit under `admin.review` and are shared by the three writes: the
 * document queue, the listing queue and the weather cancellation. The verbs
 * differ per screen and live beside their board's own keys; what is here is
 * the frame — the reason field, the outcomes, and the way out.
 *
 *   node scripts/add-review-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    review: {
      reason: 'Reason',
      reasonHint: 'Recorded against your name. A rejection is sent to the operator in full.',
      close: 'Not now',
      outcome: {
        done: 'Done, and recorded in the audit log.',
        conflict: 'Someone else got there first. The board below is up to date.',
        refused: 'This account is not allowed to do that.',
        failed: 'That did not go through. Nothing was changed.',
      },
    },
    documentReview: {
      title: 'Review this document',
      verify: 'Verify',
      reject: 'Reject',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'Review this listing',
      publish: 'Publish',
      reject: 'Reject',
      of: '{title} · {vendor}',
      missing: '{count, plural, =0 {Every comparable attribute answered} one {# comparable attribute unanswered} other {# comparable attributes unanswered}}',
    },
    cancelReview: {
      title: 'Cancel this departure',
      confirm: 'Cancel the departure',
      warning:
        'This refunds {refunds, plural, one {# booking} other {# bookings}} and releases {releases, plural, one {# more} other {# more}}. It cannot be undone from here.',
    },
  },
  'ar-EG': {
    review: {
      reason: 'السبب',
      reasonHint: 'بيتسجّل باسمك. والرفض بيوصل للمركز بنصّه.',
      close: 'مش دلوقتي',
      outcome: {
        done: 'تمام، واتسجّل في سجل التدقيق.',
        conflict: 'حد تاني سبقك. اللوحة تحت محدّثة.',
        refused: 'الحساب ده مش مسموح له بده.',
        failed: 'العملية مامشيتش. مفيش حاجة اتغيّرت.',
      },
    },
    documentReview: {
      title: 'راجع الورقة دي',
      verify: 'اعتماد',
      reject: 'رفض',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'راجع الخدمة دي',
      publish: 'نشر',
      reject: 'رفض',
      of: '{title} · {vendor}',
      missing:
        '{count, plural, =0 {كل الخصائص المقارَنة متملّية} zero {كل الخصائص المقارَنة متملّية} one {خاصية مقارَنة واحدة ناقصة} two {خاصيتين مقارَنة ناقصين} few {# خصائص مقارَنة ناقصة} many {# خاصية مقارَنة ناقصة} other {# خاصية مقارَنة ناقصة}}',
    },
    cancelReview: {
      title: 'إلغاء الرحلة دي',
      confirm: 'ألغِ الرحلة',
      warning:
        'ده هيرجّع فلوس {refunds, plural, zero {# حجز} one {حجز واحد} two {حجزين} few {# حجوزات} many {# حجز} other {# حجز}} ويفكّ {releases, plural, zero {# كمان} one {واحد كمان} two {اتنين كمان} few {# كمان} many {# كمان} other {# كمان}}. ومش هينفع يترجع من هنا.',
    },
  },
  'ru-RU': {
    review: {
      reason: 'Причина',
      reasonHint: 'Записывается на ваше имя. Отказ отправляется оператору целиком.',
      close: 'Не сейчас',
      outcome: {
        done: 'Готово, записано в журнал аудита.',
        conflict: 'Кто-то успел раньше. Таблица ниже уже обновлена.',
        refused: 'У этой учётной записи нет такого права.',
        failed: 'Не прошло. Ничего не изменилось.',
      },
    },
    documentReview: {
      title: 'Проверить документ',
      verify: 'Подтвердить',
      reject: 'Отклонить',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'Проверить объявление',
      publish: 'Опубликовать',
      reject: 'Отклонить',
      of: '{title} · {vendor}',
      missing:
        '{count, plural, =0 {Все сравнимые характеристики заполнены} one {# сравнимая характеристика не заполнена} few {# сравнимые характеристики не заполнены} many {# сравнимых характеристик не заполнено} other {# сравнимых характеристик не заполнено}}',
    },
    cancelReview: {
      title: 'Отменить выход',
      confirm: 'Отменить выход',
      warning:
        'Будет возвращена оплата по {refunds, plural, one {# брони} few {# броням} many {# броням} other {# броням}} и освобождено ещё {releases, plural, one {#} few {#} many {#} other {#}}. Отсюда это не отменить.',
    },
  },
  'it-IT': {
    review: {
      reason: 'Motivo',
      reasonHint: 'Registrato a tuo nome. Un rifiuto arriva all’operatore per intero.',
      close: 'Non ora',
      outcome: {
        done: 'Fatto, e registrato nel log di audit.',
        conflict: 'Qualcun altro è arrivato prima. La tabella qui sotto è aggiornata.',
        refused: 'Questo account non può farlo.',
        failed: 'Non è andata a buon fine. Nulla è stato modificato.',
      },
    },
    documentReview: {
      title: 'Esamina questo documento',
      verify: 'Verifica',
      reject: 'Rifiuta',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'Esamina questo annuncio',
      publish: 'Pubblica',
      reject: 'Rifiuta',
      of: '{title} · {vendor}',
      missing:
        '{count, plural, =0 {Tutti gli attributi confrontabili sono compilati} one {# attributo confrontabile mancante} other {# attributi confrontabili mancanti}}',
    },
    cancelReview: {
      title: 'Annulla questa partenza',
      confirm: 'Annulla la partenza',
      warning:
        'Rimborsa {refunds, plural, one {# prenotazione} other {# prenotazioni}} e ne libera {releases, plural, one {# altra} other {# altre}}. Da qui non si torna indietro.',
    },
  },
  'fr-FR': {
    review: {
      reason: 'Motif',
      reasonHint: 'Enregistré à votre nom. Un refus est transmis intégralement à l’opérateur.',
      close: 'Pas maintenant',
      outcome: {
        done: 'Fait, et consigné dans le journal d’audit.',
        conflict: 'Quelqu’un est passé avant vous. Le tableau ci-dessous est à jour.',
        refused: 'Ce compte n’a pas le droit de faire cela.',
        failed: 'Cela n’a pas abouti. Rien n’a été modifié.',
      },
    },
    documentReview: {
      title: 'Examiner ce document',
      verify: 'Valider',
      reject: 'Refuser',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'Examiner cette annonce',
      publish: 'Publier',
      reject: 'Refuser',
      of: '{title} · {vendor}',
      missing:
        '{count, plural, =0 {Tous les attributs comparables sont renseignés} one {# attribut comparable non renseigné} other {# attributs comparables non renseignés}}',
    },
    cancelReview: {
      title: 'Annuler ce départ',
      confirm: 'Annuler le départ',
      warning:
        'Cela rembourse {refunds, plural, one {# réservation} other {# réservations}} et en libère {releases, plural, one {# autre} other {# autres}}. C’est irréversible depuis ici.',
    },
  },
  'es-ES': {
    review: {
      reason: 'Motivo',
      reasonHint: 'Se registra a tu nombre. Un rechazo le llega íntegro al operador.',
      close: 'Ahora no',
      outcome: {
        done: 'Hecho, y anotado en el registro de auditoría.',
        conflict: 'Alguien se te adelantó. La tabla de abajo ya está al día.',
        refused: 'Esta cuenta no puede hacer eso.',
        failed: 'No salió adelante. No se cambió nada.',
      },
    },
    documentReview: {
      title: 'Revisar este documento',
      verify: 'Verificar',
      reject: 'Rechazar',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'Revisar esta ficha',
      publish: 'Publicar',
      reject: 'Rechazar',
      of: '{title} · {vendor}',
      missing:
        '{count, plural, =0 {Todos los atributos comparables están completos} one {# atributo comparable sin completar} other {# atributos comparables sin completar}}',
    },
    cancelReview: {
      title: 'Cancelar esta salida',
      confirm: 'Cancelar la salida',
      warning:
        'Esto reembolsa {refunds, plural, one {# reserva} other {# reservas}} y libera {releases, plural, one {# más} other {# más}}. Desde aquí no tiene vuelta atrás.',
    },
  },
  'de-DE': {
    review: {
      reason: 'Grund',
      reasonHint: 'Wird unter Ihrem Namen festgehalten. Eine Ablehnung geht vollständig an den Betrieb.',
      close: 'Jetzt nicht',
      outcome: {
        done: 'Erledigt und im Prüfprotokoll festgehalten.',
        conflict: 'Jemand war schneller. Die Tabelle unten ist aktuell.',
        refused: 'Dieses Konto darf das nicht.',
        failed: 'Das ist nicht durchgegangen. Es wurde nichts geändert.',
      },
    },
    documentReview: {
      title: 'Dieses Dokument prüfen',
      verify: 'Bestätigen',
      reject: 'Ablehnen',
      of: '{type} · {vendor}',
    },
    serviceReview: {
      title: 'Dieses Angebot prüfen',
      publish: 'Veröffentlichen',
      reject: 'Ablehnen',
      of: '{title} · {vendor}',
      missing:
        '{count, plural, =0 {Alle vergleichbaren Merkmale sind ausgefüllt} one {# vergleichbares Merkmal fehlt} other {# vergleichbare Merkmale fehlen}}',
    },
    cancelReview: {
      title: 'Diese Ausfahrt absagen',
      confirm: 'Ausfahrt absagen',
      warning:
        'Das erstattet {refunds, plural, one {# Buchung} other {# Buchungen}} und gibt {releases, plural, one {# weitere} other {# weitere}} frei. Von hier aus ist das endgültig.',
    },
  },
};

/**
 * Both interpolation-only strings; nothing to translate in a name and a type
 * separated by a middle dot.
 */
const IDENTICAL = {
  'ar-EG': ['admin.documentReview.of', 'admin.serviceReview.of'],
  'ru-RU': ['admin.documentReview.of', 'admin.serviceReview.of'],
  'it-IT': ['admin.documentReview.of', 'admin.serviceReview.of'],
  'fr-FR': ['admin.documentReview.of', 'admin.serviceReview.of'],
  'es-ES': ['admin.documentReview.of', 'admin.serviceReview.of'],
  'de-DE': ['admin.documentReview.of', 'admin.serviceReview.of'],
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  catalogue.admin = { ...catalogue.admin, ...block };

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`review keys → ${locale}`);
}
