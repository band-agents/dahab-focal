/**
 * Strings for creating an operator from the roster: the form, the owner line
 * on the operator's page, and the four outcomes the form can land with.
 *
 * Written in all seven locales. The ru, it, fr, es and de strings were written
 * by Claude and have not been read by a native speaker.
 *
 *   node scripts/add-onboarding-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

/** The example number, isolated so it reads left to right inside Arabic. */
const EXAMPLE_LTR = '⁦+201001234567⁩';

const BLOCKS = {
  'en-GB': {
    add: 'Add an operator',
    summary:
      'A new centre starts as applied, and cannot publish anything until its papers are verified. Its owner gets an account now, without a password — the login is a separate step.',
    create: 'Create the operator',
    reasonHint: 'Who they are and how they came to us — an agreement signed, a visit, a referral.',
    owner: 'Owner',
    ownerCanSignIn: 'Has a login',
    ownerCannotSignIn: 'Cannot sign in yet: no login has been made',
    field: {
      name: 'Operator name',
      nameHint: 'As travellers will see it.',
      legalName: 'Legal name',
      legalNameHint: 'As on the commercial register.',
      area: 'Area',
      phone: 'Centre phone',
      phoneHint: 'With the country code and no spaces: +201001234567.',
      email: 'Centre email',
      ownerName: "Owner's name",
      ownerPhone: "Owner's phone",
      ownerEmail: "Owner's email",
      ownerContactHint: "The owner's phone or email — at least one.",
    },
    outcome: {
      invalid:
        'Something in the form was not accepted — check that phone numbers start with + and that nothing required is empty. Nothing was changed.',
      takenName: 'An operator with that name already exists. Nothing was changed.',
      takenEmail: 'That email already belongs to an account. Nothing was changed.',
      takenPhone: 'That phone number already belongs to an account. Nothing was changed.',
    },
  },

  'ar-EG': {
    add: 'ضيف مركز',
    summary:
      'المركز الجديد بيبدأ كطلب، ومش هيقدر ينشر أي حاجة لحد ما أوراقه تتراجع. صاحبه هياخد حساب دلوقتي من غير باسوورد — الدخول خطوة لوحدها.',
    create: 'اعمل المركز',
    reasonHint: 'مين هما وجُم لنا إزاي — اتفاق اتمضى، زيارة، ترشيح.',
    owner: 'صاحب المركز',
    ownerCanSignIn: 'عنده دخول',
    ownerCannotSignIn: 'لسه مش هيقدر يدخل: مفيش دخول اتعمل له',
    field: {
      name: 'اسم المركز',
      nameHint: 'زي ما المسافرين هيشوفوه.',
      legalName: 'الاسم القانوني',
      legalNameHint: 'زي ما هو في السجل التجاري.',
      area: 'المنطقة',
      phone: 'تليفون المركز',
      phoneHint: `بكود الدولة ومن غير مسافات: ${EXAMPLE_LTR}.`,
      email: 'إيميل المركز',
      ownerName: 'اسم صاحب المركز',
      ownerPhone: 'تليفون صاحب المركز',
      ownerEmail: 'إيميل صاحب المركز',
      ownerContactHint: 'تليفون صاحب المركز أو إيميله — واحد على الأقل.',
    },
    outcome: {
      invalid:
        'في حاجة في الفورم متقبلتش — اتأكد إن أرقام التليفون بتبدأ بـ + ومفيش خانة مطلوبة فاضية. متغيرش أي حاجة.',
      takenName: 'في مركز بنفس الاسم ده. متغيرش أي حاجة.',
      takenEmail: 'الإيميل ده تبع حساب موجود. متغيرش أي حاجة.',
      takenPhone: 'رقم التليفون ده تبع حساب موجود. متغيرش أي حاجة.',
    },
  },

  'ru-RU': {
    add: 'Добавить оператора',
    summary:
      'Новый центр начинает со статусом «заявка» и ничего не может публиковать, пока его документы не проверены. Владелец получает учётную запись сейчас, без пароля — вход создаётся отдельным шагом.',
    create: 'Создать оператора',
    reasonHint: 'Кто это и как к нам пришёл — подписанное соглашение, визит, рекомендация.',
    owner: 'Владелец',
    ownerCanSignIn: 'Есть вход',
    ownerCannotSignIn: 'Пока не может войти: вход не создан',
    field: {
      name: 'Название оператора',
      nameHint: 'Так, как его увидят путешественники.',
      legalName: 'Юридическое название',
      legalNameHint: 'Как в коммерческом реестре.',
      area: 'Район',
      phone: 'Телефон центра',
      phoneHint: 'С кодом страны и без пробелов: +201001234567.',
      email: 'Эл. почта центра',
      ownerName: 'Имя владельца',
      ownerPhone: 'Телефон владельца',
      ownerEmail: 'Эл. почта владельца',
      ownerContactHint: 'Телефон или эл. почта владельца — хотя бы одно.',
    },
    outcome: {
      invalid:
        'Что-то в форме не принято — проверьте, что номера телефонов начинаются с +, а обязательные поля заполнены. Ничего не изменено.',
      takenName: 'Оператор с таким названием уже есть. Ничего не изменено.',
      takenEmail: 'Эта эл. почта уже принадлежит учётной записи. Ничего не изменено.',
      takenPhone: 'Этот номер телефона уже принадлежит учётной записи. Ничего не изменено.',
    },
  },

  'it-IT': {
    add: 'Aggiungi un operatore',
    summary:
      "Un nuovo centro parte come candidatura e non può pubblicare nulla finché i suoi documenti non sono verificati. Il titolare riceve subito un account, senza password: l'accesso è un passaggio a parte.",
    create: "Crea l'operatore",
    reasonHint:
      'Chi sono e come sono arrivati da noi: un accordo firmato, una visita, una segnalazione.',
    owner: 'Titolare',
    ownerCanSignIn: 'Ha un accesso',
    ownerCannotSignIn: 'Non può ancora accedere: nessun accesso creato',
    field: {
      name: "Nome dell'operatore",
      nameHint: 'Come lo vedranno i viaggiatori.',
      legalName: 'Ragione sociale',
      legalNameHint: 'Come nel registro delle imprese.',
      area: 'Zona',
      phone: 'Telefono del centro',
      phoneHint: 'Con il prefisso internazionale e senza spazi: +201001234567.',
      email: 'Email del centro',
      ownerName: 'Nome del titolare',
      ownerPhone: 'Telefono del titolare',
      ownerEmail: 'Email del titolare',
      ownerContactHint: 'Telefono o email del titolare: almeno uno.',
    },
    outcome: {
      invalid:
        'Qualcosa nel modulo non è stato accettato: controlla che i numeri inizino con + e che i campi obbligatori non siano vuoti. Non è cambiato nulla.',
      takenName: 'Esiste già un operatore con questo nome. Non è cambiato nulla.',
      takenEmail: 'Questa email appartiene già a un account. Non è cambiato nulla.',
      takenPhone: 'Questo numero appartiene già a un account. Non è cambiato nulla.',
    },
  },

  'fr-FR': {
    add: 'Ajouter un opérateur',
    summary:
      "Un nouveau centre commence au statut de candidature et ne peut rien publier tant que ses documents ne sont pas vérifiés. Son propriétaire reçoit un compte dès maintenant, sans mot de passe : l'accès est une étape à part.",
    create: "Créer l'opérateur",
    reasonHint:
      'Qui ils sont et comment ils sont arrivés chez nous : un accord signé, une visite, une recommandation.',
    owner: 'Propriétaire',
    ownerCanSignIn: 'A un accès',
    ownerCannotSignIn: 'Ne peut pas encore se connecter : aucun accès créé',
    field: {
      name: "Nom de l'opérateur",
      nameHint: 'Tel que les voyageurs le verront.',
      legalName: 'Raison sociale',
      legalNameHint: 'Comme au registre du commerce.',
      area: 'Quartier',
      phone: 'Téléphone du centre',
      phoneHint: "Avec l'indicatif du pays et sans espaces : +201001234567.",
      email: 'E-mail du centre',
      ownerName: 'Nom du propriétaire',
      ownerPhone: 'Téléphone du propriétaire',
      ownerEmail: 'E-mail du propriétaire',
      ownerContactHint: "Le téléphone ou l'e-mail du propriétaire : au moins l'un des deux.",
    },
    outcome: {
      invalid:
        "Un élément du formulaire n'a pas été accepté : vérifiez que les numéros commencent par + et qu'aucun champ obligatoire n'est vide. Rien n'a été modifié.",
      takenName: "Un opérateur porte déjà ce nom. Rien n'a été modifié.",
      takenEmail: "Cet e-mail appartient déjà à un compte. Rien n'a été modifié.",
      takenPhone: "Ce numéro appartient déjà à un compte. Rien n'a été modifié.",
    },
  },

  'es-ES': {
    add: 'Añadir un operador',
    summary:
      'Un centro nuevo empieza como solicitud y no puede publicar nada hasta que se verifiquen sus documentos. Su propietario recibe una cuenta ahora, sin contraseña: el acceso es un paso aparte.',
    create: 'Crear el operador',
    reasonHint:
      'Quiénes son y cómo llegaron a nosotros: un acuerdo firmado, una visita, una recomendación.',
    owner: 'Propietario',
    ownerCanSignIn: 'Tiene acceso',
    ownerCannotSignIn: 'Aún no puede entrar: no se ha creado ningún acceso',
    field: {
      name: 'Nombre del operador',
      nameHint: 'Tal como lo verán los viajeros.',
      legalName: 'Razón social',
      legalNameHint: 'Como en el registro mercantil.',
      area: 'Zona',
      phone: 'Teléfono del centro',
      phoneHint: 'Con el prefijo del país y sin espacios: +201001234567.',
      email: 'Correo del centro',
      ownerName: 'Nombre del propietario',
      ownerPhone: 'Teléfono del propietario',
      ownerEmail: 'Correo del propietario',
      ownerContactHint: 'El teléfono o el correo del propietario: al menos uno.',
    },
    outcome: {
      invalid:
        'Algo del formulario no se ha aceptado: comprueba que los teléfonos empiecen por + y que no falte ningún campo obligatorio. No se ha cambiado nada.',
      takenName: 'Ya existe un operador con ese nombre. No se ha cambiado nada.',
      takenEmail: 'Ese correo ya pertenece a una cuenta. No se ha cambiado nada.',
      takenPhone: 'Ese teléfono ya pertenece a una cuenta. No se ha cambiado nada.',
    },
  },

  'de-DE': {
    add: 'Anbieter hinzufügen',
    summary:
      'Ein neues Zentrum startet als Bewerbung und kann nichts veröffentlichen, bis seine Unterlagen geprüft sind. Der Inhaber bekommt jetzt ein Konto, ohne Passwort – der Zugang ist ein eigener Schritt.',
    create: 'Anbieter anlegen',
    reasonHint:
      'Wer sie sind und wie sie zu uns kamen – ein unterschriebener Vertrag, ein Besuch, eine Empfehlung.',
    owner: 'Inhaber',
    ownerCanSignIn: 'Hat einen Zugang',
    ownerCannotSignIn: 'Kann sich noch nicht anmelden: kein Zugang angelegt',
    field: {
      name: 'Name des Anbieters',
      nameHint: 'So, wie Reisende ihn sehen.',
      legalName: 'Firmenname',
      legalNameHint: 'Wie im Handelsregister.',
      area: 'Viertel',
      phone: 'Telefon des Zentrums',
      phoneHint: 'Mit Ländervorwahl und ohne Leerzeichen: +201001234567.',
      email: 'E-Mail des Zentrums',
      ownerName: 'Name des Inhabers',
      ownerPhone: 'Telefon des Inhabers',
      ownerEmail: 'E-Mail des Inhabers',
      ownerContactHint: 'Telefon oder E-Mail des Inhabers – mindestens eins.',
    },
    outcome: {
      invalid:
        'Etwas im Formular wurde nicht angenommen – prüfe, dass Telefonnummern mit + beginnen und kein Pflichtfeld leer ist. Nichts wurde geändert.',
      takenName: 'Es gibt schon einen Anbieter mit diesem Namen. Nichts wurde geändert.',
      takenEmail: 'Diese E-Mail gehört schon zu einem Konto. Nichts wurde geändert.',
      takenPhone: 'Diese Telefonnummer gehört schon zu einem Konto. Nichts wurde geändert.',
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

const source = leaves(BLOCKS['en-GB'], 'admin.onboard');

for (const [locale, block] of Object.entries(BLOCKS)) {
  const written = leaves(block, 'admin.onboard');
  const missing = [...source.keys()].filter((key) => !written.has(key));
  if (missing.length > 0) throw new Error(`${locale} is missing ${missing.join(', ')}`);

  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  if (catalogue.admin.onboard !== undefined) throw new Error(`${locale}: admin.onboard exists`);
  catalogue.admin.onboard = block;

  if (locale !== 'en-GB') {
    const identical = [...written].filter(([key, value]) => source.get(key) === value).map(([key]) => key);
    if (identical.length > 0) {
      const existing = catalogue.$meta.identicalToSource ?? [];
      catalogue.$meta.identicalToSource = [...new Set([...existing, ...identical])].sort();
    }
    console.log(`onboarding keys → ${locale} (identical to en-GB: ${identical.join(', ') || 'none'})`);
  } else {
    console.log(`onboarding keys → ${locale} (${source.size} keys)`);
  }
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
}
