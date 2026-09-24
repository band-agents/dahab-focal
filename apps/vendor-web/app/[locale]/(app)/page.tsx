import type { Route } from 'next';
import Link from 'next/link';

import { formatDate } from '@dahab/i18n/server';

import { StoryMedia } from '@/components/StoryMedia';
import { Notice } from '@/components/ui/Bits';
import { Card, SectionTitle, Tile } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { api, load } from '@/lib/api';
import { getMe, getProfile, getReviews, getStories } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { DESTINATIONS, path } from '@/lib/nav';
import { resolveLocale } from '@/lib/page';

/**
 * Home: the day, and the one or two things worth doing about it.
 *
 * Read top to bottom it answers, in order: who am I signed in as; have I
 * shown travellers the sea today; is anybody waiting on me; what is still
 * missing from my page; what is leaving the shore today. Then every other
 * part of the dashboard as a big tile with a sentence under it, so nothing is
 * ever more than two taps from here.
 */

type Missing = 'logo' | 'cover' | 'tagline' | 'about' | 'phone' | 'whatsapp' | 'story';

/** Where each missing piece is filled in, and the icon that says what it is. */
const FIX: Record<Missing, { readonly path: string; readonly icon: IconName }> = {
  logo: { path: 'profile#photos', icon: 'image' },
  cover: { path: 'profile#photos', icon: 'image' },
  tagline: { path: 'profile#words', icon: 'pencil' },
  about: { path: 'profile#words', icon: 'doc' },
  phone: { path: 'profile#contact', icon: 'phone' },
  whatsapp: { path: 'profile#contact', icon: 'chat' },
  story: { path: 'stories/new', icon: 'camera' },
};

