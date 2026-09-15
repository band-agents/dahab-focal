import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, formatDate, isolate, money } from '@dahab/i18n';
import { Card, Row, StatusPill, useDisplayFontClass } from '@dahab/ui';
import type { StatusTone } from '@dahab/ui';

import { api } from '../src/api';
import type { VendorBooking } from '../src/api';
import { Loading, Problem } from '../src/Problem';
import { Screen } from '../src/Screen';
import { Stale } from '../src/Stale';
import { useSession } from '../src/SessionProvider';
import { useApi } from '../src/useApi';

/**
 * V02 · Bookings.
 *
 * Every row is this operator's, and only this operator's — the procedure
 * behind it reads its vendor from the session and never from an input, so
 * there is no id a caller could change to see somebody else's.
 *
 * The cancellation cascade lives on Today, beside the departure it would
 * cancel. It was on this screen as a fixture: a card describing a cancellation
 * that could not happen, with counts nobody had computed. A preview of an
 * action you cannot take is worse than no preview, so it moved to where the
 * action is real.
 */

const TONE: Record<VendorBooking['status'], StatusTone> = {
  pendingPayment: 'warning',
  confirmed: 'success',
  awaitingVendor: 'warning',
  cancelledByTraveler: 'neutral',
  cancelledByVendor: 'neutral',
  cancelledByWeather: 'info',
  noShow: 'neutral',
  completed: 'success',
  refunded: 'info',
  disputed: 'danger',
};

export default function BookingsScreen() {
  const { t } = useTranslation();
  const display = useDisplayFontClass();
  const session = useSession();
  const context = { locale: session.locale } as const;
  const { query, reload, refreshing } = useApi(() => api.bookings(session.locale), [session.locale]);

  return (
    <Screen onRefresh={reload} refreshing={refreshing}>
      {query.status === 'ok' && query.cachedAt !== undefined ? (
        <Stale at={query.cachedAt} />
      ) : null}

      <View>
        <Text className={`${display} text-displayL text-text`}>{t('vendor.bookings.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {t('vendor.bookings.subtitle')}
        </Text>
      </View>

      {query.status === 'loading' ? (
        <Loading />
      ) : query.status === 'problem' ? (
        <Problem problem={query.problem} onRetry={reload} />
      ) : (
        <Sections bookings={query.data} context={context} />
      )}
    </Screen>
  );
}

function Sections({
  bookings,
  context,
}: {
  readonly bookings: readonly VendorBooking[];
  readonly context: { locale: ReturnType<typeof useSession>['locale'] };
}) {
  const { t } = useTranslation();
  const display = useDisplayFontClass();

  const waiting = bookings.filter((booking) => booking.status === 'awaitingVendor');
  const rest = bookings.filter((booking) => booking.status !== 'awaitingVendor');

  return (
    <>
      {waiting.length === 0 ? null : (
        <Card eyebrow={t('vendor.bookings.waiting')} mark="chat">
          {waiting.map((booking) => (
            <Row
              key={booking.id}
              // A booking with nobody named is the normal shape when a
              // traveller booked as a guest, and reads as such.
              title={booking.travelerName === null ? t('vendor.bookings.guest') : isolate(booking.travelerName)}
              detail={isolate(booking.serviceTitle)}
              meta={`${booking.reference} · ${t('vendor.bookings.heads', { count: booking.heads })}`}
              mark="fin"
              trailing={
                <Text className={`${display} text-h3 tabular-nums text-text`}>
                  {formatCurrency(
                    money(booking.total.amountMinor, booking.total.currency),
                    context,
                  )}
                </Text>
              }
            />
          ))}
        </Card>
      )}

      <Card eyebrow={t('vendor.bookings.upcoming')} mark="pass">
        {rest.length === 0 ? (
          <Text className="font-ui text-body text-text-muted">{t('vendor.bookings.none')}</Text>
        ) : (
          rest.map((booking) => (
            <Row
              key={booking.id}
              title={booking.travelerName === null ? t('vendor.bookings.guest') : isolate(booking.travelerName)}
              detail={isolate(booking.serviceTitle)}
              meta={`${booking.reference} · ${formatDate(new Date(booking.startsAt), context, 'dateTime')}`}
              mark="sail"
              trailing={
                <StatusPill tone={TONE[booking.status]}>
                  {t(`admin.bookingStatus.${booking.status}`)}
                </StatusPill>
              }
            />
          ))
        )}
      </Card>
    </>
  );
}
