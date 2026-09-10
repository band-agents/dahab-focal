/**
 * Adds the catalogue and taxonomy screen's strings to all seven catalogues.
 *
 * The nine `attribute_data_type` values and the six comparison groups get one
 * key each: they are db enum values, and an admin reading an Arabic console
 * should not see `multiEnum` or `comparisonGroup: guiding`.
 *
 *   node scripts/add-taxonomy-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    catalog: {
      title: 'Catalogue & taxonomy',
      subtitle: 'What operators may publish, and what travellers may compare it on.',
      queue: 'Waiting on review',
      queueSub: 'What changed, and whether it can be compared once it is live.',
      attributes: 'Comparable attributes · Diving',
      attributesSub:
        'These are rows in a table, not columns on a service. Retiring one removes a row from every comparison that uses it.',
      categories: 'Categories',
      categoriesSub: 'Each carries its own attribute set. None shares a column with another.',
      missing: '{count, plural, =0 {Ready to compare} one {# answer missing} other {# answers missing}}',
      notComparable: 'Descriptive only',
      usage: 'On {count, plural, one {# service} other {# services}}',
      dataAsData:
        'Comparable attributes live in attribute_definitions, never as a column on services. One table feeds the taxonomy manager, the vendor service builder and the traveller comparison engine.',
    },
    serviceStatus: {
      draft: 'Draft',
      underReview: 'Under review',
      published: 'Published',
      paused: 'Paused',
      archived: 'Archived',
      rejected: 'Rejected',
    },
    dataType: {
      text: 'Text',
      longText: 'Long text',
      number: 'Number',
      measure: 'Measure',
      boolean: 'Yes / no',
      enum: 'One of',
      multiEnum: 'Any of',
      duration: 'Duration',
      date: 'Date',
    },
    group: {
      profile: 'Profile',
      requirements: 'Requirements',
      guiding: 'Group and guiding',
      logistics: 'Logistics',
      safety: 'Safety',
      inclusions: 'Inclusions',
    },
    col3: {
      attribute: 'Attribute',
      type: 'Type',
      group: 'Comparison group',
      normalisation: 'Normalised by',
      usage: 'In use',
      submitted: 'Submitted',
      category: 'Category',
      comparable: 'Comparable',
    },
  },
  'ar-EG': {
    catalog: {
      title: 'الكتالوج والتصنيفات',
      subtitle: 'إيه اللي المراكز تقدر تنشره، وإيه اللي المسافر يقدر يقارن بيه.',
      queue: 'في انتظار المراجعة',
      queueSub: 'إيه اللي اتغيّر، وهل ينفع يتقارن لما ينزل.',
      attributes: 'الخصائص القابلة للمقارنة · الغوص',
      attributesSub:
        'دي صفوف في جدول، مش أعمدة على الخدمة. لما تتقفل واحدة، بيختفي صف من كل مقارنة بتستخدمها.',
      categories: 'التصنيفات',
      categoriesSub: 'كل تصنيف ليه مجموعة خصائصه. ومفيش تصنيف بيشارك عمود مع غيره.',
      missing:
        '{count, plural, =0 {جاهزة للمقارنة} zero {جاهزة للمقارنة} one {ناقصها إجابة} two {ناقصها إجابتان} few {ناقصها # إجابات} many {ناقصها # إجابة} other {ناقصها # إجابة}}',
      notComparable: 'وصفية فقط',
      usage:
        'على {count, plural, zero {لا خدمات} one {خدمة واحدة} two {خدمتين} few {# خدمات} many {# خدمة} other {# خدمة}}',
      dataAsData:
        'الخصائص القابلة للمقارنة موجودة في attribute_definitions، مش كعمود على services. جدول واحد بيغذّي مدير التصنيفات، وبناء الخدمة عند المركز، ومحرك المقارنة عند المسافر.',
    },
    serviceStatus: {
      draft: 'مسودة',
      underReview: 'تحت المراجعة',
      published: 'منشورة',
      paused: 'موقوفة مؤقتًا',
      archived: 'مؤرشفة',
      rejected: 'مرفوضة',
    },
    dataType: {
      text: 'نص',
      longText: 'نص طويل',
      number: 'رقم',
      measure: 'قياس',
      boolean: 'نعم / لا',
      enum: 'واحد من',
      multiEnum: 'أي من',
      duration: 'مدة',
      date: 'تاريخ',
    },
    group: {
      profile: 'المواصفات',
      requirements: 'المتطلبات',
      guiding: 'المجموعة والإرشاد',
      logistics: 'اللوجستيات',
      safety: 'السلامة',
      inclusions: 'المشمولات',
    },
    col3: {
      attribute: 'الخاصية',
      type: 'النوع',
      group: 'مجموعة المقارنة',
      normalisation: 'التوحيد بـ',
      usage: 'قيد الاستخدام',
      submitted: 'اتقدّمت',
      category: 'التصنيف',
      comparable: 'قابلة للمقارنة',
    },
  },
  'de-DE': {
    catalog: {
      title: 'Katalog & Taxonomie',
      subtitle: 'Was Anbieter veröffentlichen dürfen, und woran Reisende es vergleichen.',
      queue: 'Wartet auf Prüfung',
      queueSub: 'Was sich geändert hat, und ob es nach dem Livegang vergleichbar ist.',
      attributes: 'Vergleichbare Merkmale · Tauchen',
      attributesSub:
        'Das sind Zeilen einer Tabelle, keine Spalten einer Leistung. Wird eines stillgelegt, verschwindet eine Zeile aus jedem Vergleich, der es nutzt.',
      categories: 'Kategorien',
      categoriesSub:
        'Jede trägt ihren eigenen Merkmalssatz. Keine teilt sich eine Spalte mit einer anderen.',
      missing:
        '{count, plural, =0 {Vergleichsbereit} one {# Angabe fehlt} other {# Angaben fehlen}}',
      notComparable: 'Nur beschreibend',
      usage: 'Bei {count, plural, one {# Leistung} other {# Leistungen}}',
      dataAsData:
        'Vergleichbare Merkmale liegen in attribute_definitions, nie als Spalte auf services. Eine Tabelle speist die Taxonomie, den Leistungsbaukasten des Anbieters und die Vergleichsansicht der Reisenden.',
    },
    serviceStatus: {
      draft: 'Entwurf',
      underReview: 'In Prüfung',
      published: 'Veröffentlicht',
      paused: 'Pausiert',
      archived: 'Archiviert',
      rejected: 'Abgelehnt',
    },
    dataType: {
      text: 'Text',
      longText: 'Langtext',
      number: 'Zahl',
      measure: 'Messwert',
      boolean: 'Ja / nein',
      enum: 'Eines von',
      multiEnum: 'Beliebige von',
      duration: 'Dauer',
      date: 'Datum',
    },
    group: {
      profile: 'Profil',
      requirements: 'Voraussetzungen',
      guiding: 'Gruppe und Guiding',
      logistics: 'Logistik',
      safety: 'Sicherheit',
      inclusions: 'Enthaltene Leistungen',
    },
    col3: {
      attribute: 'Merkmal',
      type: 'Typ',
      group: 'Vergleichsgruppe',
      normalisation: 'Normiert über',
      usage: 'Im Einsatz',
      submitted: 'Eingereicht',
      category: 'Kategorie',
      comparable: 'Vergleichbar',
    },
  },
  'ru-RU': {
    catalog: {
      title: 'Каталог и таксономия',
      subtitle: 'Что операторы могут публиковать и по чему путешественники это сравнивают.',
      queue: 'Ждёт проверки',
      queueSub: 'Что изменилось и можно ли будет это сравнить после публикации.',
      attributes: 'Сравнимые характеристики · Дайвинг',
      attributesSub:
        'Это строки таблицы, а не столбцы услуги. Отключить одну — значит убрать строку из каждого сравнения, где она используется.',
      categories: 'Категории',
      categoriesSub:
        'У каждой свой набор характеристик. Ни одна не делит столбец с другой.',
      missing:
        '{count, plural, =0 {Готово к сравнению} one {не хватает # ответа} few {не хватает # ответов} many {не хватает # ответов} other {не хватает # ответа}}',
      notComparable: 'Только описание',
      usage:
        'В {count, plural, one {# услуге} few {# услугах} many {# услугах} other {# услуги}}',
      dataAsData:
        'Сравнимые характеристики живут в attribute_definitions, а не столбцом в services. Одна таблица питает таксономию, конструктор услуг оператора и движок сравнения путешественника.',
    },
    serviceStatus: {
      draft: 'Черновик',
      underReview: 'На проверке',
      published: 'Опубликовано',
      paused: 'Приостановлено',
      archived: 'В архиве',
      rejected: 'Отклонено',
    },
    dataType: {
      text: 'Текст',
      longText: 'Длинный текст',
      number: 'Число',
      measure: 'Величина',
      boolean: 'Да / нет',
      enum: 'Одно из',
      multiEnum: 'Любые из',
      duration: 'Длительность',
      date: 'Дата',
    },
    group: {
      profile: 'Профиль',
      requirements: 'Требования',
      guiding: 'Группа и сопровождение',
      logistics: 'Логистика',
      safety: 'Безопасность',
      inclusions: 'Что включено',
    },
    col3: {
      attribute: 'Характеристика',
      type: 'Тип',
      group: 'Группа сравнения',
      normalisation: 'Приведено через',
      usage: 'Используется',
      submitted: 'Подано',
      category: 'Категория',
      comparable: 'Сравнимо',
    },
  },
  'it-IT': {
    catalog: {
      title: 'Catalogo e tassonomia',
      subtitle: 'Cosa possono pubblicare gli operatori e su cosa i viaggiatori lo confrontano.',
      queue: 'In attesa di revisione',
      queueSub: "Cosa è cambiato e se sarà confrontabile una volta online.",
      attributes: 'Attributi confrontabili · Immersioni',
      attributesSub:
        'Sono righe di una tabella, non colonne di un servizio. Ritirarne uno toglie una riga da ogni confronto che lo usa.',
      categories: 'Categorie',
      categoriesSub: 'Ognuna ha il proprio insieme di attributi. Nessuna condivide una colonna.',
      missing:
        '{count, plural, =0 {Pronto al confronto} one {manca # risposta} other {mancano # risposte}}',
      notComparable: 'Solo descrittivo',
      usage: 'Su {count, plural, one {# servizio} other {# servizi}}',
      dataAsData:
        'Gli attributi confrontabili stanno in attribute_definitions, mai come colonna su services. Una tabella alimenta la tassonomia, il costruttore di servizi e il motore di confronto.',
    },
    serviceStatus: {
      draft: 'Bozza',
      underReview: 'In revisione',
      published: 'Pubblicato',
      paused: 'In pausa',
      archived: 'Archiviato',
      rejected: 'Respinto',
    },
    dataType: {
      text: 'Testo',
      longText: 'Testo lungo',
      number: 'Numero',
      measure: 'Misura',
      boolean: 'Sì / no',
      enum: 'Uno tra',
      multiEnum: 'Uno o più tra',
      duration: 'Durata',
      date: 'Data',
    },
    group: {
      profile: 'Profilo',
      requirements: 'Requisiti',
      guiding: 'Gruppo e guida',
      logistics: 'Logistica',
      safety: 'Sicurezza',
      inclusions: 'Incluso',
    },
    col3: {
      attribute: 'Attributo',
      type: 'Tipo',
      group: 'Gruppo di confronto',
      normalisation: 'Normalizzato con',
      usage: 'In uso',
      submitted: 'Inviato',
      category: 'Categoria',
      comparable: 'Confrontabile',
    },
  },
  'fr-FR': {
    catalog: {
      title: 'Catalogue et taxonomie',
      subtitle: 'Ce que les opérateurs peuvent publier, et sur quoi les voyageurs le comparent.',
      queue: 'En attente de revue',
      queueSub: 'Ce qui a changé, et si ce sera comparable une fois en ligne.',
      attributes: 'Attributs comparables · Plongée',
      attributesSub:
        "Ce sont des lignes d'un tableau, pas des colonnes d'une prestation. En retirer un supprime une ligne de chaque comparaison qui l'utilise.",
      categories: 'Catégories',
      categoriesSub:
        'Chacune a son propre jeu d’attributs. Aucune ne partage de colonne avec une autre.',
      missing:
        '{count, plural, =0 {Prêt à comparer} one {# réponse manquante} other {# réponses manquantes}}',
      notComparable: 'Descriptif seulement',
      usage: 'Sur {count, plural, one {# prestation} other {# prestations}}',
      dataAsData:
        'Les attributs comparables vivent dans attribute_definitions, jamais en colonne sur services. Une table alimente la taxonomie, le constructeur de prestations et le moteur de comparaison.',
    },
    serviceStatus: {
      draft: 'Brouillon',
      underReview: 'En cours de revue',
      published: 'Publié',
      paused: 'En pause',
      archived: 'Archivé',
      rejected: 'Refusé',
    },
    dataType: {
      text: 'Texte',
      longText: 'Texte long',
      number: 'Nombre',
      measure: 'Mesure',
      boolean: 'Oui / non',
      enum: 'Un parmi',
      multiEnum: 'Plusieurs parmi',
      duration: 'Durée',
      date: 'Date',
    },
    group: {
      profile: 'Profil',
      requirements: 'Prérequis',
      guiding: 'Groupe et encadrement',
      logistics: 'Logistique',
      safety: 'Sécurité',
      inclusions: 'Inclus',
    },
    col3: {
      attribute: 'Attribut',
      type: 'Type',
      group: 'Groupe de comparaison',
      normalisation: 'Normalisé par',
      usage: 'Utilisé',
      submitted: 'Soumis',
      category: 'Catégorie',
      comparable: 'Comparable',
    },
  },
  'es-ES': {
    catalog: {
      title: 'Catálogo y taxonomía',
      subtitle: 'Qué pueden publicar los operadores y con qué lo comparan los viajeros.',
      queue: 'Esperando revisión',
      queueSub: 'Qué ha cambiado y si podrá compararse una vez publicado.',
      attributes: 'Atributos comparables · Buceo',
      attributesSub:
        'Son filas de una tabla, no columnas de un servicio. Retirar uno elimina una fila de cada comparación que lo usa.',
      categories: 'Categorías',
      categoriesSub:
        'Cada una tiene su propio conjunto de atributos. Ninguna comparte columna con otra.',
      missing:
        '{count, plural, =0 {Listo para comparar} one {falta # respuesta} other {faltan # respuestas}}',
      notComparable: 'Solo descriptivo',
      usage: 'En {count, plural, one {# servicio} other {# servicios}}',
      dataAsData:
        'Los atributos comparables viven en attribute_definitions, nunca como columna en services. Una tabla alimenta la taxonomía, el constructor de servicios y el motor de comparación.',
    },
    serviceStatus: {
      draft: 'Borrador',
      underReview: 'En revisión',
      published: 'Publicado',
      paused: 'Pausado',
      archived: 'Archivado',
      rejected: 'Rechazado',
    },
    dataType: {
      text: 'Texto',
      longText: 'Texto largo',
      number: 'Número',
      measure: 'Medida',
      boolean: 'Sí / no',
      enum: 'Uno de',
      multiEnum: 'Varios de',
      duration: 'Duración',
      date: 'Fecha',
    },
    group: {
      profile: 'Perfil',
      requirements: 'Requisitos',
      guiding: 'Grupo y guía',
      logistics: 'Logística',
      safety: 'Seguridad',
      inclusions: 'Incluye',
    },
    col3: {
      attribute: 'Atributo',
      type: 'Tipo',
      group: 'Grupo de comparación',
      normalisation: 'Normalizado por',
      usage: 'En uso',
      submitted: 'Enviado',
      category: 'Categoría',
      comparable: 'Comparable',
    },
  },
};

/**
 * Genuinely the same word as the source. "Date", "Type", "Comparable" and
 * "Text" are spelled identically in these locales; check-locales insists an
 * untranslated-looking value be declared, so that a real oversight cannot hide
 * among the legitimate ones.
 */
const IDENTICAL = {
  'fr-FR': ['admin.dataType.date', 'admin.col3.type', 'admin.col3.comparable'],
  'es-ES': ['admin.col3.comparable'],
  'de-DE': ['admin.dataType.text'],
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
  console.log(`taxonomy keys → ${locale}`);
}
