import { Tile } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getMe, getReviews } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { DESTINATIONS, MORE_KEYS, path } from '@/lib/nav';
import { Heading, resolveLocale } from '@/lib/page';

import { signOut } from '../../sign-in/actions';

/**
 * More: everything the tab bar has no room for, each with a sentence saying
 * what is behind it. Money is left off for a team member rather than shown
 * and refused.
 */
export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);

  const [me, reviews] = await Promise.all([getMe(), getReviews()]);
  if (!me.ok) return null;
  const waiting = reviews.ok ? reviews.data.filter((review) => review.reply === null).length : 0;

  const entries = DESTINATIONS.filter(
    (destination) => MORE_KEYS.includes(destination.key) && (destination.key !== 'money' || me.data.isOwner),
  );

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.more.title')} />
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((destination) => (
          <Tile
            key={destination.key}
            href={path(locale, destination.path)}
            icon={destination.icon}
            title={t(destination.labelKey)}
            description={destination.describedBy === undefined ? '' : t(destination.describedBy)}
            {...(destination.key === 'reviews' && waiting > 0 ? { badge: String(waiting) } : {})}
            {...(destination.key === 'stories' ? { tone: 'accent' as const } : {})}
          />
        ))}
      </div>
      <form action={signOut} className="pt-4">
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" intent="danger" icon="signOut" block>
          {t('partner.account.signOut')}
        </Button>
      </form>
    </div>
  );
}
