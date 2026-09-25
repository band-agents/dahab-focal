/**
 * Strings for the console's Pricing module, and the six category names the
 * database stores keys for and the catalogue never had.
 *
 * `categories.name_key` holds `category.scubaDiving`, `category.kitesurfing`,
 * `category.boatTrips`, `category.coursesCertifications`, `category.gearRental`
 * and `category.photography`; the catalogue's `category.*` block was written
 * from the design board's twelve, which are named differently. So nothing
 * could render a stored category name, and the catalogue screen printed the
 * slug instead. These are added beside the board's keys, not in place of them.
 *
 * All seven locales are written in full rather than as English placeholders:
 * several keys are plurals, and a placeholder cannot carry Russian's four
 * forms or Arabic's six. The ru, it, fr, es and de strings were written by
 * Claude and have not been read by a native speaker.
 *
 *   node scripts/add-pricing-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    nav: 'Pricing',
    pricing: {
      title: 'Pricing',
      subtitle: "Every service's rate card, and what a traveller would pay.",
      rateCards: 'Rate cards',
      untitled: 'Untitled service',
      byline: '{vendor} · {model}',
      noModel: 'No pricing model',
      noPrice: 'No price',
      kind: {
        perPerson: 'Per person',
        perGroup: 'Per group',
        perPersonTiered: 'Per person, by group size',
        perUnitPerDay: 'Per unit, per day',
        free: 'Free',
      },
      kindHint: {
        perPerson: 'Every paying person pays the base price.',
        perGroup: 'One price for the whole group, whatever its size.',
        perPersonTiered: 'A price per person that drops as the group grows.',
        perUnitPerDay: 'A rental: the price, times the units, times the days.',
        free: 'Nobody pays.',
      },
      colCategory: 'Category',
      colRules: 'Rules',
      colListing: 'Listing',
      colBase: 'Base price',
      colModel: 'Model',
      rulesCount: '{active} of {total} on',
      unpricedBanner:
        '{count, plural, one {# service cannot be quoted} other {# services cannot be quoted}}',
      unpricedDetail: 'A service with no pricing model has no price, so nobody can book it.',
      twoModels:
        '{count, plural, one {# service has more than one pricing model} other {# services have more than one pricing model}}',
      twoModelsHere: 'This service has more than one pricing model',
      twoModelsDetail: 'Only the newest one is used. The older ones should be removed.',
      priced: 'Priced',
      ofServices: 'of {total} services',
      unpriced: 'Without a price',
      activeRules: 'Rules on',
      noFx:
        'No exchange-rate source is connected, so prices are shown in EGP only, with no EUR equivalent.',
      readOnly: 'Read-only: changing a price is not built yet.',
      none: 'No services yet.',
      colRule: 'Rule',
      colWhen: 'Applies when',
      colChange: 'Change',
      colOrder: 'Order',
      colStacks: 'Stacks',
      brokenCondition: 'Condition does not match its kind',
      brokenAdjustment: 'Change does not match its kind',
      stacksYes: 'Yes',
      stacksNo: 'No',
      stacksNoGroup: 'No, within {group}',
      noModelTitle: 'This service cannot be quoted',
      noModelDetail: 'It has no pricing model, so it has no price.',
      brokenBanner:
        '{count, plural, one {# rule does not match the contract} other {# rules do not match the contract}}',
      brokenDetail:
        'Checkout would refuse a price built from it, so it is left out of the price check.',
      openOperator: 'Operator',
      model: 'Model',
      maxGroup: 'Largest group',
      partySize: 'Group size',
      partyFrom: '{min} or more people',
      partyRange: '{min} to {max} people',
      tiers: 'Group-size tiers',
      noTiers: 'No tiers yet. The base price applies to every group size.',
      tierFrom: '{count, plural, one {From # person} other {From # people}}',
      rules: 'Rules',
      rulesSub: 'Applied in this order. Percentages compound in the same order.',
      noRules: 'No rules. Every paying person pays the base price.',
      check: 'Price check',
      checkSub:
        'Worked out with the same function checkout uses, so this is what a traveller would be charged.',
      checkDate: 'Trip date',
      checkRun: 'Work out the price',
      checkRuleNote: 'Rule',
      checkTotal: 'Total',
      checkAssumption: 'For a trip on {date}, booked now',
      checkPaying: 'Paying',
      checkSeats: 'Seats taken',
      checkNotCharged: 'Infants and accompanying instructors take a seat but are not charged.',
      checkOutside: 'This party is outside the group size the service takes',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: 'There is no pricing model to work out a price with.',
        emptyParty: 'Add at least one person.',
        needsUnitBasis:
          'This is a rental, and the database cannot yet say whether it is priced per person, per item or per group.',
        groupTooLarge: 'This party is larger than the largest group this price covers.',
        refused: 'This rate card cannot be priced as it stands.',
      },
      unlabelledRule: 'Unnamed rule',
      cond: {
        always: 'Always',
        seasonal: 'Trips from {start} to {end}',
        dayOfWeek: 'Trips on {days}',
        earlyBird:
          '{count, plural, one {Booked # day or more ahead} other {Booked # days or more ahead}}',
        lastMinute:
          '{count, plural, one {Booked # hour or less before the trip} other {Booked # hours or less before the trip}}',
        participantKind: 'For {kinds}',
        groupSize: '{count, plural, one {Groups of # or more} other {Groups of # or more}}',
        currency: 'Quoted in {currency}',
      },
      adj: {
        percentOff: '{percent} off',
        percentExtra: '{percent} extra',
        amountOff: '{amount} off',
        amountExtra: '{amount} extra',
        override: 'Price set to {amount}',
      },
      ruleOn: 'On',
      ruleOff: 'Off',
      ruleStarts: 'Starts {date}',
      ruleEnded: 'Ended {date}',
      ruleBroken: 'Broken',
    },
    priceRule: { childRate: 'Child rate', studentRate: 'Student rate' },
    category: {
      scubaDiving: 'Scuba diving',
      kitesurfing: 'Kitesurfing',
      boatTrips: 'Boat trips',
      coursesCertifications: 'Courses & certifications',
      gearRental: 'Gear rental',
      photography: 'Photography',
    },
  },

  'ar-EG': {
    nav: 'الأسعار',
    pricing: {
      title: 'الأسعار',
      subtitle: 'كارت أسعار كل خدمة، والمسافر هيدفع كام.',
      rateCards: 'كروت الأسعار',
      untitled: 'خدمة من غير اسم',
      byline: '{vendor} · {model}',
      noModel: 'مفيش نموذج تسعير',
      noPrice: 'من غير سعر',
      kind: {
        perPerson: 'للفرد',
        perGroup: 'للمجموعة',
        perPersonTiered: 'للفرد، حسب حجم المجموعة',
        perUnitPerDay: 'للوحدة، في اليوم',
        free: 'مجانًا',
      },
      kindHint: {
        perPerson: 'كل فرد بيدفع السعر الأساسي.',
        perGroup: 'سعر واحد للمجموعة كلها مهما كان عددها.',
        perPersonTiered: 'سعر للفرد بيقل كل ما المجموعة تكبر.',
        perUnitPerDay: 'إيجار: السعر في عدد الوحدات في عدد الأيام.',
        free: 'محدش بيدفع.',
      },
      colCategory: 'الفئة',
      colRules: 'القواعد',
      colListing: 'الإعلان',
      colBase: 'السعر الأساسي',
      colModel: 'النموذج',
      rulesCount: '{active} شغالة من {total}',
      unpricedBanner:
        '{count, plural, zero {كل الخدمات ليها سعر} one {خدمة واحدة مينفعش تتسعّر} two {خدمتين مينفعش يتسعّروا} few {# خدمات مينفعش تتسعّر} many {# خدمة مينفعش تتسعّر} other {# خدمة مينفعش تتسعّر}}',
      unpricedDetail: 'الخدمة اللي مالهاش نموذج تسعير مالهاش سعر، فمحدش يقدر يحجزها.',
      twoModels:
        '{count, plural, zero {مفيش خدمة ليها أكتر من نموذج تسعير} one {خدمة واحدة ليها أكتر من نموذج تسعير} two {خدمتين ليهم أكتر من نموذج تسعير} few {# خدمات ليها أكتر من نموذج تسعير} many {# خدمة ليها أكتر من نموذج تسعير} other {# خدمة ليها أكتر من نموذج تسعير}}',
      twoModelsHere: 'الخدمة دي ليها أكتر من نموذج تسعير',
      twoModelsDetail: 'الأحدث بس هو اللي بيتحسب بيه. القديم لازم يتشال.',
      priced: 'ليها سعر',
      ofServices: 'من {total} خدمة',
      unpriced: 'من غير سعر',
      activeRules: 'قواعد شغالة',
      noFx: 'مفيش مصدر لأسعار الصرف متوصّل، فالأسعار بالجنيه بس ومن غير ما يقابلها باليورو.',
      readOnly: 'للقراية بس: تغيير السعر لسه متعملش.',
      none: 'مفيش خدمات لسه.',
      colRule: 'القاعدة',
      colWhen: 'بتتطبق إمتى',
      colChange: 'التغيير',
      colOrder: 'الترتيب',
      colStacks: 'بتتجمع؟',
      brokenCondition: 'الشرط مش مطابق لنوعه',
      brokenAdjustment: 'التغيير مش مطابق لنوعه',
      stacksYes: 'أيوه',
      stacksNo: 'لأ',
      stacksNoGroup: 'لأ، جوه {group}',
      noModelTitle: 'الخدمة دي مينفعش تتسعّر',
      noModelDetail: 'مالهاش نموذج تسعير، فمالهاش سعر.',
      brokenBanner:
        '{count, plural, zero {كل القواعد سليمة} one {قاعدة واحدة مش مطابقة للعقد} two {قاعدتين مش مطابقين للعقد} few {# قواعد مش مطابقة للعقد} many {# قاعدة مش مطابقة للعقد} other {# قاعدة مش مطابقة للعقد}}',
      brokenDetail: 'الدفع هيرفض أي سعر معمول بيها، فهي مش داخلة في حساب السعر.',
      openOperator: 'المركز',
      model: 'النموذج',
      maxGroup: 'أكبر مجموعة',
      partySize: 'حجم المجموعة',
      partyFrom: '{min} أفراد أو أكتر',
      partyRange: 'من {min} لـ {max} أفراد',
      tiers: 'شرايح حجم المجموعة',
      noTiers: 'مفيش شرايح لسه. السعر الأساسي على أي حجم مجموعة.',
      tierFrom:
        '{count, plural, zero {من غير أفراد} one {من فرد واحد} two {من فردين} few {من # أفراد} many {من # فرد} other {من # فرد}}',
      rules: 'القواعد',
      rulesSub: 'بتتطبق بالترتيب ده. النسب المئوية بتتراكم بنفس الترتيب.',
      noRules: 'مفيش قواعد. كل فرد بيدفع السعر الأساسي.',
      check: 'احسب السعر',
      checkSub: 'بيتحسب بنفس الدالة اللي بيستخدمها الدفع، فده اللي المسافر هيدفعه فعلًا.',
      checkDate: 'تاريخ الرحلة',
      checkRun: 'احسب السعر',
      checkRuleNote: 'قاعدة',
      checkTotal: 'الإجمالي',
      checkAssumption: 'لرحلة يوم {date}، محجوزة دلوقتي',
      checkPaying: 'اللي بيدفعوا',
      checkSeats: 'الأماكن',
      checkNotCharged: 'الرُّضَّع والمدربين المرافقين بياخدوا مكان بس مش بيدفعوا.',
      checkOutside: 'المجموعة دي برّه الحجم اللي الخدمة بتاخده',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: 'مفيش نموذج تسعير نحسب بيه.',
        emptyParty: 'زوّد فرد واحد على الأقل.',
        needsUnitBasis:
          'دي خدمة إيجار، وقاعدة البيانات لسه مش بتقول هي بالفرد ولا بالقطعة ولا بالمجموعة.',
        groupTooLarge: 'المجموعة دي أكبر من أكبر مجموعة السعر ده بيغطيها.',
        refused: 'كارت الأسعار ده مينفعش يتحسب بالشكل ده.',
      },
      unlabelledRule: 'قاعدة من غير اسم',
      cond: {
        always: 'دايمًا',
        seasonal: 'الرحلات من {start} لـ {end}',
        dayOfWeek: 'الرحلات يوم {days}',
        earlyBird:
          '{count, plural, zero {محجوزة في نفس اليوم} one {محجوزة قبلها بيوم أو أكتر} two {محجوزة قبلها بيومين أو أكتر} few {محجوزة قبلها بـ # أيام أو أكتر} many {محجوزة قبلها بـ # يوم أو أكتر} other {محجوزة قبلها بـ # يوم أو أكتر}}',
        lastMinute:
          '{count, plural, zero {محجوزة وقت الرحلة} one {محجوزة قبل الرحلة بساعة أو أقل} two {محجوزة قبل الرحلة بساعتين أو أقل} few {محجوزة قبل الرحلة بـ # ساعات أو أقل} many {محجوزة قبل الرحلة بـ # ساعة أو أقل} other {محجوزة قبل الرحلة بـ # ساعة أو أقل}}',
        participantKind: 'الفئة: {kinds}',
        groupSize:
          '{count, plural, zero {أي مجموعة} one {مجموعات من فرد أو أكتر} two {مجموعات من فردين أو أكتر} few {مجموعات من # أفراد أو أكتر} many {مجموعات من # فرد أو أكتر} other {مجموعات من # فرد أو أكتر}}',
        currency: 'بعملة {currency}',
      },
      adj: {
        percentOff: 'خصم {percent}',
        percentExtra: 'زيادة {percent}',
        amountOff: 'خصم {amount}',
        amountExtra: 'زيادة {amount}',
        override: 'السعر بقى {amount}',
      },
      ruleOn: 'شغالة',
      ruleOff: 'مقفولة',
      ruleStarts: 'تبدأ {date}',
      ruleEnded: 'خلصت {date}',
      ruleBroken: 'بايظة',
    },
    priceRule: { childRate: 'سعر الأطفال', studentRate: 'سعر الطلبة' },
    category: {
      scubaDiving: 'الغطس بالأنابيب',
      kitesurfing: 'الكايت سيرف',
      boatTrips: 'رحلات المراكب',
      coursesCertifications: 'الكورسات والشهادات',
      gearRental: 'إيجار المعدات',
      photography: 'التصوير',
    },
  },

  'ru-RU': {
    nav: 'Цены',
    pricing: {
      title: 'Цены',
      subtitle: 'Прайс-лист каждой услуги и сколько заплатит путешественник.',
      rateCards: 'Прайс-листы',
      untitled: 'Услуга без названия',
      byline: '{vendor} · {model}',
      noModel: 'Нет модели цены',
      noPrice: 'Без цены',
      kind: {
        perPerson: 'За человека',
        perGroup: 'За группу',
        perPersonTiered: 'За человека, по размеру группы',
        perUnitPerDay: 'За единицу в день',
        free: 'Бесплатно',
      },
      kindHint: {
        perPerson: 'Каждый платящий участник платит базовую цену.',
        perGroup: 'Одна цена за всю группу, независимо от её размера.',
        perPersonTiered: 'Цена за человека снижается, когда группа растёт.',
        perUnitPerDay: 'Аренда: цена × количество единиц × число дней.',
        free: 'Никто не платит.',
      },
      colCategory: 'Категория',
      colRules: 'Правила',
      colListing: 'Объявление',
      colBase: 'Базовая цена',
      colModel: 'Модель',
      rulesCount: '{active} из {total} включены',
      unpricedBanner:
        '{count, plural, one {# услугу нельзя оценить} few {# услуги нельзя оценить} many {# услуг нельзя оценить} other {# услуги нельзя оценить}}',
      unpricedDetail:
        'У услуги без модели цены нет цены, поэтому её никто не может забронировать.',
      twoModels:
        '{count, plural, one {У # услуги больше одной модели цены} few {У # услуг больше одной модели цены} many {У # услуг больше одной модели цены} other {У # услуги больше одной модели цены}}',
      twoModelsHere: 'У этой услуги больше одной модели цены',
      twoModelsDetail: 'Используется только самая новая. Старые нужно удалить.',
      priced: 'С ценой',
      ofServices: 'из {total} услуг',
      unpriced: 'Без цены',
      activeRules: 'Включённые правила',
      noFx:
        'Источник курсов валют не подключён, поэтому цены показаны только в EGP, без эквивалента в EUR.',
      readOnly: 'Только просмотр: изменение цен ещё не сделано.',
      none: 'Услуг пока нет.',
      colRule: 'Правило',
      colWhen: 'Когда действует',
      colChange: 'Изменение',
      colOrder: 'Порядок',
      colStacks: 'Суммируется',
      brokenCondition: 'Условие не соответствует своему типу',
      brokenAdjustment: 'Изменение не соответствует своему типу',
      stacksYes: 'Да',
      stacksNo: 'Нет',
      stacksNoGroup: 'Нет, в группе {group}',
      noModelTitle: 'Эту услугу нельзя оценить',
      noModelDetail: 'У неё нет модели цены, а значит, нет и цены.',
      brokenBanner:
        '{count, plural, one {# правило не соответствует контракту} few {# правила не соответствуют контракту} many {# правил не соответствуют контракту} other {# правила не соответствуют контракту}}',
      brokenDetail:
        'Оформление заказа отклонит цену, построенную на нём, поэтому в расчёт оно не входит.',
      openOperator: 'Оператор',
      model: 'Модель',
      maxGroup: 'Самая большая группа',
      partySize: 'Размер группы',
      partyFrom: 'От {min} человек',
      partyRange: 'От {min} до {max} человек',
      tiers: 'Ступени по размеру группы',
      noTiers: 'Ступеней пока нет. Базовая цена действует для группы любого размера.',
      tierFrom:
        '{count, plural, one {От # человека} few {От # человек} many {От # человек} other {От # человека}}',
      rules: 'Правила',
      rulesSub: 'Применяются в этом порядке. Проценты накладываются в том же порядке.',
      noRules: 'Правил нет. Каждый платящий участник платит базовую цену.',
      check: 'Расчёт цены',
      checkSub:
        'Считается той же функцией, что и при оформлении заказа, — столько и заплатит путешественник.',
      checkDate: 'Дата поездки',
      checkRun: 'Рассчитать',
      checkRuleNote: 'Правило',
      checkTotal: 'Итого',
      checkAssumption: 'Для поездки {date}, бронь сейчас',
      checkPaying: 'Платят',
      checkSeats: 'Занято мест',
      checkNotCharged: 'Младенцы и сопровождающие инструкторы занимают место, но не платят.',
      checkOutside: 'Эта группа не подходит услуге по размеру',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: 'Нет модели цены, по которой можно посчитать.',
        emptyParty: 'Добавьте хотя бы одного человека.',
        needsUnitBasis:
          'Это аренда, а база данных пока не может указать, считается она за человека, за предмет или за группу.',
        groupTooLarge: 'Эта группа больше самой большой группы, на которую рассчитана цена.',
        refused: 'Этот прайс-лист в текущем виде нельзя рассчитать.',
      },
      unlabelledRule: 'Правило без названия',
      cond: {
        always: 'Всегда',
        seasonal: 'Поездки с {start} по {end}',
        dayOfWeek: 'Поездки: {days}',
        earlyBird:
          '{count, plural, one {Бронь минимум за # день} few {Бронь минимум за # дня} many {Бронь минимум за # дней} other {Бронь минимум за # дня}}',
        lastMinute:
          '{count, plural, one {Бронь за # час или меньше до поездки} few {Бронь за # часа или меньше до поездки} many {Бронь за # часов или меньше до поездки} other {Бронь за # часа или меньше до поездки}}',
        participantKind: 'Для: {kinds}',
        groupSize:
          '{count, plural, one {Группы от # человека} few {Группы от # человек} many {Группы от # человек} other {Группы от # человека}}',
        currency: 'Цена в {currency}',
      },
      adj: {
        percentOff: 'Скидка {percent}',
        percentExtra: 'Надбавка {percent}',
        amountOff: 'Скидка {amount}',
        amountExtra: 'Надбавка {amount}',
        override: 'Цена установлена: {amount}',
      },
      ruleOn: 'Включено',
      ruleOff: 'Выключено',
      ruleStarts: 'С {date}',
      ruleEnded: 'Закончилось {date}',
      ruleBroken: 'Ошибка',
    },
    priceRule: { childRate: 'Детский тариф', studentRate: 'Студенческий тариф' },
    category: {
      scubaDiving: 'Дайвинг с аквалангом',
      kitesurfing: 'Кайтсёрфинг',
      boatTrips: 'Морские прогулки',
      coursesCertifications: 'Курсы и сертификаты',
      gearRental: 'Прокат снаряжения',
      photography: 'Фотография',
    },
  },

  'it-IT': {
    nav: 'Prezzi',
    pricing: {
      title: 'Prezzi',
      subtitle: 'Il listino di ogni servizio e quanto pagherebbe un viaggiatore.',
      rateCards: 'Listini',
      untitled: 'Servizio senza titolo',
      byline: '{vendor} · {model}',
      noModel: 'Nessun modello di prezzo',
      noPrice: 'Senza prezzo',
      kind: {
        perPerson: 'A persona',
        perGroup: 'A gruppo',
        perPersonTiered: 'A persona, per dimensione del gruppo',
        perUnitPerDay: 'A unità, al giorno',
        free: 'Gratuito',
      },
      kindHint: {
        perPerson: 'Ogni persona pagante paga il prezzo base.',
        perGroup: 'Un solo prezzo per tutto il gruppo, di qualsiasi dimensione.',
        perPersonTiered: 'Un prezzo a persona che scende quando il gruppo cresce.',
        perUnitPerDay: 'Un noleggio: il prezzo per le unità, per i giorni.',
        free: 'Nessuno paga.',
      },
      colCategory: 'Categoria',
      colRules: 'Regole',
      colListing: 'Annuncio',
      colBase: 'Prezzo base',
      colModel: 'Modello',
      rulesCount: '{active} attive su {total}',
      unpricedBanner:
        '{count, plural, one {# servizio non si può quotare} other {# servizi non si possono quotare}}',
      unpricedDetail:
        'Un servizio senza modello di prezzo non ha prezzo, quindi nessuno può prenotarlo.',
      twoModels:
        '{count, plural, one {# servizio ha più di un modello di prezzo} other {# servizi hanno più di un modello di prezzo}}',
      twoModelsHere: 'Questo servizio ha più di un modello di prezzo',
      twoModelsDetail: 'Si usa solo il più recente. Quelli vecchi vanno rimossi.',
      priced: 'Con prezzo',
      ofServices: 'su {total} servizi',
      unpriced: 'Senza prezzo',
      activeRules: 'Regole attive',
      noFx:
        'Nessuna fonte di tassi di cambio è collegata, quindi i prezzi sono solo in EGP, senza equivalente in EUR.',
      readOnly: 'Sola lettura: la modifica dei prezzi non è ancora disponibile.',
      none: 'Ancora nessun servizio.',
      colRule: 'Regola',
      colWhen: 'Si applica quando',
      colChange: 'Variazione',
      colOrder: 'Ordine',
      colStacks: 'Si somma',
      brokenCondition: 'La condizione non corrisponde al suo tipo',
      brokenAdjustment: 'La variazione non corrisponde al suo tipo',
      stacksYes: 'Sì',
      stacksNo: 'No',
      stacksNoGroup: 'No, nel gruppo {group}',
      noModelTitle: 'Questo servizio non si può quotare',
      noModelDetail: 'Non ha un modello di prezzo, quindi non ha prezzo.',
      brokenBanner:
        '{count, plural, one {# regola non rispetta il contratto} other {# regole non rispettano il contratto}}',
      brokenDetail:
        'Il checkout rifiuterebbe un prezzo calcolato così, quindi resta fuori dal calcolo.',
      openOperator: 'Operatore',
      model: 'Modello',
      maxGroup: 'Gruppo massimo',
      partySize: 'Dimensione del gruppo',
      partyFrom: '{min} o più persone',
      partyRange: 'Da {min} a {max} persone',
      tiers: 'Fasce per dimensione del gruppo',
      noTiers: 'Nessuna fascia. Il prezzo base vale per ogni dimensione del gruppo.',
      tierFrom: '{count, plural, one {Da # persona} other {Da # persone}}',
      rules: 'Regole',
      rulesSub: "Applicate in quest'ordine. Le percentuali si sommano nello stesso ordine.",
      noRules: 'Nessuna regola. Ogni persona pagante paga il prezzo base.',
      check: 'Calcolo del prezzo',
      checkSub:
        'Calcolato con la stessa funzione del checkout: è quanto pagherebbe un viaggiatore.',
      checkDate: 'Data del viaggio',
      checkRun: 'Calcola il prezzo',
      checkRuleNote: 'Regola',
      checkTotal: 'Totale',
      checkAssumption: 'Per un viaggio il {date}, prenotato ora',
      checkPaying: 'Paganti',
      checkSeats: 'Posti occupati',
      checkNotCharged: 'Neonati e istruttori accompagnatori occupano un posto ma non pagano.',
      checkOutside: 'Questo gruppo è fuori dalle dimensioni accettate dal servizio',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: "Non c'è un modello di prezzo con cui calcolare.",
        emptyParty: 'Aggiungi almeno una persona.',
        needsUnitBasis:
          'È un noleggio, e il database non può ancora dire se si paga a persona, a oggetto o a gruppo.',
        groupTooLarge: 'Questo gruppo supera il gruppo massimo coperto da questo prezzo.',
        refused: "Questo listino non si può calcolare così com'è.",
      },
      unlabelledRule: 'Regola senza nome',
      cond: {
        always: 'Sempre',
        seasonal: 'Viaggi dal {start} al {end}',
        dayOfWeek: 'Viaggi di {days}',
        earlyBird:
          '{count, plural, one {Prenotato almeno # giorno prima} other {Prenotato almeno # giorni prima}}',
        lastMinute:
          '{count, plural, one {Prenotato # ora o meno prima del viaggio} other {Prenotato # ore o meno prima del viaggio}}',
        participantKind: 'Per: {kinds}',
        groupSize: '{count, plural, one {Gruppi da # in su} other {Gruppi da # in su}}',
        currency: 'Prezzo in {currency}',
      },
      adj: {
        percentOff: '{percent} di sconto',
        percentExtra: '{percent} in più',
        amountOff: '{amount} di sconto',
        amountExtra: '{amount} in più',
        override: 'Prezzo fissato a {amount}',
      },
      ruleOn: 'Attiva',
      ruleOff: 'Disattivata',
      ruleStarts: 'Dal {date}',
      ruleEnded: 'Finita il {date}',
      ruleBroken: 'Non valida',
    },
    priceRule: { childRate: 'Tariffa bambini', studentRate: 'Tariffa studenti' },
    category: {
      scubaDiving: 'Immersioni con bombole',
      kitesurfing: 'Kitesurf',
      boatTrips: 'Gite in barca',
      coursesCertifications: 'Corsi e brevetti',
      gearRental: 'Noleggio attrezzatura',
      photography: 'Fotografia',
    },
  },

  'fr-FR': {
    nav: 'Tarifs',
    pricing: {
      title: 'Tarifs',
      subtitle: "La grille tarifaire de chaque service, et ce qu'un voyageur paierait.",
      rateCards: 'Grilles tarifaires',
      untitled: 'Service sans titre',
      byline: '{vendor} · {model}',
      noModel: 'Aucun modèle de prix',
      noPrice: 'Sans prix',
      kind: {
        perPerson: 'Par personne',
        perGroup: 'Par groupe',
        perPersonTiered: 'Par personne, selon la taille du groupe',
        perUnitPerDay: 'Par unité et par jour',
        free: 'Gratuit',
      },
      kindHint: {
        perPerson: 'Chaque personne payante paie le prix de base.',
        perGroup: 'Un seul prix pour tout le groupe, quelle que soit sa taille.',
        perPersonTiered: 'Un prix par personne qui baisse quand le groupe grandit.',
        perUnitPerDay: 'Une location : le prix, fois les unités, fois les jours.',
        free: 'Personne ne paie.',
      },
      colCategory: 'Catégorie',
      colRules: 'Règles',
      colListing: 'Annonce',
      colBase: 'Prix de base',
      colModel: 'Modèle',
      rulesCount: '{active} actives sur {total}',
      unpricedBanner:
        '{count, plural, one {# service ne peut pas être chiffré} other {# services ne peuvent pas être chiffrés}}',
      unpricedDetail: "Un service sans modèle de prix n'a pas de prix : personne ne peut le réserver.",
      twoModels:
        "{count, plural, one {# service a plus d'un modèle de prix} other {# services ont plus d'un modèle de prix}}",
      twoModelsHere: "Ce service a plus d'un modèle de prix",
      twoModelsDetail: 'Seul le plus récent est utilisé. Les anciens doivent être supprimés.',
      priced: 'Avec prix',
      ofServices: 'sur {total} services',
      unpriced: 'Sans prix',
      activeRules: 'Règles actives',
      noFx:
        "Aucune source de taux de change n'est connectée : les prix sont affichés en EGP seulement, sans équivalent en EUR.",
      readOnly: "Lecture seule : la modification des prix n'est pas encore disponible.",
      none: "Aucun service pour l'instant.",
      colRule: 'Règle',
      colWhen: "S'applique quand",
      colChange: 'Modification',
      colOrder: 'Ordre',
      colStacks: 'Cumulable',
      brokenCondition: 'La condition ne correspond pas à son type',
      brokenAdjustment: 'La modification ne correspond pas à son type',
      stacksYes: 'Oui',
      stacksNo: 'Non',
      stacksNoGroup: 'Non, dans le groupe {group}',
      noModelTitle: 'Ce service ne peut pas être chiffré',
      noModelDetail: "Il n'a pas de modèle de prix, donc pas de prix.",
      brokenBanner:
        '{count, plural, one {# règle ne respecte pas le contrat} other {# règles ne respectent pas le contrat}}',
      brokenDetail: 'Le paiement refuserait un prix calculé ainsi : elle est exclue du calcul.',
      openOperator: 'Opérateur',
      model: 'Modèle',
      maxGroup: 'Groupe maximal',
      partySize: 'Taille du groupe',
      partyFrom: '{min} personnes ou plus',
      partyRange: 'De {min} à {max} personnes',
      tiers: 'Paliers selon la taille du groupe',
      noTiers: "Aucun palier. Le prix de base s'applique à toute taille de groupe.",
      tierFrom: '{count, plural, one {À partir de # personne} other {À partir de # personnes}}',
      rules: 'Règles',
      rulesSub: 'Appliquées dans cet ordre. Les pourcentages se cumulent dans le même ordre.',
      noRules: 'Aucune règle. Chaque personne payante paie le prix de base.',
      check: 'Calcul du prix',
      checkSub:
        "Calculé par la même fonction que le paiement : c'est ce qu'un voyageur paierait.",
      checkDate: 'Date du voyage',
      checkRun: 'Calculer le prix',
      checkRuleNote: 'Règle',
      checkTotal: 'Total',
      checkAssumption: 'Pour un voyage le {date}, réservé maintenant',
      checkPaying: 'Payants',
      checkSeats: 'Places occupées',
      checkNotCharged:
        'Les bébés et les moniteurs accompagnateurs occupent une place mais ne paient pas.',
      checkOutside: 'Ce groupe sort de la taille acceptée par le service',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: "Il n'y a pas de modèle de prix pour calculer.",
        emptyParty: 'Ajoutez au moins une personne.',
        needsUnitBasis:
          "C'est une location, et la base de données ne peut pas encore dire si elle se paie par personne, par article ou par groupe.",
        groupTooLarge: 'Ce groupe dépasse le groupe maximal couvert par ce prix.',
        refused: "Cette grille ne peut pas être calculée en l'état.",
      },
      unlabelledRule: 'Règle sans nom',
      cond: {
        always: 'Toujours',
        seasonal: 'Voyages du {start} au {end}',
        dayOfWeek: 'Voyages le {days}',
        earlyBird:
          '{count, plural, one {Réservé au moins # jour avant} other {Réservé au moins # jours avant}}',
        lastMinute:
          '{count, plural, one {Réservé # heure ou moins avant le voyage} other {Réservé # heures ou moins avant le voyage}}',
        participantKind: 'Pour : {kinds}',
        groupSize: '{count, plural, one {Groupes de # ou plus} other {Groupes de # ou plus}}',
        currency: 'Prix en {currency}',
      },
      adj: {
        percentOff: '{percent} de remise',
        percentExtra: '{percent} de supplément',
        amountOff: '{amount} de remise',
        amountExtra: '{amount} de supplément',
        override: 'Prix fixé à {amount}',
      },
      ruleOn: 'Active',
      ruleOff: 'Désactivée',
      ruleStarts: 'Dès le {date}',
      ruleEnded: 'Terminée le {date}',
      ruleBroken: 'Invalide',
    },
    priceRule: { childRate: 'Tarif enfant', studentRate: 'Tarif étudiant' },
    category: {
      scubaDiving: 'Plongée bouteille',
      kitesurfing: 'Kitesurf',
      boatTrips: 'Sorties en bateau',
      coursesCertifications: 'Cours et certifications',
      gearRental: 'Location de matériel',
      photography: 'Photographie',
    },
  },

  'es-ES': {
    nav: 'Precios',
    pricing: {
      title: 'Precios',
      subtitle: 'La tarifa de cada servicio y lo que pagaría un viajero.',
      rateCards: 'Tarifas',
      untitled: 'Servicio sin título',
      byline: '{vendor} · {model}',
      noModel: 'Sin modelo de precio',
      noPrice: 'Sin precio',
      kind: {
        perPerson: 'Por persona',
        perGroup: 'Por grupo',
        perPersonTiered: 'Por persona, según el tamaño del grupo',
        perUnitPerDay: 'Por unidad y día',
        free: 'Gratis',
      },
      kindHint: {
        perPerson: 'Cada persona que paga abona el precio base.',
        perGroup: 'Un solo precio para todo el grupo, sea del tamaño que sea.',
        perPersonTiered: 'Un precio por persona que baja cuando el grupo crece.',
        perUnitPerDay: 'Un alquiler: el precio, por las unidades, por los días.',
        free: 'Nadie paga.',
      },
      colCategory: 'Categoría',
      colRules: 'Reglas',
      colListing: 'Anuncio',
      colBase: 'Precio base',
      colModel: 'Modelo',
      rulesCount: '{active} activas de {total}',
      unpricedBanner:
        '{count, plural, one {# servicio no se puede presupuestar} other {# servicios no se pueden presupuestar}}',
      unpricedDetail:
        'Un servicio sin modelo de precio no tiene precio, así que nadie puede reservarlo.',
      twoModels:
        '{count, plural, one {# servicio tiene más de un modelo de precio} other {# servicios tienen más de un modelo de precio}}',
      twoModelsHere: 'Este servicio tiene más de un modelo de precio',
      twoModelsDetail: 'Solo se usa el más reciente. Los antiguos deberían eliminarse.',
      priced: 'Con precio',
      ofServices: 'de {total} servicios',
      unpriced: 'Sin precio',
      activeRules: 'Reglas activas',
      noFx:
        'No hay ninguna fuente de tipos de cambio conectada, así que los precios se muestran solo en EGP, sin equivalente en EUR.',
      readOnly: 'Solo lectura: cambiar un precio aún no está disponible.',
      none: 'Aún no hay servicios.',
      colRule: 'Regla',
      colWhen: 'Se aplica cuando',
      colChange: 'Cambio',
      colOrder: 'Orden',
      colStacks: 'Acumulable',
      brokenCondition: 'La condición no coincide con su tipo',
      brokenAdjustment: 'El cambio no coincide con su tipo',
      stacksYes: 'Sí',
      stacksNo: 'No',
      stacksNoGroup: 'No, dentro de {group}',
      noModelTitle: 'Este servicio no se puede presupuestar',
      noModelDetail: 'No tiene modelo de precio, así que no tiene precio.',
      brokenBanner:
        '{count, plural, one {# regla no cumple el contrato} other {# reglas no cumplen el contrato}}',
      brokenDetail:
        'El pago rechazaría un precio calculado con ella, así que queda fuera del cálculo.',
      openOperator: 'Operador',
      model: 'Modelo',
      maxGroup: 'Grupo máximo',
      partySize: 'Tamaño del grupo',
      partyFrom: '{min} personas o más',
      partyRange: 'De {min} a {max} personas',
      tiers: 'Tramos por tamaño de grupo',
      noTiers: 'Sin tramos. El precio base vale para cualquier tamaño de grupo.',
      tierFrom: '{count, plural, one {Desde # persona} other {Desde # personas}}',
      rules: 'Reglas',
      rulesSub: 'Se aplican en este orden. Los porcentajes se acumulan en el mismo orden.',
      noRules: 'Sin reglas. Cada persona que paga abona el precio base.',
      check: 'Cálculo del precio',
      checkSub:
        'Se calcula con la misma función que el pago, así que es lo que pagaría un viajero.',
      checkDate: 'Fecha del viaje',
      checkRun: 'Calcular el precio',
      checkRuleNote: 'Regla',
      checkTotal: 'Total',
      checkAssumption: 'Para un viaje el {date}, reservado ahora',
      checkPaying: 'Pagan',
      checkSeats: 'Plazas ocupadas',
      checkNotCharged: 'Los bebés y los instructores acompañantes ocupan plaza pero no pagan.',
      checkOutside: 'Este grupo no encaja en el tamaño que admite el servicio',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: 'No hay modelo de precio con el que calcular.',
        emptyParty: 'Añade al menos una persona.',
        needsUnitBasis:
          'Es un alquiler, y la base de datos aún no puede indicar si se cobra por persona, por artículo o por grupo.',
        groupTooLarge: 'Este grupo supera el grupo máximo que cubre este precio.',
        refused: 'Esta tarifa no se puede calcular tal como está.',
      },
      unlabelledRule: 'Regla sin nombre',
      cond: {
        always: 'Siempre',
        seasonal: 'Viajes del {start} al {end}',
        dayOfWeek: 'Viajes en {days}',
        earlyBird:
          '{count, plural, one {Reservado con # día o más de antelación} other {Reservado con # días o más de antelación}}',
        lastMinute:
          '{count, plural, one {Reservado # hora o menos antes del viaje} other {Reservado # horas o menos antes del viaje}}',
        participantKind: 'Para: {kinds}',
        groupSize: '{count, plural, one {Grupos de # o más} other {Grupos de # o más}}',
        currency: 'Precio en {currency}',
      },
      adj: {
        percentOff: '{percent} de descuento',
        percentExtra: '{percent} de recargo',
        amountOff: '{amount} de descuento',
        amountExtra: '{amount} de recargo',
        override: 'Precio fijado en {amount}',
      },
      ruleOn: 'Activa',
      ruleOff: 'Desactivada',
      ruleStarts: 'Desde el {date}',
      ruleEnded: 'Terminó el {date}',
      ruleBroken: 'No válida',
    },
    priceRule: { childRate: 'Tarifa infantil', studentRate: 'Tarifa de estudiante' },
    category: {
      scubaDiving: 'Buceo con botella',
      kitesurfing: 'Kitesurf',
      boatTrips: 'Excursiones en barco',
      coursesCertifications: 'Cursos y certificaciones',
      gearRental: 'Alquiler de equipo',
      photography: 'Fotografía',
    },
  },

  'de-DE': {
    nav: 'Preise',
    pricing: {
      title: 'Preise',
      subtitle: 'Die Preisliste jedes Angebots und was ein Reisender zahlen würde.',
      rateCards: 'Preislisten',
      untitled: 'Angebot ohne Titel',
      byline: '{vendor} · {model}',
      noModel: 'Kein Preismodell',
      noPrice: 'Ohne Preis',
      kind: {
        perPerson: 'Pro Person',
        perGroup: 'Pro Gruppe',
        perPersonTiered: 'Pro Person, nach Gruppengröße',
        perUnitPerDay: 'Pro Einheit und Tag',
        free: 'Kostenlos',
      },
      kindHint: {
        perPerson: 'Jede zahlende Person zahlt den Grundpreis.',
        perGroup: 'Ein Preis für die ganze Gruppe, egal wie groß.',
        perPersonTiered: 'Ein Preis pro Person, der mit wachsender Gruppe sinkt.',
        perUnitPerDay: 'Eine Vermietung: Preis mal Einheiten mal Tage.',
        free: 'Niemand zahlt.',
      },
      colCategory: 'Kategorie',
      colRules: 'Regeln',
      colListing: 'Inserat',
      colBase: 'Grundpreis',
      colModel: 'Modell',
      rulesCount: '{active} von {total} aktiv',
      unpricedBanner:
        '{count, plural, one {# Angebot kann nicht berechnet werden} other {# Angebote können nicht berechnet werden}}',
      unpricedDetail:
        'Ein Angebot ohne Preismodell hat keinen Preis, also kann es niemand buchen.',
      twoModels:
        '{count, plural, one {# Angebot hat mehr als ein Preismodell} other {# Angebote haben mehr als ein Preismodell}}',
      twoModelsHere: 'Dieses Angebot hat mehr als ein Preismodell',
      twoModelsDetail: 'Nur das neueste wird verwendet. Die älteren sollten entfernt werden.',
      priced: 'Mit Preis',
      ofServices: 'von {total} Angeboten',
      unpriced: 'Ohne Preis',
      activeRules: 'Aktive Regeln',
      noFx:
        'Es ist keine Wechselkursquelle angebunden, daher werden Preise nur in EGP angezeigt, ohne EUR-Gegenwert.',
      readOnly: 'Nur lesen: Preise ändern ist noch nicht gebaut.',
      none: 'Noch keine Angebote.',
      colRule: 'Regel',
      colWhen: 'Gilt, wenn',
      colChange: 'Änderung',
      colOrder: 'Reihenfolge',
      colStacks: 'Kombinierbar',
      brokenCondition: 'Bedingung passt nicht zu ihrem Typ',
      brokenAdjustment: 'Änderung passt nicht zu ihrem Typ',
      stacksYes: 'Ja',
      stacksNo: 'Nein',
      stacksNoGroup: 'Nein, innerhalb von {group}',
      noModelTitle: 'Dieses Angebot kann nicht berechnet werden',
      noModelDetail: 'Es hat kein Preismodell und damit keinen Preis.',
      brokenBanner:
        '{count, plural, one {# Regel entspricht nicht dem Vertrag} other {# Regeln entsprechen nicht dem Vertrag}}',
      brokenDetail:
        'Der Checkout würde einen damit berechneten Preis ablehnen, daher bleibt sie aus der Berechnung.',
      openOperator: 'Anbieter',
      model: 'Modell',
      maxGroup: 'Größte Gruppe',
      partySize: 'Gruppengröße',
      partyFrom: 'Ab {min} Personen',
      partyRange: '{min} bis {max} Personen',
      tiers: 'Staffeln nach Gruppengröße',
      noTiers: 'Keine Staffeln. Der Grundpreis gilt für jede Gruppengröße.',
      tierFrom: '{count, plural, one {Ab # Person} other {Ab # Personen}}',
      rules: 'Regeln',
      rulesSub:
        'Werden in dieser Reihenfolge angewendet. Prozentsätze bauen in derselben Reihenfolge aufeinander auf.',
      noRules: 'Keine Regeln. Jede zahlende Person zahlt den Grundpreis.',
      check: 'Preis berechnen',
      checkSub:
        'Berechnet mit derselben Funktion wie der Checkout – genau das würde ein Reisender zahlen.',
      checkDate: 'Reisedatum',
      checkRun: 'Preis berechnen',
      checkRuleNote: 'Regel',
      checkTotal: 'Gesamt',
      checkAssumption: 'Für eine Reise am {date}, jetzt gebucht',
      checkPaying: 'Zahlend',
      checkSeats: 'Belegte Plätze',
      checkNotCharged:
        'Kleinkinder und begleitende Tauchlehrer belegen einen Platz, zahlen aber nicht.',
      checkOutside: 'Diese Gruppe liegt außerhalb der Größe, die das Angebot annimmt',
      checkLine: '{kind} × {heads}',
      refusal: {
        noModel: 'Es gibt kein Preismodell, mit dem gerechnet werden kann.',
        emptyParty: 'Füge mindestens eine Person hinzu.',
        needsUnitBasis:
          'Das ist eine Vermietung, und die Datenbank kann noch nicht angeben, ob pro Person, pro Stück oder pro Gruppe abgerechnet wird.',
        groupTooLarge: 'Diese Gruppe ist größer als die größte Gruppe, die dieser Preis abdeckt.',
        refused: 'Diese Preisliste lässt sich so nicht berechnen.',
      },
      unlabelledRule: 'Regel ohne Namen',
      cond: {
        always: 'Immer',
        seasonal: 'Reisen vom {start} bis {end}',
        dayOfWeek: 'Reisen am {days}',
        earlyBird:
          '{count, plural, one {Mindestens # Tag vorher gebucht} other {Mindestens # Tage vorher gebucht}}',
        lastMinute:
          '{count, plural, one {Höchstens # Stunde vor der Reise gebucht} other {Höchstens # Stunden vor der Reise gebucht}}',
        participantKind: 'Für: {kinds}',
        groupSize: '{count, plural, one {Gruppen ab # Person} other {Gruppen ab # Personen}}',
        currency: 'Preis in {currency}',
      },
      adj: {
        percentOff: '{percent} Rabatt',
        percentExtra: '{percent} Aufschlag',
        amountOff: '{amount} Rabatt',
        amountExtra: '{amount} Aufschlag',
        override: 'Preis auf {amount} gesetzt',
      },
      ruleOn: 'Aktiv',
      ruleOff: 'Aus',
      ruleStarts: 'Ab {date}',
      ruleEnded: 'Beendet am {date}',
      ruleBroken: 'Fehlerhaft',
    },
    priceRule: { childRate: 'Kindertarif', studentRate: 'Studententarif' },
    category: {
      scubaDiving: 'Gerätetauchen',
      kitesurfing: 'Kitesurfen',
      boatTrips: 'Bootsausflüge',
      coursesCertifications: 'Kurse und Zertifikate',
      gearRental: 'Ausrüstungsverleih',
      photography: 'Fotografie',
    },
  },
};

function leaves(value, prefix, out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}.${key}`;
    if (typeof child === 'object' && child !== null) leaves(child, path, out);
    else out.set(path, child);
  }
  return out;
}

/** The dotted key of every string a block writes, against the whole catalogue. */
function flatten(block) {
  return new Map([
    ['admin.nav.pricing', block.nav],
    ...leaves(block.pricing, 'admin.pricing'),
    ...leaves(block.priceRule, 'priceRule'),
    ...leaves(block.category, 'category'),
  ]);
}

