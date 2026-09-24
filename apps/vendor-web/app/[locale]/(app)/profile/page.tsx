import { formatNumber } from '@dahab/i18n/server';

import { Notice, Stars } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Uploader } from '@/components/ui/Uploader';
import { getMe, getProfile } from '@/lib/data';
import { translator } from '@/lib/i18n';
import { Heading, Outcome, resolveLocale } from '@/lib/page';
import { uploaderLabels } from '@/lib/uploader';

import { saveProfile, setProfileImage } from '../actions';

/**
 * My page: what a traveller sees when they open this operator.
 *
 * The preview comes first and is drawn from the same fields the form below
 * edits, so "what does this look like" is answered before it is asked. The
 * photos save the moment they finish uploading — there is nothing more to
 * decide about a logo once it is chosen — while the words wait for Save,
 * because half a sentence should not go live.
 *
 * Only the owner can change the page. A team member sees it, with one line
 * saying who can change it, rather than a form that fails when they press Save.
 */

const MESSAGES = {
  saved: 'partner.profile.saved',
  photoSaved: 'partner.profile.photoSaved',
  photoRemoved: 'partner.profile.photoRemoved',
  badEmail: 'partner.profile.badEmail',
  notAllowed: 'partner.common.notAllowed',
  unreachable: 'partner.common.unreachable',
  failed: 'partner.common.failed',
} as const;

