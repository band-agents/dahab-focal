import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency, formatDate, isolate, money } from '@dahab/i18n';
import { Button, Card, Illo, Mark, Row, StatusPill } from '@dahab/ui';

import { api } from '../src/api';
import type { Earnings, Resource, StaffMember } from '../src/api';
import { Loading, Problem } from '../src/Problem';
import { useSession, useSessionState } from '../src/SessionProvider';
import { isOwner } from '../src/session';
import { useApi } from '../src/useApi';

/**
 * V05–V07 · Team, equipment and money, gated by role.
 *
 * This screen is where the owner/staff split is most visible: a guide reaching
 * it sees equipment and nothing else, because `vendorStaff` holds
 * `resource.manage` but neither `staff.manage` nor `payout.readOwn`.
 *
 * The two expiries here are not warnings, they are refusals. A lapsed
 * instructor rating cannot be assigned as guide and the calendar says so; a
 * cylinder inside its hydrostatic window cannot go on a manifest. Surfacing
 * them before they bite is the whole point of the vendor model.
 */
export default function MoreScreen() {
  const { t } = useTranslation();
  const session = useSession();
  const { signOut } = useSessionState();
  const context = { locale: session.locale } as const;
  const owner = isOwner(session.role);

  // Three separate reads because they are three separate permissions. A guide
  // holds `resource.manage` and neither of the other two, so their app does
  // not merely hide the money — the procedure behind it refuses them.
  const earnings = useApi(() => api.earnings(), []);
  const staff = useApi(() => api.staff(), []);
  const resources = useApi(() => api.resources(), []);

  const cash = (amount: { amountMinor: number; currency: Earnings['gross']['currency'] }) =>
    formatCurrency(money(amount.amountMinor, amount.currency), context);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 px-5 pb-16 pt-14">
      <View>
        <Text className="font-display text-displayL text-text">{t('vendor.more.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {session.vendorName === null
            ? t(owner ? 'vendor.role.owner' : 'vendor.role.staff')
            : `${session.vendorName} · ${t(owner ? 'vendor.role.owner' : 'vendor.role.staff')}`}
        </Text>
      </View>

      {owner ? (
        <Card
          mark="shell"
          title={t('vendor.more.money')}
          eyebrow={t('vendor.more.ownerOnly')}
        >
          <Text className="font-ui text-small text-text-muted">{t('vendor.more.moneySub')}</Text>
          {earnings.query.status === 'loading' ? (
            <Loading />
          ) : earnings.query.status === 'problem' ? (
            <View className="mt-3">
              <Problem problem={earnings.query.problem} onRetry={earnings.reload} />
            </View>
          ) : (
            <Money earnings={earnings.query.data} cash={cash} context={context} />
          )}
        </Card>
      ) : null}

      {owner ? (
        <Card mark="diver" title={t('vendor.more.staff')} eyebrow={t('vendor.more.ownerOnly')}>
          <Text className="font-ui text-small text-text-muted">{t('vendor.more.staffSub')}</Text>
          {staff.query.status === 'loading' ? (
            <Loading />
          ) : staff.query.status === 'problem' ? (
            <View className="mt-3">
              <Problem problem={staff.query.problem} onRetry={staff.reload} />
            </View>
          ) : staff.query.data.length === 0 ? (
            <Text className="mt-3 font-ui text-body text-text-muted">
              {t('vendor.more.noStaff')}
            </Text>
          ) : (
            <View className="mt-3">
              {staff.query.data.map((member) => (
                <StaffRow key={member.id} member={member} context={context} />
              ))}
            </View>
          )}
        </Card>
      ) : null}

      {/* `resource.manage` is in vendorStaff, so a guide sees this one. */}
      <Card mark="tank" title={t('vendor.more.resources')}>
        <Text className="font-ui text-small text-text-muted">{t('vendor.more.resourcesSub')}</Text>
        {resources.query.status === 'loading' ? (
          <Loading />
        ) : resources.query.status === 'problem' ? (
          <View className="mt-3">
            <Problem problem={resources.query.problem} onRetry={resources.reload} />
          </View>
        ) : resources.query.data.length === 0 ? (
          <Text className="mt-3 font-ui text-body text-text-muted">
            {t('vendor.more.noResources')}
          </Text>
        ) : (
          <View className="mt-3">
            {resources.query.data.map((resource) => (
              <ResourceRow key={resource.id} resource={resource} context={context} />
            ))}
          </View>
        )}
      </Card>

      {owner ? null : (
        <View className="items-center gap-3 py-6">
          <Illo name="seaTurtle" size={72} />
          <View className="flex-row items-start gap-3 rounded-lg bg-info-surface p-4">
            <Mark name="chat" size={20} />
            <Text className="flex-1 font-ui text-small text-info-text">
              {t('vendor.role.staffLimitNoName')}
            </Text>
          </View>
        </View>
      )}

      {/*
        The way out, at the foot of the last tab rather than beside anything
        that commits something. The address is shown because a shared phone at
        a dive centre is normal, and knowing whose session is open matters
        before you check anyone in.
      */}
      <View className="gap-3 border-t border-border pt-6">
        {session.email === null ? null : (
          <Text className="font-ui text-caption text-text-muted">{isolate(session.email)}</Text>
        )}
        <Button variant="secondary" onPress={signOut}>
          {t('vendor.more.signOut')}
        </Button>
      </View>
    </ScrollView>
  );
}

