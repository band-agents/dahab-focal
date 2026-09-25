/**
 * The vendor app's strings, in all seven locales.
 *
 * Arabic is the primary language on this surface rather than one of seven: a
 * Dahab dive centre's staff work in it. So the Arabic here is written first
 * and the rest follow it, which is the reverse of the traveller app.
 *
 *   node scripts/add-vendor-app-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    tabs: { today: 'Today', bookings: 'Bookings', services: 'Services', more: 'More' },
    today: {
      greeting: 'Morning, {name}.',
      subtitle: 'Three departures. One needs a decision before the wind picks up.',
      conditions: 'Dahab now',
      next: 'Next four hours',
      manifest: 'Manifest',
      seats: '{used} of {total}',
      billed: '{capacity} aboard · {chargeable} billed',
      guide: 'Guide {name}',
      nothing: 'Nothing else today.',
    },
    outstanding: {
      waivers: '{count, plural, =0 {All waivers signed} one {# waiver outstanding} other {# waivers outstanding}}',
      certifications:
        '{count, plural, =0 {Certifications check out} one {# certification short} other {# certifications short}}',
      pickups: '{count, plural, =0 {Everyone collected} one {# not collected} other {# not collected}}',
    },
    person: {
      certShort: 'Short of the minimum for this site',
      noWaiver: 'Waiver not signed',
      medical: 'Medical note — read before the briefing',
      notPickedUp: 'Not collected',
      collected: 'Collected',
      noCert: 'No certification needed',
    },
    wind: {
      title: 'Wind above your limit',
      body: '{forecast} kt forecast against your {limit} kt limit. Cancelling reaches the transfer that feeds it and opens the refunds.',
      review: 'See what cancelling touches',
    },
    offline: {
      title: 'Ready for the Blue Hole road',
      body: 'Signal drops most mornings between Assalah and the rim. {vouchers} vouchers, {points} meeting points and {manifests} manifests are on this phone.',
    },
    role: {
      owner: 'Owner',
      staff: 'Guide',
      staffLimit: 'Money, pricing and staff are the owner’s. Ask {name}.',
    },
    action: { checkIn: 'Check in', openManifest: 'Open manifest', message: 'Message everyone' },
  },
  'ar-EG': {
    tabs: { today: 'اليوم', bookings: 'الحجوزات', services: 'الخدمات', more: 'المزيد' },
    today: {
      greeting: 'صباح الخير يا {name}.',
      subtitle: 'تلات رحلات. واحدة محتاجة قرار قبل ما الريح تزيد.',
      conditions: 'دهب دلوقتي',
      next: 'الأربع ساعات الجاية',
      manifest: 'كشف الركاب',
      seats: '{used} من {total}',
      billed: '{capacity} على المركب · {chargeable} محاسَب عليهم',
      guide: 'المرشد {name}',
      nothing: 'مفيش حاجة تانية النهاردة.',
    },
    outstanding: {
      waivers:
        '{count, plural, =0 {كل الإقرارات متوقّعة} zero {كل الإقرارات متوقّعة} one {إقرار واحد ناقص} two {إقراران ناقصان} few {# إقرارات ناقصة} many {# إقرارًا ناقصًا} other {# إقرار ناقص}}',
      certifications:
        '{count, plural, =0 {الشهادات تمام} zero {الشهادات تمام} one {شهادة واحدة ناقصة} two {شهادتان ناقصتان} few {# شهادات ناقصة} many {# شهادة ناقصة} other {# شهادة ناقصة}}',
      pickups:
        '{count, plural, =0 {الكل اتجمع} zero {الكل اتجمع} one {واحد لسه متجمعش} two {اتنين لسه متجمعوش} few {# لسه متجمعوش} many {# لسه متجمعوش} other {# لسه متجمعوش}}',
    },
    person: {
      certShort: 'أقل من الحد الأدنى للموقع ده',
      noWaiver: 'الإقرار مش موقّع',
      medical: 'ملاحظة طبية — اقراها قبل البريفنج',
      notPickedUp: 'لسه متجمعش',
      collected: 'اتجمع',
      noCert: 'مش محتاج شهادة',
    },
    wind: {
      title: 'الريح فوق الحد بتاعك',
      body: 'المتوقع {forecast} عقدة والحد بتاعك {limit} عقدة. الإلغاء بيوصل للتوصيلة اللي بتغذيها وبيفتح الاستردادات.',
      review: 'شوف الإلغاء بيمس إيه',
    },
    offline: {
      title: 'جاهز لطريق البلو هول',
      body: 'الشبكة بتقطع أغلب الصباح بين العسلة والحافة. {vouchers} قسايم و{points} نقط لقاء و{manifests} كشوف محفوظة على التليفون.',
    },
    role: {
      owner: 'المالك',
      staff: 'مرشد',
      staffLimit: 'الفلوس والتسعير والفريق من حق المالك. اسأل {name}.',
    },
    action: { checkIn: 'تسجيل حضور', openManifest: 'افتح الكشف', message: 'راسل الكل' },
  },
  'de-DE': {
    tabs: { today: 'Heute', bookings: 'Buchungen', services: 'Leistungen', more: 'Mehr' },
    today: {
      greeting: 'Morgen, {name}.',
      subtitle: 'Drei Abfahrten. Eine braucht eine Entscheidung, bevor der Wind auffrischt.',
      conditions: 'Dahab jetzt',
      next: 'Nächste vier Stunden',
      manifest: 'Teilnehmerliste',
      seats: '{used} von {total}',
      billed: '{capacity} an Bord · {chargeable} berechnet',
      guide: 'Guide {name}',
      nothing: 'Heute sonst nichts.',
    },
    outstanding: {
      waivers:
        '{count, plural, =0 {Alle Erklärungen unterschrieben} one {# Erklärung offen} other {# Erklärungen offen}}',
      certifications:
        '{count, plural, =0 {Brevets in Ordnung} one {# Brevet reicht nicht} other {# Brevets reichen nicht}}',
      pickups:
        '{count, plural, =0 {Alle abgeholt} one {# nicht abgeholt} other {# nicht abgeholt}}',
    },
    person: {
      certShort: 'Unter dem Minimum für diesen Platz',
      noWaiver: 'Erklärung nicht unterschrieben',
      medical: 'Ärztlicher Hinweis — vor dem Briefing lesen',
      notPickedUp: 'Nicht abgeholt',
      collected: 'Abgeholt',
      noCert: 'Kein Brevet nötig',
    },
    wind: {
      title: 'Wind über deinem Limit',
      body: '{forecast} kn erwartet bei deinem Limit von {limit} kn. Eine Absage erreicht den Zubringer und eröffnet die Erstattungen.',
      review: 'Folgen der Absage ansehen',
    },
    offline: {
      title: 'Bereit für die Blue-Hole-Piste',
      body: 'Zwischen Assalah und dem Rand fällt morgens meist das Netz aus. {vouchers} Voucher, {points} Treffpunkte und {manifests} Listen liegen auf diesem Handy.',
    },
    role: {
      owner: 'Inhaber',
      staff: 'Guide',
      staffLimit: 'Finanzen, Preise und Team gehören dem Inhaber. Frag {name}.',
    },
    action: { checkIn: 'Einchecken', openManifest: 'Liste öffnen', message: 'Alle anschreiben' },
  },
  'ru-RU': {
    tabs: { today: 'Сегодня', bookings: 'Брони', services: 'Услуги', more: 'Ещё' },
    today: {
      greeting: 'Доброе утро, {name}.',
      subtitle: 'Три выхода. По одному нужно решить до того, как поднимется ветер.',
      conditions: 'Дахаб сейчас',
      next: 'Ближайшие четыре часа',
      manifest: 'Список участников',
      seats: '{used} из {total}',
      billed: '{capacity} на борту · {chargeable} оплачено',
      guide: 'Гид {name}',
      nothing: 'Больше на сегодня ничего.',
    },
    outstanding: {
      waivers:
        '{count, plural, =0 {Все расписки подписаны} one {# расписка не подписана} few {# расписки не подписаны} many {# расписок не подписано} other {# расписки не подписаны}}',
      certifications:
        '{count, plural, =0 {С сертификатами всё в порядке} one {# сертификата не хватает} few {# сертификатов не хватает} many {# сертификатов не хватает} other {# сертификата не хватает}}',
      pickups:
        '{count, plural, =0 {Всех забрали} one {# не забрали} few {# не забрали} many {# не забрали} other {# не забрали}}',
    },
    person: {
      certShort: 'Ниже минимума для этого места',
      noWaiver: 'Расписка не подписана',
      medical: 'Медицинская пометка — прочитать до брифинга',
      notPickedUp: 'Не забрали',
      collected: 'Забрали',
      noCert: 'Сертификат не нужен',
    },
    wind: {
      title: 'Ветер выше вашего предела',
      body: 'Прогноз {forecast} уз при вашем пределе {limit} уз. Отмена затрагивает трансфер и открывает возвраты.',
      review: 'Посмотреть, что затронет отмена',
    },
    offline: {
      title: 'Готово к дороге на Блю-Хоул',
      body: 'По утрам между Асалой и краем связь пропадает. {vouchers} ваучера, {points} точки встречи и {manifests} списка сохранены на этом телефоне.',
    },
    role: {
      owner: 'Владелец',
      staff: 'Гид',
      staffLimit: 'Финансы, цены и команда — на владельце. Спросите {name}.',
    },
    action: { checkIn: 'Отметить', openManifest: 'Открыть список', message: 'Написать всем' },
  },
  'it-IT': {
    tabs: { today: 'Oggi', bookings: 'Prenotazioni', services: 'Servizi', more: 'Altro' },
    today: {
      greeting: 'Buongiorno, {name}.',
      subtitle: 'Tre partenze. Una richiede una decisione prima che rinforzi il vento.',
      conditions: 'Dahab adesso',
      next: 'Prossime quattro ore',
      manifest: 'Elenco partecipanti',
      seats: '{used} su {total}',
      billed: '{capacity} a bordo · {chargeable} addebitati',
      guide: 'Guida {name}',
      nothing: 'Per oggi nient’altro.',
    },
    outstanding: {
      waivers:
        '{count, plural, =0 {Tutte le liberatorie firmate} one {# liberatoria mancante} other {# liberatorie mancanti}}',
      certifications:
        '{count, plural, =0 {Brevetti a posto} one {# brevetto insufficiente} other {# brevetti insufficienti}}',
      pickups: '{count, plural, =0 {Tutti raccolti} one {# non raccolto} other {# non raccolti}}',
    },
    person: {
      certShort: 'Sotto il minimo per questo sito',
      noWaiver: 'Liberatoria non firmata',
      medical: 'Nota medica — leggere prima del briefing',
      notPickedUp: 'Non raccolto',
      collected: 'Raccolto',
      noCert: 'Nessun brevetto richiesto',
    },
    wind: {
      title: 'Vento oltre il tuo limite',
      body: 'Previsti {forecast} kt contro il tuo limite di {limit} kt. Annullare tocca il transfer collegato e apre i rimborsi.',
      review: 'Vedi cosa tocca l’annullamento',
    },
    offline: {
      title: 'Pronto per la strada del Blue Hole',
      body: 'Tra Assalah e il bordo il segnale cade quasi ogni mattina. {vouchers} voucher, {points} punti d’incontro e {manifests} elenchi sono su questo telefono.',
    },
    role: {
      owner: 'Titolare',
      staff: 'Guida',
      staffLimit: 'Contabilità, prezzi e personale sono del titolare. Chiedi a {name}.',
    },
    action: { checkIn: 'Check-in', openManifest: 'Apri elenco', message: 'Scrivi a tutti' },
  },
  'fr-FR': {
    tabs: { today: "Aujourd'hui", bookings: 'Réservations', services: 'Prestations', more: 'Plus' },
    today: {
      greeting: 'Bonjour, {name}.',
      subtitle: 'Trois départs. Un demande une décision avant que le vent forcisse.',
      conditions: 'Dahab maintenant',
      next: 'Quatre prochaines heures',
      manifest: 'Liste des participants',
      seats: '{used} sur {total}',
      billed: '{capacity} à bord · {chargeable} facturés',
      guide: 'Guide {name}',
      nothing: 'Rien d’autre aujourd’hui.',
    },
    outstanding: {
      waivers:
        '{count, plural, =0 {Toutes les décharges signées} one {# décharge manquante} other {# décharges manquantes}}',
      certifications:
        '{count, plural, =0 {Niveaux conformes} one {# niveau insuffisant} other {# niveaux insuffisants}}',
      pickups: '{count, plural, =0 {Tout le monde récupéré} one {# non récupéré} other {# non récupérés}}',
    },
    person: {
      certShort: 'En dessous du minimum pour ce site',
      noWaiver: 'Décharge non signée',
      medical: 'Note médicale — à lire avant le briefing',
      notPickedUp: 'Non récupéré',
      collected: 'Récupéré',
      noCert: 'Aucun niveau requis',
    },
    wind: {
      title: 'Vent au-dessus de votre limite',
      body: '{forecast} nd prévus contre votre limite de {limit} nd. Annuler atteint le transfert associé et ouvre les remboursements.',
      review: 'Voir ce que l’annulation touche',
    },
    offline: {
      title: 'Prêt pour la route du Blue Hole',
      body: 'Entre Assalah et le bord, le réseau tombe presque chaque matin. {vouchers} bons, {points} points de rendez-vous et {manifests} listes sont sur ce téléphone.',
    },
    role: {
      owner: 'Propriétaire',
      staff: 'Moniteur',
      staffLimit: 'Finances, tarifs et équipe sont au propriétaire. Demandez à {name}.',
    },
    action: { checkIn: 'Pointer', openManifest: 'Ouvrir la liste', message: 'Écrire à tous' },
  },
  'es-ES': {
    tabs: { today: 'Hoy', bookings: 'Reservas', services: 'Servicios', more: 'Más' },
    today: {
      greeting: 'Buenos días, {name}.',
      subtitle: 'Tres salidas. Una necesita una decisión antes de que suba el viento.',
      conditions: 'Dahab ahora',
      next: 'Próximas cuatro horas',
      manifest: 'Lista de participantes',
      seats: '{used} de {total}',
      billed: '{capacity} a bordo · {chargeable} cobrados',
      guide: 'Guía {name}',
      nothing: 'Nada más por hoy.',
    },
    outstanding: {
      waivers:
        '{count, plural, =0 {Todos los consentimientos firmados} one {# consentimiento pendiente} other {# consentimientos pendientes}}',
      certifications:
        '{count, plural, =0 {Titulaciones correctas} one {# titulación insuficiente} other {# titulaciones insuficientes}}',
      pickups: '{count, plural, =0 {Todos recogidos} one {# sin recoger} other {# sin recoger}}',
    },
    person: {
      certShort: 'Por debajo del mínimo para este punto',
      noWaiver: 'Consentimiento sin firmar',
      medical: 'Nota médica — leer antes del briefing',
      notPickedUp: 'Sin recoger',
      collected: 'Recogido',
      noCert: 'No requiere titulación',
    },
    wind: {
      title: 'Viento por encima de tu límite',
      body: 'Se prevén {forecast} kt frente a tu límite de {limit} kt. Cancelar alcanza al traslado que la alimenta y abre los reembolsos.',
      review: 'Ver a qué afecta cancelar',
    },
    offline: {
      title: 'Listo para la pista del Blue Hole',
      body: 'Entre Assalah y el borde el móvil se cae casi cada mañana. {vouchers} bonos, {points} puntos de encuentro y {manifests} listas están en este teléfono.',
    },
    role: {
      owner: 'Propietario',
      staff: 'Guía',
      staffLimit: 'Finanzas, precios y equipo son del propietario. Pregunta a {name}.',
    },
    action: { checkIn: 'Registrar', openManifest: 'Abrir lista', message: 'Escribir a todos' },
  },
};

/** "Guide" is the word in German and French too; so is "Guide" as a role. */
const IDENTICAL = {
  'de-DE': ['vendor.today.guide', 'vendor.role.staff'],
  'fr-FR': ['vendor.today.guide'],
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.vendor = block;

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor app keys → ${locale}`);
}
