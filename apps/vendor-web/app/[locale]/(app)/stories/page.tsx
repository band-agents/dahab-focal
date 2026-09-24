import { formatDate, type Locale } from '@dahab/i18n/server';

import { StoryMedia } from '@/components/StoryMedia';
import { Empty } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Card';
import { Confirm } from '@/components/ui/Confirm';
import { Icon } from '@/components/ui/Icon';
import { getMe, getStories } from '@/lib/data';
import { translator, type Translate } from '@/lib/i18n';
import { path } from '@/lib/nav';
import { Heading, Outcome, resolveLocale } from '@/lib/page';

import { deleteStory, pinStory } from '../actions';

/**
 * Stories: what is showing now, and what has been kept.
 *
 * Two shelves, because they are two different things to an operator: "now"
 * is today's sea and disappears on its own; "kept" is the handful of clips
 * they chose to leave on their page — the best dive, the boat, the team.
 * Every card says how long it has left in hours, not as a timestamp.
 */

const MESSAGES = {
  posted: 'partner.stories.posted',
  removed: 'partner.stories.removed',
  pinned: 'partner.stories.pinDone',
  unpinned: 'partner.stories.unpinDone',
  notAllowed: 'partner.common.notAllowed',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

type Story = Extract<Awaited<ReturnType<typeof getStories>>, { ok: true }>['data'][number];

export default async function StoriesPage({
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

  const [me, stories] = await Promise.all([getMe(), getStories()]);
  if (!me.ok) return null;
  const all = stories.ok ? stories.data : [];
  const live = all.filter((story) => story.live);
  // A pinned story still inside its 24 hours shows once, on the "now" shelf.
  const kept = all.filter((story) => story.pinned && !story.live);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Heading title={t('partner.stories.title')} subtitle={t('partner.stories.subtitle')} />
        <div className="mb-5 hidden sm:block">
          <Button href={path(locale, 'stories/new')} intent="primary" icon="camera">
            {t('partner.stories.new')}
          </Button>
        </div>
      </div>
      <Outcome locale={locale} done={done} error={error} messages={MESSAGES} />

      {all.length === 0 ? (
        <section className="rounded-lg border border-c-edge bg-c-surface">
          <Empty
            icon="camera"
            title={t('partner.stories.empty')}
            action={{ label: t('partner.stories.new'), href: path(locale, 'stories/new'), icon: 'camera' }}
          >
            {t('partner.stories.emptyText')}
          </Empty>
        </section>
      ) : (
        <>
          <div className="sm:hidden">
            <Button href={path(locale, 'stories/new')} intent="primary" icon="camera" block>
              {t('partner.stories.new')}
            </Button>
          </div>

          <SectionTitle>{t('partner.stories.live')}</SectionTitle>
          {live.length === 0 ? (
            <p className="rounded-lg border border-dashed border-c-edge-strong px-5 py-6 text-center text-body text-c-muted">
              {t('partner.stories.emptyText')}
            </p>
          ) : (
            <Shelf stories={live} locale={locale} t={t} owner={me.data.isOwner} />
          )}

          {kept.length === 0 ? null : (
            <>
              <SectionTitle>{t('partner.stories.pinnedTitle')}</SectionTitle>
              <p className="-mt-3 px-1 text-body text-c-muted">{t('partner.stories.pinnedHint')}</p>
              <Shelf stories={kept} locale={locale} t={t} owner={me.data.isOwner} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Shelf({
  stories,
  locale,
  t,
  owner,
}: {
  readonly stories: readonly Story[];
  readonly locale: Locale;
  readonly t: Translate;
  readonly owner: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stories.map((story) => (
        <li key={story.id} className="flex flex-col overflow-hidden rounded-lg border border-c-edge bg-c-surface">
          <div className="relative aspect-[9/16] bg-c-raised">
            <StoryMedia kind={story.kind} url={story.url} controls={story.kind === 'video'} />
            <span className="pointer-events-none absolute start-2 top-2 inline-flex items-center gap-1 rounded-pill bg-c-surface px-2 py-0.5 text-caption font-semibold text-c-text">
              {story.live ? (
                <>
                  <Icon name="clock" size={14} />
                  {t('partner.stories.hoursLeft', {
                    hours: Math.max(0, Math.floor((Date.parse(story.expiresAt) - Date.now()) / 3_600_000)),
                  })}
                </>
              ) : (
                <>
                  <Icon name="bookmark" size={14} />
                  {t('partner.stories.onlyPinned')}
                </>
              )}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-3">
            {story.caption === null ? null : <p dir="auto" className="line-clamp-3 text-body text-c-text">{story.caption}</p>}
            <p className="flex items-center gap-1.5 text-small text-c-muted">
              <Icon name="eye" size={16} />
              {t('partner.stories.views', { count: story.views })}
            </p>
            <p className="text-small text-c-muted">
              {formatDate(new Date(story.postedAt), { locale }, 'dateTime')}
              {story.authorName === null ? '' : ` · ${t('partner.stories.by', { name: story.authorName })}`}
            </p>
            <div className="mt-auto flex flex-col gap-1 pt-2">
              {owner ? (
                <form action={pinStory}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="storyId" value={story.id} />
                  <input type="hidden" name="pinned" value={story.pinned ? 'false' : 'true'} />
                  <button
                    type="submit"
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-2 text-small font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus ${
                      story.pinned
                        ? 'border-c-edge-strong text-c-text hover:bg-c-raised'
                        : 'border-c-accent text-c-link hover:bg-c-info-bg'
                    }`}
                  >
                    <Icon name="bookmark" size={16} />
                    {story.pinned ? t('partner.stories.unpin') : t('partner.stories.pin')}
                  </button>
                </form>
              ) : null}
              {owner || story.mine ? (
                <Confirm label={t('partner.stories.delete')} question={t('partner.stories.deleteQuestion')}>
                  <form action={deleteStory}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="storyId" value={story.id} />
                    <Button type="submit" intent="danger" icon="trash" block>
                      {t('partner.stories.deleteYes')}
                    </Button>
                  </form>
                </Confirm>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

