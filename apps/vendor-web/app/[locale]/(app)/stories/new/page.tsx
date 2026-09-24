import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Uploader } from '@/components/ui/Uploader';
import { translator } from '@/lib/i18n';
import { Heading, Outcome, resolveLocale } from '@/lib/page';
import { uploaderLabels } from '@/lib/uploader';

import { postStory } from '../../actions';

/**
 * Posting a story, in three steps that are numbered on the screen: choose the
 * photo or clip, say a few words if you like, press Post.
 *
 * The file uploads the moment it is chosen, with a progress bar, so by the
 * time somebody has typed "flat sea at the Bells" it is already on the server
 * and Post is instant. The tips underneath are the three things that make a
 * story look good on a traveller's phone, said once, in plain words.
 */

const MESSAGES = {
  pickFirst: 'partner.stories.pickFirst',
  alreadyPosted: 'partner.stories.alreadyPosted',
  notAllowed: 'partner.common.notAllowed',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

const TIPS: readonly { readonly icon: IconName; readonly key: string }[] = [
  { icon: 'camera', key: 'partner.stories.tipUpright' },
  { icon: 'clock', key: 'partner.stories.tipShort' },
  { icon: 'bookmark', key: 'partner.stories.tipKeep' },
];

export default async function NewStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const { error } = await searchParams;
  const t = translator(locale);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <Heading title={t('partner.stories.newTitle')} subtitle={t('partner.stories.newSubtitle')} />
      <Outcome locale={locale} error={error} messages={MESSAGES} />

      <form action={postStory} className="flex flex-col gap-5">
        <input type="hidden" name="locale" value={locale} />

        <Step number={1} title={t('partner.stories.stepPick')}>
          <div className="mx-auto w-full max-w-72">
            <Uploader purpose="story" name="mediaId" shape="tall" labels={uploaderLabels(t, 'photoOrVideo')} />
          </div>
        </Step>

        <Step number={2} title={t('partner.stories.stepWords')}>
          <Field name="caption" label={t('partner.stories.caption')} hint={t('partner.stories.captionHint')} maxLength={200} />
        </Step>

        <Step number={3} title={t('partner.stories.stepPost')}>
          <Button type="submit" intent="primary" icon="sparkle" block>
            {t('partner.stories.post')}
          </Button>
        </Step>
      </form>

      <Card title={t('partner.stories.tipsTitle')} icon="sparkle">
        <ul className="flex flex-col gap-3">
          {TIPS.map((tip) => (
            <li key={tip.key} className="flex items-start gap-3 text-body text-c-text">
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-c-info-bg text-c-info">
                <Icon name={tip.icon} size={18} />
              </span>
              <span className="pt-1">{t(tip.key)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  readonly number: number;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-c-edge bg-c-surface p-5">
      <h2 className="mb-4 flex items-center gap-3 text-h3 font-semibold text-c-text">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-c-accent text-body font-semibold text-c-on-accent">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
