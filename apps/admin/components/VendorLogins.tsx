import { randomInt } from 'node:crypto';

import type { Route } from 'next';

import type { Locale } from '@dahab/i18n/server';

import { Action, ActionPanel, ActionRow, Banner, Panel, Pill } from '@/components/console';
import { api, load } from '@/lib/api';
import type { Translate } from '@/lib/i18n';
import { createVendorLogin, setVendorLogin } from '@/lib/login-actions';
import { path } from '@/lib/nav';

/**
 * Logins: who can open this operator's dashboard, and the way in for each.
 *
 * Sky Eye makes a login with a username and a first password, and gives a new
 * password to somebody who forgot theirs. The password field arrives filled
 * with a suggestion the admin can read out or send — a login made here is
 * always handed over by a person, and a suggestion made of two words and four
 * digits survives being said down a phone line. The admin can type their own
 * instead.
 *
 * Every write is the console's usual ActionPanel: a reason, one transaction,
 * an audit row that says a password was set and never what it was.
 */

const WORDS = ['Reef', 'Coral', 'Wave', 'Blue', 'Sand', 'Fin', 'Tide', 'Canyon', 'Lagoon', 'Moray', 'Turtle', 'Dune'];
function suggestPassword(): string {
  const word = () => WORDS[randomInt(WORDS.length)] ?? 'Reef';
  return `${word()}-${randomInt(1000, 10000)}-${word()}`;
}

const NOTICES = {
  created: { tone: 'success', key: 'admin.logins.notice.created' },
  updated: { tone: 'success', key: 'admin.logins.notice.updated' },
  usernameTaken: { tone: 'warning', key: 'admin.logins.notice.usernameTaken' },
  emailTaken: { tone: 'warning', key: 'admin.logins.notice.emailTaken' },
  phoneTaken: { tone: 'warning', key: 'admin.logins.notice.phoneTaken' },
  badInput: { tone: 'warning', key: 'admin.logins.notice.badInput' },
  refused: { tone: 'danger', key: 'admin.logins.notice.refused' },
  failed: { tone: 'danger', key: 'admin.logins.notice.failed' },
} as const;

