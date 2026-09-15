import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n';
import { Button, Card, CategoryMark, Illo, Mark, Row, StatusPill, useDisplayFontClass } from '@dahab/ui';
import type { CategoryMarkName } from '@dahab/ui';

import { api } from '../src/api';
import { outstanding, seatCounts } from '../src/manifest';
import type { Departure } from '../src/api';
import { cancelDeparture, previewCancellation } from '../src/cancel';
import type { CancellationPreview } from '../src/cancel';
import { Loading, Problem } from '../src/Problem';
import { Screen } from '../src/Screen';
import { Stale } from '../src/Stale';
import { useSession } from '../src/SessionProvider';
import { isOwner } from '../src/session';
import { useApi } from '../src/useApi';

/**
 * V01 · Today — run the day.
 *
 * The phone screen a guide holds at Masbat. It answers three questions and no
 * others: what is leaving today, who is on it, and what still has to happen
 * before it can leave.
 *
 * Two things the design showed that this does not, because the data behind
 * them does not exist: the conditions strip, and the wind-above-your-limit
 * banner that picked a departure out. No weather source is connected, so the
 * screen says so rather than printing a plausible number. A wind speed nobody
 * measured, on the screen that decides whether a boat sails, is the most
 * dangerous placeholder this product could carry.
 *
 * Cancelling lives here rather than on Bookings, beside the departure it
 * would cancel. It was a fixture on that screen — a preview of an action
 * nobody could take — and a preview you cannot commit is worse than none.
 */

/** The design system's twelve category marks, by the slug the API returns. */
const CATEGORY_MARK: Readonly<Record<string, CategoryMarkName>> = {
  'scuba-diving': 'diving',
  freediving: 'freediving',
  snorkeling: 'snorkeling',
  'boat-trips': 'boatSea',
  'courses-certifications': 'courses',
  kitesurfing: 'kiteWatersports',
  'gear-rental': 'rentals',
  'desert-safari': 'desertSafari',
  'bedouin-culture': 'bedouinCulture',
  'wellness-yoga': 'wellnessYoga',
  transfers: 'transfers',
  photography: 'courses',
};

