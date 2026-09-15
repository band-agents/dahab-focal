/**
 * Name-free variants of the two role-limit messages, plus the sign-out label.
 *
 * Both messages interpolated a hardcoded `Mahmoud` on four screens — a
 * specific person named as the owner of whichever centre happened to be
 * signed in. With a real session the app knows the role but not the owner's
 * name, so it says "the owner" rather than inventing one. The `{name}`
 * variants stay for when a staff-roster read can supply a real one.
 *
 *   node scripts/add-vendor-nameless-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(here, '../messages');

const BLOCKS = {
  'ar-EG': {
    staffLimitNoName: 'الفلوس والأسعار والفريق دول بتوع صاحب المركز. كلّمه.',
    publishOwnerNoName: 'النشر من صاحب المركز.',
    signOut: 'تسجيل خروج',
  },
  'en-GB': {
    staffLimitNoName: 'Money, pricing and staff are the owner’s. Ask them.',
    publishOwnerNoName: 'Publishing is the owner’s.',
    signOut: 'Sign out',
  },
  'ru-RU': {
    staffLimitNoName: 'Финансы, цены и команда — за владельцем. Спросите его.',
    publishOwnerNoName: 'Публикация — за владельцем.',
    signOut: 'Выйти',
  },
  'it-IT': {
    staffLimitNoName: 'Finanze, prezzi e personale sono del titolare. Chiedi a lui.',
    publishOwnerNoName: 'La pubblicazione è del titolare.',
    signOut: 'Esci',
  },
  'fr-FR': {
    staffLimitNoName: 'Les finances, les tarifs et l’équipe sont au gérant. Demandez-lui.',
    publishOwnerNoName: 'La publication revient au gérant.',
    signOut: 'Se déconnecter',
  },
  'es-ES': {
    staffLimitNoName: 'Las finanzas, los precios y el equipo son del responsable. Pregúntale.',
    publishOwnerNoName: 'Publicar es cosa del responsable.',
    signOut: 'Salir',
  },
  'de-DE': {
    staffLimitNoName: 'Finanzen, Preise und Team gehören dem Inhaber. Fragen Sie ihn.',
    publishOwnerNoName: 'Das Veröffentlichen liegt beim Inhaber.',
    signOut: 'Abmelden',
  },
};

for (const [locale, block] of Object.entries(BLOCKS)) {
  const path = resolve(messagesDir, `${locale}.json`);
  const catalogue = JSON.parse(readFileSync(path, 'utf8'));

  catalogue.vendor.role = { ...catalogue.vendor.role, staffLimitNoName: block.staffLimitNoName };
  catalogue.vendor.services = {
    ...catalogue.vendor.services,
    publishOwnerNoName: block.publishOwnerNoName,
  };
  catalogue.vendor.more = { ...catalogue.vendor.more, signOut: block.signOut };

  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`vendor nameless keys → ${locale}`);
}
