import { Avatar } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { LocaleSwitch } from '@/components/ui/LocaleSwitch';
import { Uploader } from '@/components/ui/Uploader';
import { getMe, getProfile } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { Heading, Outcome, resolveLocale } from '@/lib/page';
import { uploaderLabels } from '@/lib/uploader';

import { signOut } from '../../sign-in/actions';
import { saveMe } from '../actions';

/**
 * My account: the person, not the centre. Their own photo and name — what the
 * team sees beside a story they posted — how they sign in, the language, and
 * the way out.
 */

const MESSAGES = {
  saved: 'partner.common.saved',
  emptyName: 'partner.account.emptyName',
  notAllowed: 'partner.common.notAllowed',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const { done, error } = await searchParams;
  const t = translator(locale);

  const [me, profile] = await Promise.all([getMe(), getProfile()]);
  if (!me.ok) return null;
  const m = me.data;

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.account.title')} subtitle={t('partner.account.subtitle')} />
      <Outcome locale={locale} done={done} error={error} messages={MESSAGES} />

      <section className="flex items-center gap-4 rounded-lg border border-c-edge bg-c-surface p-5">
        <Avatar name={m.displayName} url={m.avatarUrl} size={64} />
        <div className="min-w-0">
          <p className="truncate text-h2 font-semibold text-c-text">{m.displayName ?? '—'}</p>
          <p className="text-body text-c-muted">
            {m.isOwner ? t('partner.team.owner') : t('partner.team.staff')}
            {profile.ok ? ` · ${profile.data.displayName}` : ''}
          </p>
        </div>
      </section>

      <Card title={t('partner.account.photo')} icon="image">
        <form action={saveMe} className="flex flex-col gap-2">
          <input type="hidden" name="locale" value={locale} />
          <div className="w-40">
            <Uploader purpose="avatar" name="avatarMediaId" shape="round" autoSubmit currentUrl={m.avatarUrl} labels={uploaderLabels(t, 'photo')} />
          </div>
          <p className="text-small text-c-muted">{t('partner.account.photoHint')}</p>
        </form>
      </Card>

      <Card title={t('partner.account.name')} icon="pencil">
        <form action={saveMe} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <Field name="displayName" label={t('partner.account.name')} value={m.displayName} maxLength={80} required />
          <Button type="submit" intent="primary" icon="check" block>
            {t('partner.common.save')}
          </Button>
        </form>
      </Card>

      <Card title={t('partner.account.contact')} icon="key">
        <ul className="flex flex-col gap-2 text-bodyL text-c-text">
          {m.phone === null ? null : (
            <li className="flex items-center gap-3">
              <Icon name="phone" size={20} className="text-c-muted" />
              <span dir="ltr">{m.phone}</span>
            </li>
          )}
          {m.email === null ? null : (
            <li className="flex items-center gap-3">
              <Icon name="chat" size={20} className="text-c-muted" />
              <span dir="ltr" className="truncate">{m.email}</span>
            </li>
          )}
        </ul>
      </Card>

      <Card title={t('partner.account.language')} icon="globe">
        <LocaleSwitch current={locale} rest="account" />
      </Card>

      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" intent="danger" icon="signOut" block>
          {t('partner.account.signOut')}
        </Button>
      </form>
    </div>
  );
}