export default function TodayScreen() {
  const { t } = useTranslation();
  const display = useDisplayFontClass();
  const session = useSession();
  const owner = isOwner(session.role);
  const { query, reload, refreshing } = useApi(() => api.today(session.locale), [session.locale]);

  return (
    <Screen onRefresh={reload} refreshing={refreshing}>
      {query.status === 'ok' && query.cachedAt !== undefined ? (
        <Stale at={query.cachedAt} />
      ) : null}

      <View>
        <Text className="font-ui text-overline uppercase text-text-muted">
          {/* The operator's real name, or the role alone. A profile with no
              display name is ordinary; inventing one is not. */}
          {session.vendorName === null
            ? t(owner ? 'vendor.role.owner' : 'vendor.role.staff')
            : `${session.vendorName} · ${t(owner ? 'vendor.role.owner' : 'vendor.role.staff')}`}
        </Text>
        <Text className={`mt-1 ${display} text-displayL text-text`}>
          {session.displayName === null
            ? t('vendor.today.greetingAnon')
            : t('vendor.today.greeting', { name: isolate(session.displayName) })}
        </Text>
      </View>

      {/*
        Neutral ground, not warning. There is nothing to warn about — there is
        nothing to read at all. This turns into the conditions strip the design
        drew on the day a weather source can actually answer.
      */}
      <View className="flex-row items-start gap-3 rounded-lg bg-surface p-4">
        <Mark name="wind" size={20} noFlip />
        <Text className="flex-1 font-ui text-small text-text-muted">
          {t('vendor.today.noWeather')}
        </Text>
      </View>

      <View className="gap-4">
        <Text className="font-ui text-overline uppercase text-text-muted">
          {t('vendor.today.next')}
        </Text>

        {query.status === 'loading' ? (
          <Loading />
        ) : query.status === 'problem' ? (
          <Problem problem={query.problem} onRetry={reload} />
        ) : query.data.length === 0 ? (
          <View className="items-center gap-3 py-6">
            <Illo name="dhow" size={72} />
            <Text className="font-ui text-body text-text-muted">
              {t('vendor.today.nothing')}
            </Text>
          </View>
        ) : (
          query.data.map((departure) => (
            <DepartureCard key={departure.id} departure={departure} onChanged={reload} />
          ))
        )}
      </View>

      {owner ? null : (
        // The staff wall, said plainly. A greyed-out Money tab would leave a
        // guide wondering whether it is broken or forbidden.
        <View className="flex-row items-start gap-3 rounded-lg bg-info-surface p-4">
          <Mark name="chat" size={20} />
          <Text className="flex-1 font-ui text-small text-info-text">
            {t('vendor.role.staffLimitNoName')}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function DepartureCard({
  departure,
  onChanged,
}: {
  readonly departure: Departure;
  readonly onChanged: () => void;
}) {
  const { t } = useTranslation();
  const display = useDisplayFontClass();
  const session = useSession();
  const context = { locale: session.locale } as const;
  const seats = seatCounts(departure.participants);
  const todo = outstanding(departure);

  const [cancelling, setCancelling] = useState(false);

  return (
    <Card
      mark="sail"
      eyebrow={isolate(formatDate(new Date(departure.startsAt), context, 'time'))}
      title={departure.serviceTitle}
      trailing={
        <Text className={`${display} text-h2 tabular-nums text-text`}>
          {t('vendor.today.seats', {
            used: formatNumber(seats.capacity, context),
            total: formatNumber(departure.capacity, context),
          })}
        </Text>
      }
    >
      <View className="flex-row items-center gap-2">
        <CategoryMark name={CATEGORY_MARK[departure.categorySlug] ?? 'diving'} size={20} />
        <Text className="flex-1 font-ui text-small text-text-muted">
          {departure.siteNameKeys.length === 0
            ? departure.categorySlug
            : departure.siteNameKeys.map((key) => t(key)).join(' → ')}
        </Text>
      </View>

      {departure.isCancelled ? (
        <View className="mt-3">
          <StatusPill tone="info" mark="wind">
            {t('admin.bookingStatus.cancelledByWeather')}
          </StatusPill>
        </View>
      ) : null}

      {/* Seats held versus seats billed, shown only where they differ — an
          infant or an accompanying instructor holds a place without paying. */}
      {seats.capacity === seats.chargeable ? null : (
        <Text className="mt-1 font-ui text-caption text-text-muted">
          {t('vendor.today.billed', {
            capacity: formatNumber(seats.capacity, context),
            chargeable: formatNumber(seats.chargeable, context),
          })}
        </Text>
      )}

      <View className="mt-4 flex-row flex-wrap gap-2">
        <StatusPill tone={todo.waivers === 0 ? 'success' : 'warning'}>
          {t('vendor.outstanding.waivers', { count: todo.waivers })}
        </StatusPill>
        {todo.medical === 0 ? null : (
          <StatusPill tone="danger" mark="firstAid">
            {t('vendor.outstanding.medical', { count: todo.medical })}
          </StatusPill>
        )}
      </View>

      <View className="mt-4">
        {departure.participants.length === 0 ? (
          <Text className="font-ui text-body text-text-muted">{t('vendor.today.noManifest')}</Text>
        ) : (
          departure.participants.map((person) => (
            <Row
              key={person.id}
              title={isolate(person.name)}
              detail={person.certification ?? t('vendor.person.noCert')}
              meta={
                !person.waiverSigned
                  ? t('vendor.person.noWaiver')
                  : person.medicalFlag
                    ? t('vendor.person.medical')
                    : undefined
              }
              mark={person.kind === 'instructor' ? 'diver' : 'mask'}
            />
          ))
        )}
      </View>

      {departure.isCancelled ? null : cancelling ? (
        <CancelPanel
          departure={departure}
          onClose={() => setCancelling(false)}
          onDone={() => {
            setCancelling(false);
            onChanged();
          }}
        />
      ) : (
        <View className="mt-4">
          <Button variant="secondary" mark="wind" onPress={() => setCancelling(true)} block>
            {t('vendor.cancel.open')}
          </Button>
        </View>
      )}
    </Card>
  );
}

/**
 * What cancelling reaches, then the commit.
 *
 * The preview is fetched from the same rows the commit would touch, so the
 * numbers an operator agrees to are the numbers that happen. Both go through
 * the API scoped to this operator's own vendor — a slot belonging to anyone
 * else is not found rather than forbidden.
 */
function CancelPanel({
  departure,
  onClose,
  onDone,
}: {
  readonly departure: Departure;
  readonly onClose: () => void;
  readonly onDone: () => void;
}) {
  const { t } = useTranslation();
  const display = useDisplayFontClass();
  const session = useSession();
  const context = { locale: session.locale } as const;

  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Fetched once when the panel opens. `live` guards the case an operator
  // closes it before the answer arrives, which on this signal is common.
  useEffect(() => {
    let live = true;
    void previewCancellation(departure.id, session.locale).then((result) => {
      if (!live) return;
      if (result.ok) setPreview(result.data);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [departure.id, session.locale]);

  async function commit() {
    if (busy || reason.trim().length < 8) return;
    setBusy(true);
    const result = await cancelDeparture(departure.id, reason.trim());
    setBusy(false);
    if (result.ok) onDone();
    else setFailed(true);
  }

  return (
    <View className="mt-4 gap-3 rounded-lg bg-warning-surface p-4">
      <Text className={`${display} text-h3 text-warning-text`}>{t('vendor.cancel.title')}</Text>

      {failed ? (
        <Text className="font-ui text-small text-danger-text">{t('vendor.cancel.failed')}</Text>
      ) : preview === null ? (
        <Loading />
      ) : (
        <>
          <Text className="font-ui text-small text-warning-text">
            {t('vendor.cancel.summary', {
              bookings: preview.bookings.length,
              refunds: preview.refunds.length,
              releases: preview.releases.length,
            })}
          </Text>
          {preview.refundTotalMinor === 0 ? null : (
            <Text className={`${display} text-h2 tabular-nums text-warning-text`}>
              {formatCurrency(money(preview.refundTotalMinor, preview.currency), context)}
            </Text>
          )}
          <Text className="font-ui text-caption text-warning-text">
            {t('vendor.cancel.irreversible')}
          </Text>
        </>
      )}

      <View className="gap-2">
        <Text className="font-ui text-small text-text">{t('admin.review.reason')}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          className="min-h-11 rounded-input border border-border-strong bg-surface p-3 font-ui text-body text-text"
        />
        <Text className="font-ui text-caption text-text-muted">
          {t('admin.cancelReview.reasonHint')}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Button
          variant="primary"
          mark="wind"
          disabled={busy || preview === null || reason.trim().length < 8}
          onPress={() => void commit()}
        >
          {t(busy ? 'vendor.cancel.working' : 'vendor.cancel.commit')}
        </Button>
        <Button variant="secondary" onPress={onClose}>
          {t('admin.review.close')}
        </Button>
      </View>
    </View>
  );
}