const source = flatten(BLOCKS['en-GB']);

for (const [locale, block] of Object.entries(BLOCKS)) {
  const written = flatten(block);
  const missing = [...source.keys()].filter((key) => !written.has(key));
  if (missing.length > 0) throw new Error(`${locale} is missing ${missing.join(', ')}`);

  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  // Additive only. A key that already exists is somebody else's decision.
  for (const key of Object.keys(block.priceRule)) {
    if (catalogue.priceRule?.[key] !== undefined) throw new Error(`${locale}: priceRule.${key} exists`);
  }
  for (const key of Object.keys(block.category)) {
    if (catalogue.category?.[key] !== undefined) throw new Error(`${locale}: category.${key} exists`);
  }

  catalogue.admin.nav.pricing = block.nav;
  catalogue.admin.pricing = block.pricing;
  catalogue.priceRule = { ...catalogue.priceRule, ...block.priceRule };
  catalogue.category = { ...catalogue.category, ...block.category };

  // A string that is the same as English on purpose — "{vendor} · {model}",
  // "Total" in French and Spanish — is declared, so the gate can tell it from
  // a string nobody translated.
  if (locale !== 'en-GB') {
    const identical = [...written].filter(([key, value]) => source.get(key) === value).map(([key]) => key);
    if (identical.length > 0) {
      const existing = catalogue.$meta.identicalToSource ?? [];
      catalogue.$meta.identicalToSource = [...new Set([...existing, ...identical])].sort();
    }
    console.log(`pricing keys → ${locale} (identical to en-GB: ${identical.join(', ') || 'none'})`);
  } else {
    console.log(`pricing keys → ${locale} (${source.size} keys)`);
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
}