export default async function ProfilePage({
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
  if (!me.ok || !profile.ok) return null;
  const p = profile.data;
  const owner = me.data.isOwner;
  const rating = p.ratingHundredths === null ? null : p.ratingHundredths / 100;

  return (
    <div className="flex flex-col gap-5">
      <Heading title={t('partner.profile.title')} subtitle={t('partner.profile.subtitle')} />
      <Outcome locale={locale} done={done} error={error} messages={MESSAGES} />
      {owner ? null : <Notice tone="info" title={t('partner.common.notAllowed')} />}

      {/* ── How travellers see you ──────────────────────────────────── */}
      <section aria-label={t('partner.profile.preview')} className="overflow-hidden rounded-lg border border-c-edge bg-c-surface">
        <p className="flex items-center gap-2 border-b border-c-edge px-5 py-2.5 text-small font-semibold text-c-muted">
          <Icon name="eye" size={16} />
          {t('partner.profile.preview')}
        </p>
        <div className="relative aspect-[3/1] bg-c-info-bg">
          {p.coverUrl === null ? (
            <span className="grid h-full place-items-center text-c-info">
              <Icon name="image" size={40} />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- our own upload
            <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-2 px-5 pb-5">
          <div className="relative -mt-10 flex items-end gap-3">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border-4 border-c-surface bg-c-raised text-c-muted">
              {p.logoUrl === null ? (
                <Icon name="operators" size={32} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- our own upload
                <img src={p.logoUrl} alt="" className="h-full w-full object-cover" />
              )}
            </span>
          </div>
          <h2 className="text-h1 font-semibold text-c-text">{p.displayName}</h2>
          <p dir={p.tagline === null ? undefined : 'auto'} className={`text-bodyL ${p.tagline === null ? 'italic text-c-muted' : 'text-c-text'}`}>
            {p.tagline ?? t('partner.profile.noTagline')}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body">
            {rating === null ? null : (
              <span className="flex items-center gap-2">
                <Stars value={rating} label={t('partner.reviews.stars', { rating: formatNumber(rating, { locale }, { maximumFractionDigits: 1 }) })} />
                <span className="font-semibold text-c-text">{formatNumber(rating, { locale }, { maximumFractionDigits: 1 })}</span>
                <span className="text-c-muted">({t('partner.reviews.count', { count: p.reviews })})</span>
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-small font-semibold ${
                p.verification === 'verified' ? 'bg-c-ok-bg text-c-ok' : 'bg-c-warn-bg text-c-warn'
              }`}
            >
              <Icon name={p.verification === 'verified' ? 'shield' : 'clock'} size={16} />
              {p.verification === 'verified' ? t('partner.profile.verified') : t('partner.profile.notVerified')}
            </span>
          </div>
        </div>
      </section>

      {owner ? (
        <>
          {/* ── Photos: save as soon as they are up ─────────────────── */}
          <div id="photos" className="scroll-mt-20">
            <Card title={t('partner.profile.photos')} icon="image">
              <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
                <div className="flex flex-col gap-2">
                  <h3 className="text-body font-semibold text-c-text">{t('partner.profile.logo')}</h3>
                  <form action={setProfileImage}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="slot" value="logo" />
                    <Uploader purpose="logo" name="mediaId" shape="square" autoSubmit currentUrl={p.logoUrl} labels={uploaderLabels(t, 'photo')} />
                  </form>
                  <p className="text-small text-c-muted">{t('partner.profile.logoHint')}</p>
                  {p.logoUrl === null ? null : <RemovePhoto locale={locale} slot="logo" label={t('partner.profile.removePhoto')} />}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-body font-semibold text-c-text">{t('partner.profile.cover')}</h3>
                  <form action={setProfileImage}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="slot" value="cover" />
                    <Uploader purpose="cover" name="mediaId" shape="wide" autoSubmit currentUrl={p.coverUrl} labels={uploaderLabels(t, 'photo')} />
                  </form>
                  <p className="text-small text-c-muted">{t('partner.profile.coverHint')}</p>
                  {p.coverUrl === null ? null : <RemovePhoto locale={locale} slot="cover" label={t('partner.profile.removePhoto')} />}
                </div>
              </div>
            </Card>
          </div>

          {/* ── Words and contact: one Save for both ─────────────────── */}
          <form action={saveProfile} className="flex flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            <div id="words" className="scroll-mt-20">
              <Card title={t('partner.profile.words')} icon="pencil">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <span className="text-body font-semibold text-c-text">{t('partner.profile.name')}</span>
                    <p className="flex min-h-[3.25rem] items-center rounded-md bg-c-raised px-4 text-bodyL text-c-text">{p.displayName}</p>
                    <p className="text-small text-c-muted">{t('partner.profile.nameHint')}</p>
                  </div>
                  <Field name="tagline" label={t('partner.profile.tagline')} hint={t('partner.profile.taglineHint')} value={p.tagline} maxLength={140} />
                  <Field name="about" label={t('partner.profile.about')} hint={t('partner.profile.aboutHint')} value={p.about} maxLength={2000} multiline />
                </div>
              </Card>
            </div>
            <div id="contact" className="scroll-mt-20">
              <Card title={t('partner.profile.contact')} icon="phone">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field name="phone" type="tel" label={t('partner.profile.phone')} value={p.phone} inputMode="tel" placeholder="010 1234 5678" ltr />
                  <Field name="whatsapp" type="tel" label={t('partner.profile.whatsapp')} hint={t('partner.profile.whatsappHint')} value={p.whatsapp} inputMode="tel" placeholder="010 1234 5678" ltr />
                  <Field name="email" type="email" label={t('partner.profile.email')} value={p.email} inputMode="email" ltr />
                  <Field name="website" label={t('partner.profile.website')} value={p.website} inputMode="url" ltr />
                </div>
                <div className="mt-5">
                  <Field name="addressLine" label={t('partner.profile.address')} hint={t('partner.profile.addressHint')} value={p.addressLine} maxLength={300} />
                </div>
              </Card>
            </div>
            <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
              <Button type="submit" intent="primary" icon="check" block>
                {t('partner.common.save')}
              </Button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}

function RemovePhoto({ locale, slot, label }: { readonly locale: string; readonly slot: 'logo' | 'cover'; readonly label: string }) {
  return (
    <form action={setProfileImage}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="mediaId" value="" />
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-body font-semibold text-c-bad hover:bg-c-bad-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus"
      >
        <Icon name="trash" size={18} />
        {label}
      </button>
    </form>
  );
}
