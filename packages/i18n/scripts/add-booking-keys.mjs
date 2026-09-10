/**
 * Adds the bookings and cancellation-cascade strings to all seven catalogues.
 *
 * The ten `booking_status` values and the six `participant_kind` values get a
 * key each — they are db enums, and nobody should read `cancelledByWeather`
 * on a screen.
 *
 *   node scripts/add-booking-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    bookings: {
      title: 'Bookings',
      subtitle: 'Every booking on the platform, and what the weather is about to do to them.',
      all: 'All bookings',
      risk: 'Wind above this operator’s limit',
      riskSub:
        '{forecast} kt forecast against this operator’s {limit} kt limit for {service}, {when}. Cancelling is one operation, and it reaches further than this departure.',
      cascadeTitle: 'What cancelling touches',
      cascadeSub:
        'Shown before it happens, not after. Nothing below has run yet — this is the preview.',
      commit: 'Cancel the departure',
      keep: 'Leave it running',
      seats: '{used} of {total} seats',
      chargeableNote:
        'Infants and accompanying instructors hold a seat without being charged, so the manifest and the invoice never match.',
    },
    cascade: {
      bookings: 'Bookings cancelled',
      transfer: 'Transfer that fed it',
      refunds: 'Refunds opened',
      ledger: 'Ledger entries written',
      notifications: 'People told',
      releasedNote:
        'One booking is still awaiting payment, so it is released rather than refunded — nothing was captured to return.',
    },
    bookingStatus: {
      pendingPayment: 'Awaiting payment',
      confirmed: 'Confirmed',
      awaitingVendor: 'Awaiting operator',
      cancelledByTraveler: 'Cancelled by traveller',
      cancelledByVendor: 'Cancelled by operator',
      cancelledByWeather: 'Cancelled by weather',
      noShow: 'No show',
      completed: 'Completed',
      refunded: 'Refunded',
      disputed: 'Disputed',
    },
    party: {
      adult: 'Adult',
      child: 'Child',
      infant: 'Infant',
      student: 'Student',
      resident: 'Resident',
      instructor: 'Instructor',
    },
    col4: {
      ref: 'Reference',
      traveler: 'Traveller',
      party: 'Party',
      departs: 'Departs',
      total: 'Total',
    },
  },
  'ar-EG': {
    bookings: {
      title: 'الحجوزات',
      subtitle: 'كل الحجوزات على المنصة، وإيه اللي الجو على وشك يعمله فيها.',
      all: 'كل الحجوزات',
      risk: 'الريح أعلى من حد المركز',
      riskSub:
        'الرياح المتوقعة {forecast} عقدة والحد {limit} عقدة لـ {service}، {when}. الإلغاء عملية واحدة، لكنها بتوصل لأبعد من الرحلة دي.',
      cascadeTitle: 'الإلغاء بيمس إيه',
      cascadeSub: 'بيظهر قبل ما يحصل، مش بعده. مفيش حاجة تحت اتنفّذت — دي معاينة.',
      commit: 'ألغِ الرحلة',
      keep: 'سيبها شغّالة',
      seats: '{used} من {total} مقعد',
      chargeableNote:
        'الرضّع والمدربون المرافقون بياخدوا مقعد من غير ما يتحاسبوا، فكشف الركاب والفاتورة عمرهم ما بيتطابقوا.',
    },
    cascade: {
      bookings: 'حجوزات هتتلغي',
      transfer: 'التوصيلة اللي كانت مغذياها',
      refunds: 'مبالغ هتترد',
      ledger: 'قيود في الدفتر',
      notifications: 'ناس هيتبلغوا',
      releasedNote:
        'حجز واحد لسه مستني الدفع، فبيتفك مش بيترد — مفيش مبلغ اتحصّل أصلاً عشان يرجع.',
    },
    bookingStatus: {
      pendingPayment: 'في انتظار الدفع',
      confirmed: 'مؤكّد',
      awaitingVendor: 'في انتظار المركز',
      cancelledByTraveler: 'ألغاه المسافر',
      cancelledByVendor: 'ألغاه المركز',
      cancelledByWeather: 'اتلغى بسبب الجو',
      noShow: 'لم يحضر',
      completed: 'تمّت',
      refunded: 'اترد',
      disputed: 'متنازع عليه',
    },
    party: {
      adult: 'بالغ',
      child: 'طفل',
      infant: 'رضيع',
      student: 'طالب',
      resident: 'مقيم',
      instructor: 'مدرب',
    },
    col4: {
      ref: 'المرجع',
      traveler: 'المسافر',
      party: 'المجموعة',
      departs: 'الانطلاق',
      total: 'الإجمالي',
    },
  },
  'de-DE': {
    bookings: {
      title: 'Buchungen',
      subtitle: 'Alle Buchungen der Plattform — und was das Wetter gleich mit ihnen macht.',
      all: 'Alle Buchungen',
      risk: 'Wind über dem Limit dieses Anbieters',
      riskSub:
        '{forecast} kn erwartet bei einem Limit von {limit} kn für {service}, {when}. Die Absage ist ein Vorgang, reicht aber weiter als diese Abfahrt.',
      cascadeTitle: 'Was eine Absage auslöst',
      cascadeSub:
        'Wird vorher gezeigt, nicht hinterher. Nichts davon ist ausgeführt — das ist die Vorschau.',
      commit: 'Abfahrt absagen',
      keep: 'Weiterlaufen lassen',
      seats: '{used} von {total} Plätzen',
      chargeableNote:
        'Kleinkinder und begleitende Guides belegen einen Platz, ohne berechnet zu werden — Teilnehmerliste und Rechnung stimmen daher nie überein.',
    },
    cascade: {
      bookings: 'Stornierte Buchungen',
      transfer: 'Zubringer dazu',
      refunds: 'Eröffnete Erstattungen',
      ledger: 'Geschriebene Buchungssätze',
      notifications: 'Benachrichtigte Personen',
      releasedNote:
        'Eine Buchung wartet noch auf Zahlung und wird freigegeben statt erstattet — es wurde nichts eingezogen.',
    },
    bookingStatus: {
      pendingPayment: 'Zahlung ausstehend',
      confirmed: 'Bestätigt',
      awaitingVendor: 'Wartet auf Anbieter',
      cancelledByTraveler: 'Vom Reisenden storniert',
      cancelledByVendor: 'Vom Anbieter storniert',
      cancelledByWeather: 'Wetterbedingt abgesagt',
      noShow: 'Nicht erschienen',
      completed: 'Abgeschlossen',
      refunded: 'Erstattet',
      disputed: 'Strittig',
    },
    party: {
      adult: 'Erwachsen',
      child: 'Kind',
      infant: 'Kleinkind',
      student: 'Studierend',
      resident: 'Ansässig',
      instructor: 'Guide',
    },
    col4: {
      ref: 'Referenz',
      traveler: 'Reisende:r',
      party: 'Gruppe',
      departs: 'Abfahrt',
      total: 'Summe',
    },
  },
  'ru-RU': {
    bookings: {
      title: 'Брони',
      subtitle: 'Все брони платформы — и что с ними вот-вот сделает погода.',
      all: 'Все брони',
      risk: 'Ветер выше предела этого оператора',
      riskSub:
        'Прогноз {forecast} уз при пределе {limit} уз для {service}, {when}. Отмена — одна операция, но она затрагивает больше, чем этот выход.',
      cascadeTitle: 'Что затрагивает отмена',
      cascadeSub: 'Показано до, а не после. Ничего ещё не выполнено — это предпросмотр.',
      commit: 'Отменить выход',
      keep: 'Оставить как есть',
      seats: '{used} из {total} мест',
      chargeableNote:
        'Младенцы и сопровождающие инструкторы занимают место, но не оплачиваются, поэтому список и счёт никогда не совпадают.',
    },
    cascade: {
      bookings: 'Отменено броней',
      transfer: 'Трансфер к нему',
      refunds: 'Открыто возвратов',
      ledger: 'Записей в книге',
      notifications: 'Уведомлено людей',
      releasedNote:
        'Одна бронь ещё ждёт оплаты — она освобождается, а не возвращается: списания не было.',
    },
    bookingStatus: {
      pendingPayment: 'Ожидает оплаты',
      confirmed: 'Подтверждена',
      awaitingVendor: 'Ожидает оператора',
      cancelledByTraveler: 'Отменена путешественником',
      cancelledByVendor: 'Отменена оператором',
      cancelledByWeather: 'Отменена из-за погоды',
      noShow: 'Не явился',
      completed: 'Завершена',
      refunded: 'Возвращена',
      disputed: 'Оспаривается',
    },
    party: {
      adult: 'Взрослый',
      child: 'Ребёнок',
      infant: 'Младенец',
      student: 'Студент',
      resident: 'Резидент',
      instructor: 'Инструктор',
    },
    col4: {
      ref: 'Номер',
      traveler: 'Путешественник',
      party: 'Группа',
      departs: 'Выход',
      total: 'Итого',
    },
  },
  'it-IT': {
    bookings: {
      title: 'Prenotazioni',
      subtitle: 'Tutte le prenotazioni della piattaforma, e cosa sta per farne il meteo.',
      all: 'Tutte le prenotazioni',
      risk: 'Vento oltre il limite di questo operatore',
      riskSub:
        'Previsti {forecast} kt contro un limite di {limit} kt per {service}, {when}. Annullare è una sola operazione, ma arriva oltre questa partenza.',
      cascadeTitle: "Cosa tocca l'annullamento",
      cascadeSub: 'Mostrato prima, non dopo. Nulla qui sotto è stato eseguito — è l’anteprima.',
      commit: 'Annulla la partenza',
      keep: 'Lasciala attiva',
      seats: '{used} di {total} posti',
      chargeableNote:
        'Neonati e istruttori accompagnatori occupano un posto senza essere addebitati: lista e fattura non coincidono mai.',
    },
    cascade: {
      bookings: 'Prenotazioni annullate',
      transfer: 'Transfer collegato',
      refunds: 'Rimborsi aperti',
      ledger: 'Scritture contabili',
      notifications: 'Persone avvisate',
      releasedNote:
        'Una prenotazione attende ancora il pagamento: viene liberata, non rimborsata — nulla è stato incassato.',
    },
    bookingStatus: {
      pendingPayment: 'In attesa di pagamento',
      confirmed: 'Confermata',
      awaitingVendor: 'In attesa dell’operatore',
      cancelledByTraveler: 'Annullata dal viaggiatore',
      cancelledByVendor: 'Annullata dall’operatore',
      cancelledByWeather: 'Annullata per meteo',
      noShow: 'Non presentato',
      completed: 'Completata',
      refunded: 'Rimborsata',
      disputed: 'Contestata',
    },
    party: {
      adult: 'Adulto',
      child: 'Bambino',
      infant: 'Neonato',
      student: 'Studente',
      resident: 'Residente',
      instructor: 'Istruttore',
    },
    col4: {
      ref: 'Riferimento',
      traveler: 'Viaggiatore',
      party: 'Gruppo',
      departs: 'Partenza',
      total: 'Totale',
    },
  },
  'fr-FR': {
    bookings: {
      title: 'Réservations',
      subtitle: 'Toutes les réservations de la plateforme, et ce que la météo va leur faire.',
      all: 'Toutes les réservations',
      risk: 'Vent au-dessus de la limite de cet opérateur',
      riskSub:
        '{forecast} nd prévus contre une limite de {limit} nd pour {service}, {when}. Annuler est une seule opération, mais elle va plus loin que ce départ.',
      cascadeTitle: 'Ce que l’annulation touche',
      cascadeSub: 'Montré avant, pas après. Rien ci-dessous n’a été exécuté — c’est l’aperçu.',
      commit: 'Annuler le départ',
      keep: 'Le maintenir',
      seats: '{used} sur {total} places',
      chargeableNote:
        'Les nourrissons et les moniteurs accompagnants occupent une place sans être facturés : la liste et la facture ne coïncident jamais.',
    },
    cascade: {
      bookings: 'Réservations annulées',
      transfer: 'Transfert associé',
      refunds: 'Remboursements ouverts',
      ledger: 'Écritures comptables',
      notifications: 'Personnes prévenues',
      releasedNote:
        'Une réservation attend encore le paiement : elle est libérée et non remboursée — rien n’a été encaissé.',
    },
    bookingStatus: {
      pendingPayment: 'En attente de paiement',
      confirmed: 'Confirmée',
      awaitingVendor: 'En attente de l’opérateur',
      cancelledByTraveler: 'Annulée par le voyageur',
      cancelledByVendor: 'Annulée par l’opérateur',
      cancelledByWeather: 'Annulée pour météo',
      noShow: 'Absent',
      completed: 'Terminée',
      refunded: 'Remboursée',
      disputed: 'Contestée',
    },
    party: {
      adult: 'Adulte',
      child: 'Enfant',
      infant: 'Nourrisson',
      student: 'Étudiant',
      resident: 'Résident',
      instructor: 'Moniteur',
    },
    col4: {
      ref: 'Référence',
      traveler: 'Voyageur',
      party: 'Groupe',
      departs: 'Départ',
      total: 'Total',
    },
  },
  'es-ES': {
    bookings: {
      title: 'Reservas',
      subtitle: 'Todas las reservas de la plataforma, y lo que el tiempo está a punto de hacerles.',
      all: 'Todas las reservas',
      risk: 'Viento por encima del límite de este operador',
      riskSub:
        'Se prevén {forecast} kt frente a un límite de {limit} kt para {service}, {when}. Cancelar es una sola operación, pero llega más lejos que esta salida.',
      cascadeTitle: 'A qué afecta la cancelación',
      cascadeSub: 'Se muestra antes, no después. Nada de lo de abajo se ha ejecutado — es la vista previa.',
      commit: 'Cancelar la salida',
      keep: 'Mantenerla',
      seats: '{used} de {total} plazas',
      chargeableNote:
        'Los bebés y los instructores acompañantes ocupan plaza sin cobrarse, así que la lista y la factura nunca coinciden.',
    },
    cascade: {
      bookings: 'Reservas canceladas',
      transfer: 'Traslado asociado',
      refunds: 'Reembolsos abiertos',
      ledger: 'Asientos contables',
      notifications: 'Personas avisadas',
      releasedNote:
        'Una reserva sigue esperando el pago: se libera en vez de reembolsarse — no se cobró nada.',
    },
    bookingStatus: {
      pendingPayment: 'Pendiente de pago',
      confirmed: 'Confirmada',
      awaitingVendor: 'Esperando al operador',
      cancelledByTraveler: 'Cancelada por el viajero',
      cancelledByVendor: 'Cancelada por el operador',
      cancelledByWeather: 'Cancelada por el tiempo',
      noShow: 'No se presentó',
      completed: 'Completada',
      refunded: 'Reembolsada',
      disputed: 'En disputa',
    },
    party: {
      adult: 'Adulto',
      child: 'Niño',
      infant: 'Bebé',
      student: 'Estudiante',
      resident: 'Residente',
      instructor: 'Instructor',
    },
    col4: {
      ref: 'Referencia',
      traveler: 'Viajero',
      party: 'Grupo',
      departs: 'Salida',
      total: 'Total',
    },
  },
};

/** Genuinely the same word as the source. */
const IDENTICAL = {
  'fr-FR': ['admin.col4.total'],
  'es-ES': ['admin.col4.total', 'admin.party.instructor'],
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  Object.assign(catalogue.admin, block);

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`booking keys → ${locale}`);
}
