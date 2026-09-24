import { formatDate, formatNumber } from '@dahab/i18n/server';

import { Avatar, Empty, Notice, Stars } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { getMe, getProfile, getReviews } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { Heading, Outcome, resolveLocale } from '@/lib/page';

import { replyToReview } from '../actions';

/**
 * Reviews: what travellers said, and the operator's answer under each.
 *
 * The ones still waiting come first, each with its reply box already open —
 * the job on this screen is answering, not reading. A review that has been
 * answered shows the answer, with a quiet "change my reply" that opens the
 * same box again.
 */

const MESSAGES = {
  sent: 'partner.reviews.sent',
  emptyReply: 'partner.reviews.emptyReply',
  notAllowed: 'partner.common.notAllowed',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

export default async function ReviewsPage({
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
  const context = { locale };

  const [me, profile, reviews] = await Promise.all([getMe(), getProfile(), getReviews()]);
  if (!me.ok || !profile.ok) return null;
  const owner = me.data.isOwner;
  const all = reviews.ok ? reviews.data : [];
  const waiting = all.filter((review) => review.reply === null);
  const answered = all.filter((review) => review.reply !== null);
  const rating = profile.data.ratingHundredths === null ? null : profile.data.ratingHundredths / 100;

  // How many of each star, for the bars beside the average.
  const spread = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: all.filter((review) => review.rating === stars).length,
  }));

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.reviews.title')} subtitle={t('partner.reviews.subtitle')} />
      <Outcome locale={locale} done={done} error={error} messages={MESSAGES} />
      {reviews.ok ? null : <Notice tone="danger" title={t('partner.common.unreachable')} />}

      {all.length === 0 ? (
        <section className="rounded-lg border border-c-edge bg-c-surface">
          <Empty icon="star" title={t('partner.reviews.empty')}>
            {t('partner.reviews.emptyText')}
          </Empty>
        </section>
      ) : (
        <>
          <section className="grid gap-5 rounded-lg border border-c-edge bg-c-surface p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex flex-col items-center gap-1 sm:px-4">
              <span className="text-displayXL font-semibold tabular-nums text-c-text">
                {rating === null ? '—' : formatNumber(rating, context, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
              </span>
              {rating === null ? null : (
                <Stars value={rating} label={t('partner.reviews.stars', { rating: formatNumber(rating, context, { maximumFractionDigits: 1 }) })} />
              )}
              <span className="text-body text-c-muted">{t('partner.reviews.count', { count: all.length })}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {spread.map((row) => (
                <li key={row.stars} className="flex items-center gap-3 text-small text-c-muted">
                  <span className="inline-flex w-8 shrink-0 items-center gap-1 tabular-nums">
                    {formatNumber(row.stars, context)}
                    <Icon name="star" size={14} className="text-c-warn" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-pill bg-c-raised">
                    <span
                      className="block h-full rounded-pill bg-c-warn"
                      style={{ width: `${(row.count / all.length) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-end tabular-nums">{formatNumber(row.count, context)}</span>
                </li>
              ))}
            </ul>
          </section>

          {waiting.length === 0 ? null : (
            <>
              <SectionTitle>
                <span className="inline-flex items-center gap-2">
                  {t('partner.reviews.waiting')}
                  <span className="rounded-pill bg-c-bad px-2 text-small font-semibold text-c-on-accent">{waiting.length}</span>
                </span>
              </SectionTitle>
              {waiting.map((review) => (
                <Review key={review.id} review={review} locale={locale} t={t} owner={owner} open />
              ))}
            </>
          )}

          {answered.length === 0 ? null : (
            <>
              <SectionTitle>{t('partner.reviews.answered')}</SectionTitle>
              {answered.map((review) => (
                <Review key={review.id} review={review} locale={locale} t={t} owner={owner} open={false} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

type ReviewRow = Extract<Awaited<ReturnType<typeof getReviews>>, { ok: true }>['data'][number];

function Review({
  review,
  locale,
  t,
  owner,
  open,
}: {
  readonly review: ReviewRow;
  readonly locale: Parameters<typeof translator>[0];
  readonly t: ReturnType<typeof translator>;
  readonly owner: boolean;
  /** The reply box starts open — for reviews still waiting. */
  readonly open: boolean;
}) {
  const name = review.travelerName ?? t('partner.reviews.anon');
  const form = (
    <form action={replyToReview} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="reviewId" value={review.id} />
      <label htmlFor={`reply-${review.id}`} className="text-body font-semibold text-c-text">
        {t('partner.reviews.replyLabel')}
      </label>
      <textarea
        id={`reply-${review.id}`}
        name="reply"
        dir="auto"
        rows={3}
        maxLength={1000}
        defaultValue={review.reply ?? ''}
        aria-describedby={`reply-${review.id}-hint`}
        className="w-full rounded-md border border-c-edge-strong bg-c-surface px-4 py-3 text-bodyL leading-relaxed text-c-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-c-focus"
      />
      <p id={`reply-${review.id}-hint`} className="text-small text-c-muted">
        {t('partner.reviews.replyHint')}
      </p>
      <Button type="submit" intent="primary" icon="chat" block>
        {t('partner.reviews.send')}
      </Button>
    </form>
  );

  return (
    <article
      id={`review-${review.id}`}
      className={`scroll-mt-20 rounded-lg border bg-c-surface p-5 ${open ? 'border-c-warn' : 'border-c-edge'}`}
    >
      <header className="flex items-center gap-3">
        <Avatar name={name} url={null} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-bodyL font-semibold text-c-text">{name}</p>
          <p className="text-small text-c-muted">{formatDate(new Date(review.postedAt), { locale }, 'date')}</p>
        </div>
        <Stars value={review.rating} label={t('partner.reviews.stars', { rating: review.rating })} />
      </header>
      {review.title === null ? null : <h3 dir="auto" className="mt-3 text-h3 font-semibold text-c-text">{review.title}</h3>}
      {review.body === null ? null : <p dir="auto" className="mt-2 whitespace-pre-line text-bodyL text-c-text">{review.body}</p>}

      {review.reply === null ? (
        owner ? (
          <div className="mt-4 border-t border-c-edge pt-4">{form}</div>
        ) : null
      ) : (
        <div className="mt-4 rounded-md bg-c-raised p-4">
          <p className="flex items-center gap-2 text-small font-semibold text-c-muted">
            <Icon name="chat" size={16} />
            {t('partner.reviews.replied')}
          </p>
          <p dir="auto" className="mt-1 whitespace-pre-line text-bodyL text-c-text">{review.reply}</p>
          {owner ? (
            <details className="mt-3">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-body font-semibold text-c-link hover:bg-c-surface [&::-webkit-details-marker]:hidden">
                <Icon name="pencil" size={16} />
                {t('partner.reviews.edit')}
              </summary>
              <div className="mt-3">{form}</div>
            </details>
          ) : null}
        </div>
      )}
    </article>
  );
}
