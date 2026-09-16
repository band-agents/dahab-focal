import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, money } from '@dahab/i18n';
import { Button, Card, Mark, StatusPill, useDisplayFontClass } from '@dahab/ui';
import type { StatusTone } from '@dahab/ui';

import { api } from '../src/api';
import type { VendorService } from '../src/api';
import { Loading, Problem } from '../src/Problem';
import { Screen } from '../src/Screen';
import { Stale } from '../src/Stale';
import { useSession } from '../src/SessionProvider';
import { isOwner } from '../src/session';
import { useApi } from '../src/useApi';

/**
 * V03 · Services.
 *
 * The screen this product is judged on, because it is where an operator finds
 * out whether a traveller can compare their trip at all. Comparable attributes
 * are data, so "three answers missing" is not a nag — it is the difference
 * between appearing in a comparison and being invisible in it.
 *
 * The inclusions line is the honest-operator argument made out loud: the
 * hidden-cost detector normalises every inclusion into one shown price, so
 * stating them fully is what makes you rank well rather than what costs you.
 * An operator who believes the opposite under-declares, and the whole
 * comparison degrades.
 *
 * Publishing is the owner's: `catalog.publish` is not in vendorStaff.
 */

const TONE: Record<VendorService['status'], StatusTone> = {
  draft: 'neutral',
  underReview: 'warning',
  published: 'success',
  paused: 'info',
  archived: 'neutral',
  rejected: 'danger',
};

export default function ServicesScreen() {
  const { t } = useTranslation();
  const display = useDisplayFontClass();
  const session = useSession();
  const owner = isOwner(session.role);
  const { query, reload, refreshing } = useApi(() => api.services(session.locale), [session.locale]);

  return (
    <Screen onRefresh={reload} refreshing={refreshing}>
      {query.status === 'ok' && query.cachedAt !== undefined ? (
        <Stale at={query.cachedAt} />
      ) : null}

      <View>
        <Text className={`${display} text-displayL text-text`}>{t('vendor.services.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {t('vendor.services.subtitle')}
        </Text>
      </View>

      {owner ? null : (
        <View className="flex-row items-start gap-3 rounded-lg bg-info-surface p-4">
          <Mark name="chat" size={20} />
          <Text className="flex-1 font-ui text-small text-info-text">
            {t('vendor.services.publishOwnerNoName')}
          </Text>
        </View>
      )}

      {query.status === 'loading' ? (
        <Loading />
      ) : query.status === 'problem' ? (
        <Problem problem={query.problem} onRetry={reload} />
      ) : query.data.length === 0 ? (
        <Text className="font-ui text-body text-text-muted">{t('vendor.services.none')}</Text>
      ) : (
        query.data.map((service) => (
          <ServiceCard key={service.id} service={service} owner={owner} />
        ))
      )}
    </Screen>
  );
}

function ServiceCard({
  service,
  owner,
}: {
  readonly service: VendorService;
  readonly owner: boolean;
}) {
  const { t } = useTranslation();
  const display = useDisplayFontClass();
  const session = useSession();
  const context = { locale: session.locale } as const;
  const ready = service.missingComparable === 0;

  return (
    <Card
      mark="tank"
      title={service.title}
      eyebrow={service.categorySlug}
      trailing={
        <StatusPill tone={TONE[service.status]}>
          {t(`admin.serviceStatus.${service.status}`)}
        </StatusPill>
      }
    >
      {/* No pricing model is a real state — a draft written before anyone
          decided what it costs — and reads as "not priced", never as zero. */}
      <View className="flex-row items-baseline gap-2">
        <Text className="font-ui text-small text-text-muted">{t('vendor.services.from')}</Text>
        {service.fromPrice === null ? (
          <Text className="font-ui text-body text-text-muted">
            {t('vendor.services.unpriced')}
          </Text>
        ) : (
          <Text className={`${display} text-h2 tabular-nums text-text`}>
            {formatCurrency(
              money(service.fromPrice.amountMinor, service.fromPrice.currency),
              context,
            )}
          </Text>
        )}
      </View>

      <View className="mt-3">
        <StatusPill tone={ready ? 'success' : 'warning'} mark={ready ? 'eco' : 'firstAid'}>
          {t('vendor.services.comparable', { count: service.missingComparable })}
        </StatusPill>
      </View>

      <View className="mt-4">
        <Text className="font-ui text-overline uppercase text-text-muted">
          {t('vendor.services.inclusions')}
        </Text>
        {service.inclusions.length === 0 ? (
          <Text className="mt-2 font-ui text-small text-text-muted">
            {t('vendor.services.noInclusions')}
          </Text>
        ) : (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {service.inclusions.map((inclusion) => (
              <View key={inclusion} className="rounded-pill bg-surface-raised px-3 py-1">
                {/* The machine key until `attribute.*` is translated — shown
                    as a key rather than dressed up as prose it is not. */}
                <Text className="font-mono text-caption text-text">{inclusion}</Text>
              </View>
            ))}
          </View>
        )}
        <Text className="mt-2 font-ui text-caption text-text-muted">
          {t('vendor.services.inclusionsNote')}
        </Text>
      </View>

      {/*
        Publishing is gated by permission, not by a disabled button: a guide
        saves a draft and it goes to the owner, which is a different action
        rather than the same one refused.
      */}
      <View className="mt-4">
        <Button variant={owner ? 'primary' : 'secondary'} mark="pass" block>
          {owner ? t('action.save') : t('status.draft')}
        </Button>
      </View>
    </Card>
  );
}