export async function VendorLogins({
  locale,
  vendorId,
  vendorName,
  act,
  userId,
  notice,
  t,
}: {
  readonly locale: Locale;
  readonly vendorId: string;
  readonly vendorName: string;
  readonly act: string | undefined;
  readonly userId: string | undefined;
  readonly notice: string | undefined;
  readonly t: Translate;
}) {
  const logins = await load(() => api.admin.vendorLogins.query({ vendorId }));
  const here = (query = ''): Route => path(locale, `vendors/${vendorId}${query}`);
  const shown = notice !== undefined && Object.hasOwn(NOTICES, notice) ? NOTICES[notice as keyof typeof NOTICES] : null;
  const editing = act === 'login-edit' && logins.ok ? logins.data.find((row) => row.userId === userId) : undefined;
  const hidden = { locale, vendorId };

  return (
    <div id="logins" className="flex scroll-mt-24 flex-col gap-3">
      <Panel
        title={t('admin.logins.title')}
        {...(logins.ok ? { figure: String(logins.data.length) } : {})}
        flush
      >
        {shown === null ? null : (
          <div role="status" className="px-4 pt-4">
            <Banner tone={shown.tone} title={t(shown.key)} />
          </div>
        )}
        {!logins.ok ? (
          <p className="px-4 py-4 font-console text-cBody text-c-muted">{t('admin.logins.unavailable')}</p>
        ) : logins.data.length === 0 ? (
          <p className="px-4 py-4 font-console text-cBody text-c-muted">{t('admin.logins.none')}</p>
        ) : (
          <ul className="divide-y divide-c-edge">
            {logins.data.map((row) => (
              <li key={row.userId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-console text-cBody font-semibold text-c-text">
                    <span dir="auto">{row.displayName ?? row.username ?? row.email ?? row.phone ?? '—'}</span>
                    <Pill tone={row.role === 'vendorOwner' ? 'info' : 'neutral'}>
                      {row.role === 'vendorOwner' ? t('admin.logins.owner') : t('admin.logins.staff')}
                    </Pill>
                    {row.suspended ? <Pill tone="danger">{t('admin.logins.suspended')}</Pill> : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 font-console text-cMeta text-c-muted">
                    <span dir="ltr" className="font-semibold text-c-text">
                      {row.username ?? t('admin.logins.noUsername')}
                    </span>
                    {row.email === null ? null : <span dir="ltr">{row.email}</span>}
                    {row.phone === null ? null : <span dir="ltr">{row.phone}</span>}
                    <span>{row.hasPassword ? t('admin.logins.hasPassword') : t('admin.logins.noPassword')}</span>
                  </p>
                </div>
                <Action intent="secondary" icon="key" href={here(`?act=login-edit&user=${row.userId}#logins`)}>
                  {t('admin.logins.edit')}
                </Action>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ActionRow>
        <Action intent="primary" icon="plus" href={here('?act=login-new#logins')}>
          {t('admin.logins.new')}
        </Action>
      </ActionRow>

      {act === 'login-new' ? (
        <ActionPanel
          title={t('admin.logins.new')}
          summary={t('admin.logins.newSummary', { name: vendorName })}
          action={createVendorLogin}
          hidden={hidden}
          fields={[
            {
              name: 'role',
              label: t('admin.logins.role'),
              type: 'select',
              value: logins.ok && logins.data.some((row) => row.role === 'vendorOwner') ? 'vendorStaff' : 'vendorOwner',
              options: [
                { value: 'vendorOwner', label: t('admin.logins.owner') },
                { value: 'vendorStaff', label: t('admin.logins.staff') },
              ],
              required: true,
            },
            { name: 'displayName', label: t('admin.logins.displayName'), type: 'text', required: true },
            { name: 'username', label: t('admin.logins.username'), type: 'text', required: true, ltr: true, hint: t('admin.logins.usernameHint') },
            { name: 'password', label: t('admin.logins.password'), type: 'text', required: true, ltr: true, value: suggestPassword(), hint: t('admin.logins.passwordHint') },
            { name: 'email', label: t('admin.logins.emailOptional'), type: 'email', ltr: true },
            { name: 'phone', label: t('admin.logins.phoneOptional'), type: 'tel', ltr: true },
          ]}
          confirm={{ value: 'create', label: t('admin.logins.create'), icon: 'plus' }}
          reasonLabel={t('admin.act.reasonLabel')}
          reasonHint={t('admin.logins.reasonHint')}
          closeHref={here('#logins')}
          closeLabel={t('admin.review.close')}
        />
      ) : null}

      {editing === undefined ? null : (
        <ActionPanel
          title={t('admin.logins.editTitle', { name: editing.displayName ?? editing.username ?? '' })}
          summary={t('admin.logins.editSummary')}
          action={setVendorLogin}
          hidden={{ ...hidden, userId: editing.userId }}
          fields={[
            { name: 'username', label: t('admin.logins.username'), type: 'text', ltr: true, value: editing.username ?? '', hint: t('admin.logins.usernameHint') },
            // Empty on purpose: changing only the username must not reset the
            // password. The suggestion is in the hint, to copy if wanted.
            { name: 'newPassword', label: t('admin.logins.newPassword'), type: 'text', ltr: true, hint: t('admin.logins.newPasswordHint', { example: suggestPassword() }) },
          ]}
          confirm={{ value: 'save', label: t('admin.logins.save'), icon: 'key' }}
          reasonLabel={t('admin.act.reasonLabel')}
          reasonHint={t('admin.logins.reasonHint')}
          closeHref={here('#logins')}
          closeLabel={t('admin.review.close')}
        />
      )}
    </div>
  );
}
