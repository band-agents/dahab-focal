/**
 * The operator app's sign-in strings, in all seven locales.
 *
 * Arabic first on this surface, like the rest of `vendor.*`: the people
 * running a dive centre in Dahab work in it. The English is written from the
 * Arabic here rather than the other way round.
 *
 *   node scripts/add-vendor-sign-in-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'ar-EG': {
    signIn: {
      brand: 'دهب فوكال',
      brandSub: 'تطبيق المركز',
      title: 'تسجيل الدخول',
      subtitle: 'ادخل بحساب المركز بتاعك.',
      email: 'البريد الإلكتروني',
      password: 'كلمة السر',
      submit: 'دخول',
      working: 'بيدخّلك…',
      invalid: 'البريد وكلمة السر مش مطابقين لأي حساب.',
      notVendor: 'الحساب ده مش تابع لأي مركز. التطبيق ده لأصحاب المراكز والدلائل.',
      unreachable: 'مش قادر يوصل للسيرفر. اتأكد من النت وجرّب تاني.',
      noSelfServe: 'الحسابات بتتعمل من إدارة المنصة. مفيش تسجيل ذاتي.',
    },
    todayGreetingAnon: 'صباح الخير.',
  },
  'en-GB': {
    signIn: {
      brand: 'Dahab Focal',
      brandSub: 'Operator app',
      title: 'Sign in',
      subtitle: 'Use your centre’s account.',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      working: 'Signing in…',
      invalid: 'That email and password do not match an account.',
      notVendor: 'That account does not belong to a centre. This app is for owners and guides.',
      unreachable: 'Could not reach the server. Check your signal and try again.',
      noSelfServe: 'Accounts are created by the platform. There is no sign-up.',
    },
    todayGreetingAnon: 'Good morning.',
  },
  'ru-RU': {
    signIn: {
      brand: 'Dahab Focal',
      brandSub: 'Приложение центра',
      title: 'Вход',
      subtitle: 'Войдите под учётной записью центра.',
      email: 'Электронная почта',
      password: 'Пароль',
      submit: 'Войти',
      working: 'Входим…',
      invalid: 'Эта почта и пароль не подходят ни к одной учётной записи.',
      notVendor: 'Эта учётная запись не принадлежит центру. Приложение — для владельцев и гидов.',
      unreachable: 'Не удалось связаться с сервером. Проверьте связь и попробуйте снова.',
      noSelfServe: 'Учётные записи создаёт платформа. Самостоятельной регистрации нет.',
    },
    todayGreetingAnon: 'Доброе утро.',
  },
  'it-IT': {
    signIn: {
      brand: 'Dahab Focal',
      brandSub: 'App del centro',
      title: 'Accedi',
      subtitle: 'Usa l’account del tuo centro.',
      email: 'Email',
      password: 'Password',
      submit: 'Accedi',
      working: 'Accesso in corso…',
      invalid: 'Questa email e questa password non corrispondono a nessun account.',
      notVendor: 'Questo account non appartiene a un centro. L’app è per titolari e guide.',
      unreachable: 'Server irraggiungibile. Controlla la connessione e riprova.',
      noSelfServe: 'Gli account li crea la piattaforma. Non c’è registrazione.',
    },
    todayGreetingAnon: 'Buongiorno.',
  },
  'fr-FR': {
    signIn: {
      brand: 'Dahab Focal',
      brandSub: 'Application du centre',
      title: 'Connexion',
      subtitle: 'Utilisez le compte de votre centre.',
      email: 'E-mail',
      password: 'Mot de passe',
      submit: 'Se connecter',
      working: 'Connexion…',
      invalid: 'Cet e-mail et ce mot de passe ne correspondent à aucun compte.',
      notVendor: 'Ce compte n’appartient pas à un centre. L’application est pour les gérants et les guides.',
      unreachable: 'Serveur injoignable. Vérifiez votre connexion et réessayez.',
      noSelfServe: 'Les comptes sont créés par la plateforme. Il n’y a pas d’inscription.',
    },
    todayGreetingAnon: 'Bonjour.',
  },
  'es-ES': {
    signIn: {
      brand: 'Dahab Focal',
      brandSub: 'App del centro',
      title: 'Iniciar sesión',
      subtitle: 'Usa la cuenta de tu centro.',
      email: 'Correo electrónico',
      password: 'Contraseña',
      submit: 'Entrar',
      working: 'Entrando…',
      invalid: 'Ese correo y esa contraseña no coinciden con ninguna cuenta.',
      notVendor: 'Esa cuenta no pertenece a un centro. Esta app es para responsables y guías.',
      unreachable: 'No se pudo conectar con el servidor. Comprueba la cobertura e inténtalo otra vez.',
      noSelfServe: 'Las cuentas las crea la plataforma. No hay registro.',
    },
    todayGreetingAnon: 'Buenos días.',
  },
  'de-DE': {
    signIn: {
      brand: 'Dahab Focal',
      brandSub: 'Center-App',
      title: 'Anmelden',
      subtitle: 'Melden Sie sich mit dem Konto Ihres Centers an.',
      email: 'E-Mail',
      password: 'Passwort',
      submit: 'Anmelden',
      working: 'Anmeldung läuft…',
      invalid: 'Diese E-Mail und dieses Passwort gehören zu keinem Konto.',
      notVendor: 'Dieses Konto gehört zu keinem Center. Die App ist für Inhaber und Guides.',
      unreachable: 'Server nicht erreichbar. Prüfen Sie die Verbindung und versuchen Sie es erneut.',
      noSelfServe: 'Konten legt die Plattform an. Eine Selbstregistrierung gibt es nicht.',
    },
    todayGreetingAnon: 'Guten Morgen.',
  },
};

/**
 * The product's own name, and two words Italian borrowed whole. Arabic is not
 * here: the brand is written دهب فوكال on an Arabic screen, which is a
 * translation rather than the Latin name left alone.
 */
const IDENTICAL = {
  'ru-RU': ['vendor.signIn.brand'],
  'it-IT': ['vendor.signIn.brand', 'vendor.signIn.email', 'vendor.signIn.password'],
  'fr-FR': ['vendor.signIn.brand'],
  'es-ES': ['vendor.signIn.brand'],
  'de-DE': ['vendor.signIn.brand'],
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  catalogue.vendor = { ...catalogue.vendor, signIn: block.signIn };
  catalogue.vendor.today = { ...catalogue.vendor.today, greetingAnon: block.todayGreetingAnon };

  const declared = IDENTICAL[locale];
  if (declared !== undefined) {
    const existing = catalogue.$meta.identicalToSource ?? [];
    catalogue.$meta.identicalToSource = [...new Set([...existing, ...declared])].sort();
  }

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor sign-in keys → ${locale}`);
}
