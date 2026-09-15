import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDistance, formatNumber, formatTemperature, isolate } from '@dahab/i18n';
import { Button, Card, Illo, Mark, Row, StatusPill } from '@dahab/ui';

import { CONDITIONS, DEPARTURES, OFFLINE_READY, outstanding, seatCounts } from '../src/day';
import type { Departure } from '../src/day';
import { useSession } from '../src/SessionProvider';
import { isOwner } from '../src/session';

/**
 * V01 · Today — run the day.
 *
 * The phone screen a guide holds at Masbat. It answers three questions and no
 * others: what is leaving in the next four hours, who is on it, and what still
 * has to happen before it can leave.
 *
 * Everything a guide needs on the water is here because the Blue Hole road
 * drops out most mornings — offline is a designed state, not an error.
 */
export default function TodayScreen() {
  const { t } = useTranslation();
  const session = useSession();
  const context = { locale: session.locale } as const;
  const owner = isOwner(session.role);

  const atRisk = DEPARTURES.find(
    (departure) =>
      departure.windForecastKt !== undefined &&
      departure.windLimitKt !== undefined &&
      departure.windForecastKt > departure.windLimitKt,
  );

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <View>
        <Text className="font-ui text-overline uppercase text-text-muted">
          {/* The operator's real name, or the role alone. A profile with no
              display name is ordinary; inventing one is not. */}
          {session.vendorName === null
            ? t(owner ? 'vendor.role.owner' : 'vendor.role.staff')
            : `${session.vendorName} · ${t(owner ? 'vendor.role.owner' : 'vendor.role.staff')}`}
        </Text>
        <Text className="mt-1 font-display text-displayL text-text">
          {session.displayName === null
            ? t('vendor.today.greetingAnon')
            : t('vendor.today.greeting', { name: isolate(session.displayName) })}
        </Text>
        <Text className="mt-1 font-ui text-body text-text-muted">{t('vendor.today.subtitle')}</Text>
      </View>

      {/* Conditions: three readings, each its own element so a Latin unit
          beside a digit cannot reorder inside an Arabic line. */}
      <Card eyebrow={t('vendor.today.conditions')} mark="wind">
        <View className="flex-row gap-6">
          {[
            { key: 'wind', value: `${formatNumber(CONDITIONS.windKt, context)} kt` },
            { key: 'water', value: formatTemperature(CONDITIONS.waterC, context) },
            { key: 'vis', value: formatDistance(CONDITIONS.visibilityM, context) },
          ].map((reading) => (
            <Text key={reading.key} className="font-display text-h2 text-text">
              {reading.value}
            </Text>
          ))}
        </View>
      </Card>

      {atRisk === undefined ? null : (
        <Card
          surface="bg-warning-surface"
          mark="wind"
          title={t('vendor.wind.title')}
          eyebrow={atRisk.time}
        >
          <Text className="font-ui text-body text-warning-text">
            {t('vendor.wind.body', {
              forecast: atRisk.windForecastKt,
              limit: atRisk.windLimitKt,
            })}
          </Text>
          <View className="mt-4">
            <Button variant="primary" mark="sail">
              {t('vendor.wind.review')}
            </Button>
          </View>
        </Card>
      )}

      <View className="gap-4">
        <Text className="font-ui text-overline uppercase text-text-muted">
          {t('vendor.today.next')}
        </Text>
        {DEPARTURES.map((departure) => (
          <DepartureCard key={departure.id} departure={departure} />
        ))}
      </View>

      <Card surface="bg-sand-50" mark="offline" title={t('vendor.offline.title')}>
        <Text className="font-ui text-body text-text">
          {t('vendor.offline.body', {
            vouchers: OFFLINE_READY.vouchers,
            points: OFFLINE_READY.meetingPoints,
            manifests: OFFLINE_READY.manifests,
          })}
        </Text>
      </Card>

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
    </ScrollView>
  );
}

function DepartureCard({ departure }: { readonly departure: Departure }) {
  const { t } = useTranslation();
  const session = useSession();
  const context = { locale: session.locale } as const;
  const seats = seatCounts(departure.participants);
  const todo = outstanding(departure);

  return (
    <Card
      mark={departure.mark}
      eyebrow={departure.time}
      title={departure.service}
      trailing={
        <Text className="font-display text-h2 tabular-nums text-text">
          {t('vendor.today.seats', {
            used: formatNumber(seats.capacity, context),
            total: formatNumber(departure.capacity, context),
          })}
        </Text>
      }
    >
      <Text className="font-ui text-small text-text-muted">
        {isolate(departure.site)} · {t('vendor.today.guide', { name: isolate(departure.guide) })}
      </Text>

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
        <StatusPill tone={todo.certifications === 0 ? 'success' : 'danger'}>
          {t('vendor.outstanding.certifications', { count: todo.certifications })}
        </StatusPill>
        <StatusPill tone={todo.waivers === 0 ? 'success' : 'warning'}>
          {t('vendor.outstanding.waivers', { count: todo.waivers })}
        </StatusPill>
        <StatusPill tone={todo.pickups === 0 ? 'success' : 'warning'} mark="camel">
          {t('vendor.outstanding.pickups', { count: todo.pickups })}
        </StatusPill>
      </View>

      <View className="mt-4">
        {departure.participants.map((person) => (
          <Row
            key={person.id}
            title={person.name}
            detail={person.certification ?? t('vendor.person.noCert')}
            meta={
              person.certificationShort
                ? t('vendor.person.certShort')
                : !person.waiverSigned
                  ? t('vendor.person.noWaiver')
                  : person.medicalFlag
                    ? t('vendor.person.medical')
                    : undefined
            }
            mark={person.kind === 'instructor' ? 'diver' : 'mask'}
            trailing={
              <StatusPill
                tone={person.pickedUp ? 'success' : 'neutral'}
                mark={person.pickedUp ? 'eco' : 'camel'}
              >
                {person.pickedUp ? t('vendor.person.collected') : t('vendor.person.notPickedUp')}
              </StatusPill>
            }
          />
        ))}
      </View>

      <View className="mt-4 flex-row gap-3">
        <Button variant="primary" mark="pass">
          {t('vendor.action.checkIn')}
        </Button>
        <Button variant="secondary" mark="chat">
          {t('vendor.action.message')}
        </Button>
      </View>

      {departure.participants.length === 0 ? <Illo name="coralFan" size={56} /> : null}
    </Card>
  );
}