type Context = { locale: ReturnType<typeof useSession>['locale'] };

/**
 * Gross, what the platform keeps, what the provider keeps, and what actually
 * lands. The four are shown together because the last one on its own invites
 * the question the other three answer.
 */
function Money({
  earnings,
  cash,
  context,
}: {
  readonly earnings: Earnings;
  readonly cash: (amount: Earnings['gross']) => string;
  readonly context: Context;
}) {
  const { t } = useTranslation();
  return (
    <>
      <View className="mt-4 gap-2">
        {[
          { key: 'gross', label: t('admin.money.gross'), value: cash(earnings.gross) },
          { key: 'commission', label: t('admin.money.commission'), value: cash(earnings.commission) },
          { key: 'fees', label: t('admin.money.fees'), value: cash(earnings.fees) },
          { key: 'net', label: t('admin.money.net'), value: cash(earnings.net) },
        ].map((line) => (
          <View
            key={line.key}
            className="flex-row items-baseline justify-between rounded-sm bg-bg px-3 py-2"
          >
            <Text className="font-ui text-body text-text">{line.label}</Text>
            <Text className="font-display text-body tabular-nums text-text">{line.value}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-3 font-ui text-small text-text-muted">
        {/* Nothing scheduled is a different fact from a payout of zero, and
            an operator chasing money needs to be able to tell them apart. */}
        {earnings.nextPayoutOn === null
          ? t('vendor.more.noPayout')
          : t('vendor.more.nextPayout', {
              date: isolate(
                formatDate(new Date(`${earnings.nextPayoutOn}T00:00:00Z`), context, 'date'),
              ),
            })}
      </Text>
    </>
  );
}

function StaffRow({
  member,
  context,
}: {
  readonly member: StaffMember;
  readonly context: Context;
}) {
  const { t } = useTranslation();
  return (
    <Row
      title={isolate(member.name)}
      detail={member.rating === null ? (member.jobTitle ?? '') : isolate(member.rating)}
      meta={
        member.expiresOn === null
          ? t('vendor.more.noExpiry')
          : t('vendor.more.dueOn', {
              date: isolate(
                formatDate(new Date(`${member.expiresOn}T00:00:00Z`), context, 'date'),
              ),
            })
      }
      mark="mask"
      trailing={
        member.lapsed ? (
          <StatusPill tone="danger" mark="sos">
            {t('vendor.more.lapsed')}
          </StatusPill>
        ) : (
          <StatusPill tone="success" mark="eco">
            {t('status.verified')}
          </StatusPill>
        )
      }
    />
  );
}

function ResourceRow({
  resource,
  context,
}: {
  readonly resource: Resource;
  readonly context: Context;
}) {
  const { t } = useTranslation();
  return (
    <Row
      title={isolate(resource.label)}
      meta={
        resource.dueOn === null
          ? t('vendor.more.noExpiry')
          : t('vendor.more.dueOn', {
              date: isolate(
                formatDate(new Date(`${resource.dueOn}T00:00:00Z`), context, 'date'),
              ),
            })
      }
      mark="tank"
      trailing={
        resource.blocked ? (
          <StatusPill tone="danger" mark="sos">
            {t('vendor.more.blocked')}
          </StatusPill>
        ) : (
          <StatusPill tone="success" mark="eco">
            {t('status.verified')}
          </StatusPill>
        )
      }
    />
  );
}
