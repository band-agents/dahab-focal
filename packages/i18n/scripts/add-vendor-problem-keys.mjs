/**
 * Why an operator screen has nothing on it, in all seven locales.
 *
 * Arabic first, like the rest of `vendor.*`. The distinction these carry is
 * the one that matters most on a phone at the dock: an empty manifest and a
 * manifest that could not be fetched look identical, and only one of them
 * means nobody is coming.
 *
 *   node scripts/add-vendor-problem-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'ar-EG': {
    loading: 'بيحمّل…',
    offline: 'مفيش نت دلوقتي. ده مش معناه إن مفيش حد جاي — دي بس مقدرناش نسأل.',
    signedOut: 'الجلسة خلصت. ادخل تاني.',
    forbidden: 'ده بتاع صاحب المركز. كلّمه لو محتاجه.',
    failed: 'حصلت مشكلة في الجلب. جرّب تاني.',
    retry: 'جرّب تاني',
    signInAgain: 'ادخل تاني',
  },
  'en-GB': {
    loading: 'Loading…',
    offline: 'No signal right now. That does not mean nobody is coming — it means we could not ask.',
    signedOut: 'Your session has ended. Sign in again.',
    forbidden: 'That one is the owner’s. Ask them if you need it.',
    failed: 'That did not load. Try again.',
    retry: 'Try again',
    signInAgain: 'Sign in again',
  },
  'ru-RU': {
    loading: 'Загрузка…',
    offline: 'Сейчас нет связи. Это не значит, что никто не придёт — значит, мы не смогли спросить.',
    signedOut: 'Сессия закончилась. Войдите снова.',
    forbidden: 'Это для владельца. Спросите его, если нужно.',
    failed: 'Не загрузилось. Попробуйте снова.',
    retry: 'Попробовать снова',
    signInAgain: 'Войти снова',
  },
  'it-IT': {
    loading: 'Caricamento…',
    offline: 'Nessun segnale adesso. Non vuol dire che non viene nessuno: vuol dire che non abbiamo potuto chiedere.',
    signedOut: 'La sessione è finita. Accedi di nuovo.',
    forbidden: 'Quello è del titolare. Chiedi a lui se ti serve.',
    failed: 'Non si è caricato. Riprova.',
    retry: 'Riprova',
    signInAgain: 'Accedi di nuovo',
  },
  'fr-FR': {
    loading: 'Chargement…',
    offline: 'Pas de réseau pour l’instant. Cela ne veut pas dire que personne ne vient : cela veut dire que nous n’avons pas pu demander.',
    signedOut: 'Votre session est terminée. Reconnectez-vous.',
    forbidden: 'Cela revient au gérant. Demandez-lui si vous en avez besoin.',
    failed: 'Le chargement a échoué. Réessayez.',
    retry: 'Réessayer',
    signInAgain: 'Se reconnecter',
  },
  'es-ES': {
    loading: 'Cargando…',
    offline: 'Ahora no hay cobertura. Eso no significa que no venga nadie: significa que no hemos podido preguntar.',
    signedOut: 'Tu sesión ha terminado. Vuelve a entrar.',
    forbidden: 'Eso es del responsable. Pregúntale si lo necesitas.',
    failed: 'No se ha cargado. Inténtalo otra vez.',
    retry: 'Inténtalo otra vez',
    signInAgain: 'Volver a entrar',
  },
  'de-DE': {
    loading: 'Wird geladen…',
    offline: 'Gerade kein Empfang. Das heißt nicht, dass niemand kommt — es heißt, wir konnten nicht fragen.',
    signedOut: 'Ihre Sitzung ist beendet. Melden Sie sich erneut an.',
    forbidden: 'Das gehört dem Inhaber. Fragen Sie ihn, wenn Sie es brauchen.',
    failed: 'Das wurde nicht geladen. Versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
    signInAgain: 'Erneut anmelden',
  },
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));
  catalogue.vendor = { ...catalogue.vendor, problem: block };
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor problem keys → ${locale}`);
}
