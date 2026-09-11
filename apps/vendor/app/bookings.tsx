import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n';
import { Button, Card, Mark, Row, StatusPill } from '@dahab/ui';
import type { MarkName, StatusTone } from '@dahab/ui';

import { BOOKINGS, CASCADE } from '../src/operations';
import type { BookingStatus, CascadeStep } from '../src/operations';
import { session } from '../src/session';

/**
 * V02 · Bookings, and the cancellation cascade on a phone.
 *
 * Weather cancels boats and cancellation is a first-class, cascading
 * operation — so the operator sees what it reaches BEFORE committing: which
 * bookings, the transfer that fed the departure, the refunds it opens, and
 * who has to be told. On a phone that fits in one card, which is the point:
 * the decision is taken at the dock, in the wind, not at a desk.
 */

const TONE: Record<BookingStatus, StatusTone> = {
  pendingPayment: 'warning',
  confirmed: 'success',
  awaitingVendor: 'warning',
  cancelledByWeather: 'info',
  completed: 'neutral',
};

const CASCADE_MARK: Record<CascadeStep['kind'], MarkName> = {
  bookings: 'pass',
  transfer: 'camel',
  refunds: 'shell',
  notifications: 'chat',
};

export default function BookingsScreen() {
  const { t } = useTranslation();
  const context = { locale: session.locale } as const;

  const waiting = BOOKINGS.filter((booking) => booking.status === 'awaitingVendor');
  const upcoming = BOOKINGS.filter((booking) => booking.status !== 'awaitingVendor');

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <View>
        <Text className="font-display text-displayL text-text">{t('vendor.bookings.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {t('vendor.bookings.subtitle')}
        </Text>
      </View>

      {waiting.length === 0 ? null : (
        <Card eyebrow={t('vendor.bookings.waiting')} mark="chat">
          {waiting.map((booking) => (
            <View key={booking.id}>
              <Row
                title={isolate(booking.traveler)}
                detail={isolate(booking.service)}
                meta={`${booking.ref} · ${t('vendor.bookings.heads', { count: booking.heads })}`}
                mark="fin"
                trailing={
                  <Text className="font-display text-h3 tabular-nums text-text">
                    {formatCurrency(money(booking.total.amountMinor, booking.total.currency), context)}
                  </Text>
                }
              />
              <View className="mt-3">
                <Button variant="primary" mark="pass" block>
                  {t('vendor.bookings.confirm')}
                </Button>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/*
        The cascade, shown before the action rather than after it. Naming what
        it touches is the whole value: a total would let an operator cancel
        without ever learning that the 10:10 transfer goes with it.
      */}
      <Card surface="bg-warning-surface" mark="wind" title={t('vendor.bookings.cancelTitle')}>
        <Text className="font-ui text-small text-warning-text">
          {t('vendor.bookings.cancelSub')}
        </Text>

        <View className="mt-4 gap-2">
          {CASCADE.map((step) => (
            <View
              key={step.kind}
              className="flex-row items-center gap-3 rounded-lg bg-surface px-4 py-3"
            >
              <Mark name={CASCADE_MARK[step.kind]} size={24} />
              <View className="flex-1">
                <Text className="font-ui text-body text-text">
                  {t(`admin.cascade.${step.kind}`)}
                </Text>
                <Text className="font-ui text-caption text-text-muted">
                  {step.detail === undefined
                    ? t('vendor.bookings.notifyDetail', {
                        count: step.travellers ?? 0,
                        transfer: isolate(step.transfer ?? ''),
                      })
                    : isolate(step.detail)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-display text-h3 tabular-nums text-text">
                  {formatNumber(step.count, context)}
                </Text>
                {step.amount === undefined ? null : (
                  <Text className="font-ui text-caption text-text-muted">
                    {formatCurrency(money(step.amount.amountMinor, step.amount.currency), context)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Why refunds is fewer than bookings. Without it the numbers read as
            a bug, and an operator who distrusts the arithmetic distrusts the
            whole screen. */}
        <Text className="mt-3 font-ui text-caption text-warning-text">
          {t('vendor.bookings.released')}
        </Text>

        <View className="mt-4 gap-3">
          <Button variant="primary" mark="wind" block>
            {t('vendor.bookings.commit')}
          </Button>
          <Button variant="secondary" block>
            {t('vendor.bookings.keep')}
          </Button>
        </View>
      </Card>

      <Card eyebrow={t('vendor.bookings.upcoming')} mark="pass">
        {upcoming.map((booking) => (
          <Row
            key={booking.id}
            title={isolate(booking.traveler)}
            detail={isolate(booking.service)}
            meta={`${booking.ref} · ${formatDate(new Date(booking.departsAt), context, 'dateTime')}`}
            mark="sail"
            trailing={
              <StatusPill tone={TONE[booking.status]}>
                {t(`admin.bookingStatus.${booking.status}`)}
              </StatusPill>
            }
          />
        ))}
      </Card>
    </ScrollView>
  );
}