/** Every piece a complete page has — the denominator of the progress bar. */
const PIECES = 7;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale };

  const [me, profile, reviews, stories, today] = await Promise.all([
    getMe(),
    getProfile(),
    getReviews(),
    getStories(),
    load(() => api.vendor.today.query({ locale })),
  ]);
  // The layout has already shown the reason; nothing to add here.
  if (!me.ok || !profile.ok) return null;

  const firstName = (me.data.displayName ?? '').split(/\s+/)[0] ?? '';
  const live = stories.ok ? stories.data.filter((story) => story.live) : [];
  const waiting = reviews.ok ? reviews.data.filter((review) => review.reply === null).length : 0;
  const missing = profile.data.missing;
  const done = PIECES - missing.length;

  const everything = DESTINATIONS.filter(
    (destination) =>
      destination.key !== 'home' &&
      destination.key !== 'more' &&
      (destination.key !== 'money' || me.data.isOwner),
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 pt-1">
        <p className="text-body text-c-muted">{formatDate(new Date(), context, 'weekdayDate')}</p>
        <h1 className="text-displayL font-semibold text-c-text">
          {firstName === '' ? t('partner.home.helloNoName') : t('partner.home.hello', { name: firstName })}
        </h1>
        <p className="text-bodyL text-c-muted">{t('partner.home.subtitle')}</p>
      </header>

      {/* ── Stories: the thing this dashboard most wants done every day ── */}
      <section className="overflow-hidden rounded-lg border border-c-edge bg-c-surface">
        <div className="flex items-start gap-4 p-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-h2 font-semibold text-c-text">{t('partner.home.storyTitle')}</h2>
            <p className="mt-1 text-body text-c-muted">{t('partner.home.storyText')}</p>
          </div>
        </div>
        <ul className="flex gap-4 overflow-x-auto px-5 pb-5 pt-2">
          <li className="shrink-0">
            <Link
              href={path(locale, 'stories/new')}
              className="flex w-20 flex-col items-center gap-2 text-center focus-visible:outline-none"
            >
              <span className="grid size-20 place-items-center rounded-full border-2 border-dashed border-c-accent bg-c-info-bg text-c-accent">
                <Icon name="camera" size={30} />
              </span>
              <span className="text-small font-semibold text-c-link">{t('partner.nav.postStory')}</span>
            </Link>
          </li>
          {live.map((story) => (
            <li key={story.id} className="shrink-0">
              <Link
                href={path(locale, 'stories')}
                className="flex w-20 flex-col items-center gap-2 text-center focus-visible:outline-none"
              >
                <span className="size-20 overflow-hidden rounded-full border-[3px] border-c-accent p-0.5">
                  <span className="block size-full overflow-hidden rounded-full">
                    <StoryMedia kind={story.kind} url={story.url} />
                  </span>
                </span>
                <span className="w-full truncate text-small text-c-muted">
                  {t('partner.stories.hoursLeft', {
                    hours: Math.max(0, Math.floor((Date.parse(story.expiresAt) - Date.now()) / 3_600_000)),
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {live.length === 0 ? null : (
          <p className="border-t border-c-edge px-5 py-3 text-body font-semibold text-c-ok">
            {t('partner.home.storiesLive', { count: live.length })}
          </p>
        )}
      </section>

      {/* ── Somebody waiting on a reply ─────────────────────────────── */}
      {waiting === 0 ? null : (
        <Tile
          href={path(locale, 'reviews')}
          icon="star"
          title={t('partner.home.replyNow')}
          description={t('partner.home.reviewsWaiting', { count: waiting })}
          badge={String(waiting)}
        />
      )}

      {/* ── Finish your page ─────────────────────────────────────────── */}
      {missing.length === 0 ? (
        <Notice tone="success" title={t('partner.home.complete')} />
      ) : (
        <Card title={t('partner.home.finishTitle')} icon="operators">
          <p className="text-body text-c-muted">{t('partner.home.finishText', { count: missing.length })}</p>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-pill bg-c-raised"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={PIECES}
            aria-valuenow={done}
          >
            <div className="h-full rounded-pill bg-c-accent" style={{ width: `${(done / PIECES) * 100}%` }} />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {missing.map((piece) => (
              <li key={piece}>
                <Link
                  href={path(locale, FIX[piece].path)}
                  className="flex min-h-14 items-center gap-3 rounded-md border border-c-edge px-3 hover:border-c-edge-strong hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-c-warn-bg text-c-warn">
                    <Icon name={FIX[piece].icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1 text-bodyL font-semibold text-c-text">
                    {t(`partner.home.missing.${piece}`)}
                  </span>
                  <Icon name="chevronEnd" size={20} className="text-c-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Today on the water ───────────────────────────────────────── */}
      {!today.ok ? null : (
        <Card
          title={t('partner.home.today')}
          icon="today"
          action={{ label: t('partner.nav.bookings'), href: path(locale, 'bookings') }}
        >
          {today.data.length === 0 ? (
            <p className="text-bodyL text-c-muted">{t('partner.home.tripsToday', { count: 0 })}</p>
          ) : (
            <>
              <p className="text-body font-semibold text-c-text">
                {t('partner.home.tripsToday', { count: today.data.length })}
              </p>
              <ul className="mt-3 flex flex-col divide-y divide-c-edge">
                {today.data.map((departure) => {
                  const booked = departure.participants.length;
                  const share = departure.capacity === 0 ? 0 : Math.min(1, booked / departure.capacity);
                  return (
                    <li key={departure.id} className="flex items-center gap-4 py-3">
                      <span className="w-16 shrink-0 text-h3 font-semibold tabular-nums text-c-text" dir="ltr">
                        {formatDate(new Date(departure.startsAt), context, 'time')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-bodyL font-semibold ${
                            departure.isCancelled ? 'text-c-muted line-through' : 'text-c-text'
                          }`}
                        >
                          {departure.serviceTitle}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-c-raised">
                            <span
                              className="block h-full rounded-pill bg-c-ok"
                              style={{ width: `${share * 100}%` }}
                            />
                          </span>
                          <span className="shrink-0 text-small text-c-muted">
                            {t('partner.home.seats', { booked, total: departure.capacity })}
                          </span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      )}

      {/* ── Everything else, two taps away at most ───────────────────── */}
      <SectionTitle>{t('partner.home.everything')}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {everything.map((destination) => (
          <Tile
            key={destination.key}
            href={path(locale, destination.path) as Route}
            icon={destination.icon}
            title={t(destination.labelKey)}
            description={destination.describedBy === undefined ? '' : t(destination.describedBy)}
            {...(destination.key === 'reviews' && waiting > 0 ? { badge: String(waiting) } : {})}
          />
        ))}
      </div>
    </div>
  );
}
