/**
 * Strings for the vendor app's bookings, services and owner-only sections.
 *
 *   node scripts/add-vendor-ops-keys.mjs
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
      subtitle: 'Yours only. Confirm what is waiting, and see what a cancellation reaches.',
      waiting: 'Waiting on you',
      upcoming: 'Coming up',
      heads: '{count, plural, one {# person} other {# people}}',
      confirm: 'Confirm',
      cancelTitle: 'Cancelling the 14:00 boat',
      cancelSub: 'Shown before it happens. Nothing below has run yet.',
      commit: 'Cancel the departure',
      keep: 'Leave it running',
      released:
        'One booking is still awaiting payment, so it is released rather than refunded — nothing was captured.',
    },
    services: {
      title: 'Services',
      subtitle: 'What you offer, and whether a traveller can compare it.',
      comparable: '{count, plural, =0 {Ready to compare} one {# answer missing} other {# answers missing}}',
      inclusions: 'Stated inclusions',
      inclusionsNote:
        'The comparison normalises every inclusion into one price. Filling this in honestly is what makes you rank well, not what costs you.',
      publishOwner: 'Only the owner can publish. Save a draft and it goes to {name}.',
      from: 'From',
    },
    more: {
      title: 'More',
      money: 'Earnings',
      moneySub: 'Gross, commission and fees separately — never one blended figure.',
      nextPayout: 'Next payout {date}',
      staff: 'Team',
      staffSub: 'A lapsed rating cannot be assigned as guide. The calendar refuses it.',
      lapsed: 'Rating lapsed',
      resources: 'Equipment',
      resourcesSub: 'A cylinder inside its hydrostatic window cannot go on a manifest.',
      blocked: 'Blocked until tested',
      dueOn: 'Due {date}',
      ownerOnly: 'Owner only',
    },
  },
  'ar-EG': {
    bookings: {
      title: 'الحجوزات',
      subtitle: 'حجوزاتك بس. أكّد اللي مستني، وشوف الإلغاء بيوصل لفين.',
      waiting: 'مستني منك',
      upcoming: 'جاي',
      heads: '{count, plural, zero {مفيش حد} one {فرد واحد} two {فردان} few {# أفراد} many {# فردًا} other {# فرد}}',
      confirm: 'أكّد',
      cancelTitle: 'إلغاء قارب 14:00',
      cancelSub: 'بيظهر قبل ما يحصل. مفيش حاجة تحت اتنفّذت.',
      commit: 'ألغِ الرحلة',
      keep: 'سيبها شغّالة',
      released: 'حجز واحد لسه مستني الدفع، فبيتفك مش بيترد — مفيش مبلغ اتحصّل.',
    },
    services: {
      title: 'الخدمات',
      subtitle: 'اللي بتقدمه، وهل المسافر يقدر يقارنه.',
      comparable:
        '{count, plural, =0 {جاهزة للمقارنة} zero {جاهزة للمقارنة} one {ناقصها إجابة} two {ناقصها إجابتان} few {ناقصها # إجابات} many {ناقصها # إجابة} other {ناقصها # إجابة}}',
      inclusions: 'المشمولات المعلنة',
      inclusionsNote:
        'المقارنة بتوحّد كل المشمولات في سعر واحد. لما تملاها بأمانة ده اللي بيرفع ترتيبك، مش بيكلفك.',
      publishOwner: 'النشر للمالك بس. احفظ مسودة وهتروح لـ {name}.',
      from: 'من',
    },
    more: {
      title: 'المزيد',
      money: 'الأرباح',
      moneySub: 'الإجمالي والعمولة والرسوم كل واحد لوحده — مش رقم مخلوط.',
      nextPayout: 'التحويل الجاي {date}',
      staff: 'الفريق',
      staffSub: 'التصنيف المنتهي مينفعش يتعيّن كمرشد. التقويم بيرفض.',
      lapsed: 'التصنيف منتهي',
      resources: 'المعدات',
      resourcesSub: 'الأسطوانة اللي داخل موعد اختبار الضغط مينفعش تنزل في كشف.',
      blocked: 'موقوفة لحد الاختبار',
      dueOn: 'الاستحقاق {date}',
      ownerOnly: 'للمالك فقط',
    },
  },
  'de-DE': {
    bookings: {
      title: 'Buchungen',
      subtitle: 'Nur deine. Bestätige, was wartet, und sieh, was eine Absage auslöst.',
      waiting: 'Wartet auf dich',
      upcoming: 'Demnächst',
      heads: '{count, plural, one {# Person} other {# Personen}}',
      confirm: 'Bestätigen',
      cancelTitle: 'Absage des 14:00-Boots',
      cancelSub: 'Wird vorher gezeigt. Nichts davon ist ausgeführt.',
      commit: 'Abfahrt absagen',
      keep: 'Weiterlaufen lassen',
      released:
        'Eine Buchung wartet noch auf Zahlung und wird freigegeben statt erstattet — es wurde nichts eingezogen.',
    },
    services: {
      title: 'Leistungen',
      subtitle: 'Was du anbietest, und ob Reisende es vergleichen können.',
      comparable:
        '{count, plural, =0 {Vergleichsbereit} one {# Angabe fehlt} other {# Angaben fehlen}}',
      inclusions: 'Angegebene Leistungen',
      inclusionsNote:
        'Der Vergleich rechnet alle enthaltenen Leistungen in einen Preis um. Das ehrlich auszufüllen bringt dich nach vorn, es kostet dich nichts.',
      publishOwner: 'Nur der Inhaber veröffentlicht. Speichere einen Entwurf, er geht an {name}.',
      from: 'Ab',
    },
    more: {
      title: 'Mehr',
      money: 'Einnahmen',
      moneySub: 'Brutto, Provision und Gebühren getrennt — nie eine Mischzahl.',
      nextPayout: 'Nächste Auszahlung {date}',
      staff: 'Team',
      staffSub: 'Ein abgelaufenes Brevet kann nicht als Guide eingeteilt werden.',
      lapsed: 'Brevet abgelaufen',
      resources: 'Ausrüstung',
      resourcesSub: 'Eine Flasche in der Prüffrist darf nicht auf die Teilnehmerliste.',
      blocked: 'Gesperrt bis zur Prüfung',
      dueOn: 'Fällig {date}',
      ownerOnly: 'Nur Inhaber',
    },
  },
  'ru-RU': {
    bookings: {
      title: 'Брони',
      subtitle: 'Только ваши. Подтвердите ожидающие и посмотрите, что затронет отмена.',
      waiting: 'Ждёт вас',
      upcoming: 'Скоро',
      heads: '{count, plural, one {# человек} few {# человека} many {# человек} other {# человека}}',
      confirm: 'Подтвердить',
      cancelTitle: 'Отмена лодки в 14:00',
      cancelSub: 'Показано заранее. Ничего ещё не выполнено.',
      commit: 'Отменить выход',
      keep: 'Оставить',
      released:
        'Одна бронь ещё ждёт оплаты — она освобождается, а не возвращается: списания не было.',
    },
    services: {
      title: 'Услуги',
      subtitle: 'Что вы предлагаете и можно ли это сравнить.',
      comparable:
        '{count, plural, =0 {Готово к сравнению} one {не хватает # ответа} few {не хватает # ответов} many {не хватает # ответов} other {не хватает # ответа}}',
      inclusions: 'Что заявлено включённым',
      inclusionsNote:
        'Сравнение сводит все включения к одной цене. Честно заполненное поднимает вас, а не стоит вам.',
      publishOwner: 'Публикует только владелец. Сохраните черновик — он уйдёт к {name}.',
      from: 'От',
    },
    more: {
      title: 'Ещё',
      money: 'Доход',
      moneySub: 'Брутто, комиссия и сборы отдельно — никогда одной суммой.',
      nextPayout: 'Следующая выплата {date}',
      staff: 'Команда',
      staffSub: 'Истёкший рейтинг нельзя назначить гидом. Календарь откажет.',
      lapsed: 'Рейтинг истёк',
      resources: 'Снаряжение',
      resourcesSub: 'Баллон в сроке освидетельствования не попадёт в список.',
      blocked: 'Заблокирован до проверки',
      dueOn: 'Срок {date}',
      ownerOnly: 'Только владелец',
    },
  },
  'it-IT': {
    bookings: {
      title: 'Prenotazioni',
      subtitle: 'Solo le tue. Conferma ciò che attende e guarda cosa tocca un annullamento.',
      waiting: 'In attesa di te',
      upcoming: 'In arrivo',
      heads: '{count, plural, one {# persona} other {# persone}}',
      confirm: 'Conferma',
      cancelTitle: 'Annullare la barca delle 14:00',
      cancelSub: 'Mostrato prima. Nulla qui sotto è stato eseguito.',
      commit: 'Annulla la partenza',
      keep: 'Lasciala attiva',
      released:
        'Una prenotazione attende ancora il pagamento: viene liberata, non rimborsata — nulla è stato incassato.',
    },
    services: {
      title: 'Servizi',
      subtitle: 'Cosa offri e se un viaggiatore può confrontarlo.',
      comparable:
        '{count, plural, =0 {Pronto al confronto} one {manca # risposta} other {mancano # risposte}}',
      inclusions: 'Inclusioni dichiarate',
      inclusionsNote:
        'Il confronto riduce ogni inclusione a un solo prezzo. Compilarlo onestamente ti fa salire, non ti costa.',
      publishOwner: 'Solo il titolare pubblica. Salva una bozza e va a {name}.',
      from: 'Da',
    },
    more: {
      title: 'Altro',
      money: 'Guadagni',
      moneySub: 'Lordo, commissione e spese separati — mai una cifra unica.',
      nextPayout: 'Prossimo pagamento {date}',
      staff: 'Squadra',
      staffSub: 'Un brevetto scaduto non può essere assegnato come guida.',
      lapsed: 'Brevetto scaduto',
      resources: 'Attrezzatura',
      resourcesSub: 'Una bombola in scadenza di collaudo non va in elenco.',
      blocked: 'Bloccata fino al collaudo',
      dueOn: 'Scade {date}',
      ownerOnly: 'Solo titolare',
    },
  },
  'fr-FR': {
    bookings: {
      title: 'Réservations',
      subtitle: 'Les vôtres seulement. Confirmez ce qui attend et voyez ce qu’une annulation touche.',
      waiting: 'En attente de vous',
      upcoming: 'À venir',
      heads: '{count, plural, one {# personne} other {# personnes}}',
      confirm: 'Confirmer',
      cancelTitle: 'Annuler le bateau de 14:00',
      cancelSub: 'Montré avant. Rien ci-dessous n’a été exécuté.',
      commit: 'Annuler le départ',
      keep: 'Le maintenir',
      released:
        'Une réservation attend encore le paiement : elle est libérée et non remboursée — rien n’a été encaissé.',
    },
    services: {
      title: 'Prestations',
      subtitle: 'Ce que vous proposez, et si un voyageur peut le comparer.',
      comparable:
        '{count, plural, =0 {Prêt à comparer} one {# réponse manquante} other {# réponses manquantes}}',
      inclusions: 'Inclusions déclarées',
      inclusionsNote:
        'La comparaison ramène chaque inclusion à un seul prix. Le remplir honnêtement vous fait monter, cela ne vous coûte rien.',
      publishOwner: 'Seul le propriétaire publie. Enregistrez un brouillon, il ira à {name}.',
      from: 'À partir de',
    },
    more: {
      title: 'Plus',
      money: 'Revenus',
      moneySub: 'Brut, commission et frais séparément — jamais un chiffre unique.',
      nextPayout: 'Prochain versement {date}',
      staff: 'Équipe',
      staffSub: 'Un niveau expiré ne peut pas être affecté comme moniteur.',
      lapsed: 'Niveau expiré',
      resources: 'Matériel',
      resourcesSub: 'Une bouteille en période de requalification ne part pas en liste.',
      blocked: 'Bloquée jusqu’au contrôle',
      dueOn: 'Échéance {date}',
      ownerOnly: 'Propriétaire seulement',
    },
  },
  'es-ES': {
    bookings: {
      title: 'Reservas',
      subtitle: 'Solo las tuyas. Confirma lo que espera y mira a qué afecta una cancelación.',
      waiting: 'Esperándote',
      upcoming: 'Próximamente',
      heads: '{count, plural, one {# persona} other {# personas}}',
      confirm: 'Confirmar',
      cancelTitle: 'Cancelar el barco de las 14:00',
      cancelSub: 'Se muestra antes. Nada de lo de abajo se ha ejecutado.',
      commit: 'Cancelar la salida',
      keep: 'Mantenerla',
      released:
        'Una reserva sigue esperando el pago: se libera en vez de reembolsarse — no se cobró nada.',
    },
    services: {
      title: 'Servicios',
      subtitle: 'Lo que ofreces y si un viajero puede compararlo.',
      comparable:
        '{count, plural, =0 {Listo para comparar} one {falta # respuesta} other {faltan # respuestas}}',
      inclusions: 'Inclusiones declaradas',
      inclusionsNote:
        'La comparación reduce cada inclusión a un precio único. Rellenarlo con honestidad te sube, no te cuesta.',
      publishOwner: 'Solo el propietario publica. Guarda un borrador y le llegará a {name}.',
      from: 'Desde',
    },
    more: {
      title: 'Más',
      money: 'Ingresos',
      moneySub: 'Bruto, comisión y gastos por separado — nunca una cifra mezclada.',
      nextPayout: 'Próximo pago {date}',
      staff: 'Equipo',
      staffSub: 'Una titulación caducada no puede asignarse como guía.',
      lapsed: 'Titulación caducada',
      resources: 'Equipo',
      resourcesSub: 'Una botella en periodo de prueba no entra en una lista.',
      blocked: 'Bloqueada hasta la prueba',
      dueOn: 'Vence {date}',
      ownerOnly: 'Solo propietario',
    },
  },
};

/** "Team" is the word in German too. */
const IDENTICAL = { 'de-DE': ['vendor.more.staff'] };

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  Object.assign(catalogue.vendor, block);

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor ops keys → ${locale}`);
}
