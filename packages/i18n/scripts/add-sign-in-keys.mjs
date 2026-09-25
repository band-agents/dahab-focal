/**
 * The console's sign-in strings, in all seven locales.
 *
 * Merged into the existing `admin` namespace rather than replacing it, so
 * this script is safe to re-run and cannot quietly drop a board's keys.
 *
 *   node scripts/add-sign-in-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'en-GB': {
    signIn: {
      title: 'Sign in',
      subtitle: 'The console is for platform staff.',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      invalid: 'That email and password do not match an account.',
      unreachable:
        'The API did not answer. Nothing is wrong with your password — try again in a moment.',
      noSelfServe: 'Accounts are created by a platform administrator. There is no sign-up.',
    },
    signOut: 'Sign out',
    signedInAs: 'Signed in as {email}',
  },
  'ar-EG': {
    signIn: {
      title: 'تسجيل الدخول',
      subtitle: 'الكونسول ده لموظفي المنصة.',
      email: 'البريد الإلكتروني',
      password: 'كلمة السر',
      submit: 'دخول',
      invalid: 'البريد وكلمة السر مش مطابقين لأي حساب.',
      unreachable: 'الـ API مردّش. المشكلة مش في كلمة السر — جرّب تاني بعد شوية.',
      noSelfServe: 'الحسابات بيعملها مسؤول المنصة. مفيش تسجيل ذاتي.',
    },
    signOut: 'خروج',
    signedInAs: 'داخل باسم {email}',
  },
  'ru-RU': {
    signIn: {
      title: 'Вход',
      subtitle: 'Консоль — для сотрудников платформы.',
      email: 'Электронная почта',
      password: 'Пароль',
      submit: 'Войти',
      invalid: 'Эта почта и пароль не подходят ни к одной учётной записи.',
      unreachable: 'API не ответил. Дело не в пароле — попробуйте через минуту.',
      noSelfServe:
        'Учётные записи создаёт администратор платформы. Самостоятельной регистрации нет.',
    },
    signOut: 'Выйти',
    signedInAs: 'Вы вошли как {email}',
  },
  'it-IT': {
    signIn: {
      title: 'Accedi',
      subtitle: 'La console è per il personale della piattaforma.',
      email: 'Email',
      password: 'Password',
      submit: 'Accedi',
      invalid: 'Questa email e questa password non corrispondono a nessun account.',
      unreachable: 'L’API non ha risposto. Non dipende dalla password — riprova tra poco.',
      noSelfServe:
        'Gli account li crea un amministratore della piattaforma. Non c’è registrazione.',
    },
    signOut: 'Esci',
    signedInAs: 'Accesso come {email}',
  },
  'fr-FR': {
    signIn: {
      title: 'Connexion',
      subtitle: 'La console est réservée au personnel de la plateforme.',
      email: 'E-mail',
      password: 'Mot de passe',
      submit: 'Se connecter',
      invalid: 'Cet e-mail et ce mot de passe ne correspondent à aucun compte.',
      unreachable:
        'L’API n’a pas répondu. Le mot de passe n’est pas en cause — réessayez dans un instant.',
      noSelfServe:
        'Les comptes sont créés par un administrateur de la plateforme. Il n’y a pas d’inscription.',
    },
    signOut: 'Se déconnecter',
    signedInAs: 'Connecté en tant que {email}',
  },
  'es-ES': {
    signIn: {
      title: 'Iniciar sesión',
      subtitle: 'La consola es para el personal de la plataforma.',
      email: 'Correo electrónico',
      password: 'Contraseña',
      submit: 'Entrar',
      invalid: 'Ese correo y esa contraseña no coinciden con ninguna cuenta.',
      unreachable: 'La API no respondió. No es tu contraseña — inténtalo de nuevo en un momento.',
      noSelfServe: 'Las cuentas las crea un administrador de la plataforma. No hay registro.',
    },
    signOut: 'Salir',
    signedInAs: 'Sesión iniciada como {email}',
  },
  'de-DE': {
    signIn: {
      title: 'Anmelden',
      subtitle: 'Die Konsole ist für Plattform-Mitarbeitende.',
      email: 'E-Mail',
      password: 'Passwort',
      submit: 'Anmelden',
      invalid: 'Diese E-Mail und dieses Passwort gehören zu keinem Konto.',
      unreachable:
        'Die API hat nicht geantwortet. Es liegt nicht am Passwort — versuchen Sie es gleich noch einmal.',
      noSelfServe:
        'Konten legt eine Plattform-Administration an. Eine Selbstregistrierung gibt es nicht.',
    },
    signOut: 'Abmelden',
    signedInAs: 'Angemeldet als {email}',
  },
};

/** Italian borrowed both words whole; nothing else matches the source. */
const IDENTICAL = {
  'it-IT': ['admin.signIn.email', 'admin.signIn.password'],
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
  console.log(`sign-in keys → ${locale}`);
}
