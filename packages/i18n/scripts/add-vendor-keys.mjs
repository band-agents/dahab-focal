/**
 * Adds the vendors and expiry screens' strings to all seven catalogues.
 *
 * Document types and vendor statuses are the db's own enum values, so they get
 * one key each rather than being humanised at the call site — an admin reading
 * an Arabic console should not see `publicLiabilityInsurance`.
 *
 *   node scripts/add-vendor-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    vendors: {
      title: 'Operators',
      subtitle: 'Everyone licensed to run in Dahab, and what the platform still owes them.',
      queue: 'Verification queue',
      queueSub: 'Documents waiting on us. A rejection has to say why.',
      roster: 'The roster',
      none: 'No operator matches this filter.',
      noneQueue: 'Nothing waiting. Every document has been answered.',
    },
    expiryPage: {
      title: 'The expiry board',
      subtitle: 'Everything that lapses, across every operator, before it lapses.',
      none: 'Nothing expires in this window.',
      blocksNote: 'Stops the operator publishing the moment it lapses.',
    },
    vendorStatus: {
      applied: 'Applied',
      inReview: 'In review',
      active: 'Active',
      suspended: 'Suspended',
      closed: 'Closed',
    },
    docType: {
      commercialRegister: 'Commercial register',
      taxCard: 'Tax card',
      operatingPermit: 'Operating permit',
      cdwsLicence: 'CDWS licence',
      diveAgencyAffiliation: 'Dive agency affiliation',
      publicLiabilityInsurance: 'Public liability insurance',
      boatLicence: 'Boat licence',
      vehicleLicence: 'Vehicle licence',
      other: 'Other',
    },
    verify: {
      pending: 'Not supplied',
      inReview: 'In review',
      verified: 'Verified',
      rejected: 'Rejected',
      expired: 'Expired',
    },
    col2: {
      area: 'Area',
      services: 'Services',
      rating: 'Rating',
      staff: 'Staff',
      issuer: 'Issued by',
      band: 'Due',
    },
  },
  'ar-EG': {
    vendors: {
      title: 'المراكز',
      subtitle: 'كل مركز مرخّص يشتغل في دهب، وإيه اللي لسه على المنصة ليه.',
      queue: 'طابور التوثيق',
      queueSub: 'مستندات مستنيانا. الرفض لازم يقول السبب.',
      roster: 'القائمة',
      none: 'مفيش مركز مطابق للفلتر ده.',
      noneQueue: 'مفيش حاجة مستنية. كل المستندات اترد عليها.',
    },
    expiryPage: {
      title: 'لوحة الصلاحيات',
      subtitle: 'كل ما تنتهي صلاحيته، في كل المراكز، قبل ما ينتهي.',
      none: 'مفيش حاجة تنتهي في المدة دي.',
      blocksNote: 'بيمنع المركز من النشر لحظة ما ينتهي.',
    },
    vendorStatus: {
      applied: 'قدّم',
      inReview: 'تحت المراجعة',
      active: 'شغّال',
      suspended: 'موقوف',
      closed: 'مقفول',
    },
    docType: {
      commercialRegister: 'السجل التجاري',
      taxCard: 'البطاقة الضريبية',
      operatingPermit: 'ترخيص التشغيل',
      cdwsLicence: 'رخصة CDWS',
      diveAgencyAffiliation: 'انتساب لهيئة غوص',
      publicLiabilityInsurance: 'تأمين المسؤولية المدنية',
      boatLicence: 'رخصة قارب',
      vehicleLicence: 'رخصة مركبة',
      other: 'أخرى',
    },
    verify: {
      pending: 'لسه متقدّمش',
      inReview: 'تحت المراجعة',
      verified: 'موثّق',
      rejected: 'مرفوض',
      expired: 'منتهي',
    },
    col2: {
      area: 'المنطقة',
      services: 'الخدمات',
      rating: 'التقييم',
      staff: 'الفريق',
      issuer: 'جهة الإصدار',
      band: 'الاستحقاق',
    },
  },
  'de-DE': {
    vendors: {
      title: 'Anbieter',
      subtitle: 'Alle mit Lizenz in Dahab — und was die Plattform ihnen noch schuldet.',
      queue: 'Prüfungswarteschlange',
      queueSub: 'Dokumente, die auf uns warten. Eine Ablehnung muss begründet werden.',
      roster: 'Die Liste',
      none: 'Kein Anbieter passt zu diesem Filter.',
      noneQueue: 'Nichts offen. Jedes Dokument wurde beantwortet.',
    },
    expiryPage: {
      title: 'Die Fristenübersicht',
      subtitle: 'Alles, was abläuft, über alle Anbieter hinweg — bevor es abläuft.',
      none: 'In diesem Zeitraum läuft nichts ab.',
      blocksNote: 'Sperrt die Veröffentlichung, sobald es abläuft.',
    },
    vendorStatus: {
      applied: 'Beworben',
      inReview: 'In Prüfung',
      active: 'Aktiv',
      suspended: 'Gesperrt',
      closed: 'Geschlossen',
    },
    docType: {
      commercialRegister: 'Handelsregister',
      taxCard: 'Steuerkarte',
      operatingPermit: 'Betriebserlaubnis',
      cdwsLicence: 'CDWS-Lizenz',
      diveAgencyAffiliation: 'Tauchverband-Zugehörigkeit',
      publicLiabilityInsurance: 'Haftpflichtversicherung',
      boatLicence: 'Bootslizenz',
      vehicleLicence: 'Fahrzeugschein',
      other: 'Sonstiges',
    },
    verify: {
      pending: 'Nicht eingereicht',
      inReview: 'In Prüfung',
      verified: 'Bestätigt',
      rejected: 'Abgelehnt',
      expired: 'Abgelaufen',
    },
    col2: {
      area: 'Gegend',
      services: 'Leistungen',
      rating: 'Bewertung',
      staff: 'Team',
      issuer: 'Ausgestellt von',
      band: 'Fällig',
    },
  },
  'ru-RU': {
    vendors: {
      title: 'Операторы',
      subtitle: 'Все, кто имеет лицензию в Дахабе, и что платформа им ещё должна.',
      queue: 'Очередь проверки',
      queueSub: 'Документы ждут нас. Отказ обязан объяснять причину.',
      roster: 'Список',
      none: 'Ни один оператор не подходит под этот фильтр.',
      noneQueue: 'Ничего не ждёт. На каждый документ дан ответ.',
    },
    expiryPage: {
      title: 'Доска сроков',
      subtitle: 'Всё, что истекает, по всем операторам — до того, как истечёт.',
      none: 'В этот период ничего не истекает.',
      blocksNote: 'Блокирует публикацию в момент истечения.',
    },
    vendorStatus: {
      applied: 'Подал заявку',
      inReview: 'На проверке',
      active: 'Работает',
      suspended: 'Приостановлен',
      closed: 'Закрыт',
    },
    docType: {
      commercialRegister: 'Торговый реестр',
      taxCard: 'Налоговая карта',
      operatingPermit: 'Разрешение на работу',
      cdwsLicence: 'Лицензия CDWS',
      diveAgencyAffiliation: 'Членство в дайв-ассоциации',
      publicLiabilityInsurance: 'Страхование ответственности',
      boatLicence: 'Лицензия на судно',
      vehicleLicence: 'Регистрация транспорта',
      other: 'Прочее',
    },
    verify: {
      pending: 'Не предоставлен',
      inReview: 'На проверке',
      verified: 'Подтверждён',
      rejected: 'Отклонён',
      expired: 'Истёк',
    },
    col2: {
      area: 'Район',
      services: 'Услуги',
      rating: 'Рейтинг',
      staff: 'Команда',
      issuer: 'Кем выдан',
      band: 'Срок',
    },
  },
  'it-IT': {
    vendors: {
      title: 'Operatori',
      subtitle: 'Tutti quelli autorizzati a Dahab, e cosa deve loro la piattaforma.',
      queue: 'Coda di verifica',
      queueSub: 'Documenti in attesa di noi. Un rifiuto deve dire perché.',
      roster: "L'elenco",
      none: 'Nessun operatore corrisponde a questo filtro.',
      noneQueue: 'Nulla in attesa. Ogni documento ha avuto risposta.',
    },
    expiryPage: {
      title: 'Il quadro delle scadenze',
      subtitle: 'Tutto ciò che scade, per ogni operatore, prima che scada.',
      none: 'Nulla scade in questo periodo.',
      blocksNote: 'Blocca la pubblicazione nel momento in cui scade.',
    },
    vendorStatus: {
      applied: 'Candidato',
      inReview: 'In esame',
      active: 'Attivo',
      suspended: 'Sospeso',
      closed: 'Chiuso',
    },
    docType: {
      commercialRegister: 'Registro delle imprese',
      taxCard: 'Tessera fiscale',
      operatingPermit: 'Licenza di esercizio',
      cdwsLicence: 'Licenza CDWS',
      diveAgencyAffiliation: 'Affiliazione a didattica subacquea',
      publicLiabilityInsurance: 'Responsabilità civile',
      boatLicence: 'Licenza imbarcazione',
      vehicleLicence: 'Libretto del veicolo',
      other: 'Altro',
    },
    verify: {
      pending: 'Non fornito',
      inReview: 'In esame',
      verified: 'Verificato',
      rejected: 'Respinto',
      expired: 'Scaduto',
    },
    col2: {
      area: 'Zona',
      services: 'Servizi',
      rating: 'Valutazione',
      staff: 'Personale',
      issuer: 'Rilasciato da',
      band: 'Scadenza',
    },
  },
  'fr-FR': {
    vendors: {
      title: 'Opérateurs',
      subtitle: 'Tous ceux autorisés à Dahab, et ce que la plateforme leur doit encore.',
      queue: 'File de vérification',
      queueSub: 'Documents qui nous attendent. Un refus doit dire pourquoi.',
      roster: 'La liste',
      none: 'Aucun opérateur ne correspond à ce filtre.',
      noneQueue: 'Rien en attente. Chaque document a reçu une réponse.',
    },
    expiryPage: {
      title: 'Le tableau des échéances',
      subtitle: "Tout ce qui expire, chez tous les opérateurs, avant que ça n'expire.",
      none: 'Rien n’expire sur cette période.',
      blocksNote: 'Bloque la publication dès l’expiration.',
    },
    vendorStatus: {
      applied: 'Candidature',
      inReview: 'En cours d’examen',
      active: 'Actif',
      suspended: 'Suspendu',
      closed: 'Fermé',
    },
    docType: {
      commercialRegister: 'Registre du commerce',
      taxCard: 'Carte fiscale',
      operatingPermit: 'Autorisation d’exploitation',
      cdwsLicence: 'Licence CDWS',
      diveAgencyAffiliation: 'Affiliation à une fédération de plongée',
      publicLiabilityInsurance: 'Responsabilité civile',
      boatLicence: 'Permis bateau',
      vehicleLicence: 'Carte grise',
      other: 'Autre',
    },
    verify: {
      pending: 'Non fourni',
      inReview: 'En cours d’examen',
      verified: 'Vérifié',
      rejected: 'Refusé',
      expired: 'Expiré',
    },
    col2: {
      area: 'Quartier',
      services: 'Prestations',
      rating: 'Note',
      staff: 'Équipe',
      issuer: 'Délivré par',
      band: 'Échéance',
    },
  },
  'es-ES': {
    vendors: {
      title: 'Operadores',
      subtitle: 'Todos los autorizados en Dahab, y lo que la plataforma aún les debe.',
      queue: 'Cola de verificación',
      queueSub: 'Documentos que nos esperan. Un rechazo tiene que decir por qué.',
      roster: 'La lista',
      none: 'Ningún operador coincide con este filtro.',
      noneQueue: 'Nada pendiente. Todos los documentos tienen respuesta.',
    },
    expiryPage: {
      title: 'El tablero de vencimientos',
      subtitle: 'Todo lo que caduca, en todos los operadores, antes de que caduque.',
      none: 'No caduca nada en este periodo.',
      blocksNote: 'Bloquea la publicación en cuanto caduca.',
    },
    vendorStatus: {
      applied: 'Solicitado',
      inReview: 'En revisión',
      active: 'Activo',
      suspended: 'Suspendido',
      closed: 'Cerrado',
    },
    docType: {
      commercialRegister: 'Registro mercantil',
      taxCard: 'Tarjeta fiscal',
      operatingPermit: 'Licencia de actividad',
      cdwsLicence: 'Licencia CDWS',
      diveAgencyAffiliation: 'Afiliación a agencia de buceo',
      publicLiabilityInsurance: 'Responsabilidad civil',
      boatLicence: 'Licencia de embarcación',
      vehicleLicence: 'Permiso de circulación',
      other: 'Otro',
    },
    verify: {
      pending: 'No aportado',
      inReview: 'En revisión',
      verified: 'Verificado',
      rejected: 'Rechazado',
      expired: 'Caducado',
    },
    col2: {
      area: 'Zona',
      services: 'Servicios',
      rating: 'Valoración',
      staff: 'Equipo',
      issuer: 'Emitido por',
      band: 'Vence',
    },
  },
};

/** Legitimately the same string as the source. */
const IDENTICAL = {
  // Nothing in these two blocks is legitimately identical to en-GB: even
  // "CDWS licence" takes the locale's own word for licence. check-locales is
  // the authority — if it flags one, declare it here with the reason.
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  Object.assign(catalogue.admin, block);

  const declared = IDENTICAL[locale] ?? [];
  if (declared.length > 0) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor keys → ${locale}`);
}
