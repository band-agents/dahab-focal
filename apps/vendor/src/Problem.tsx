import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Illo, Mark } from '@dahab/ui';

import type { Problem as ProblemKind } from './api';
import { useSessionState } from './SessionProvider';

/**
 * Why a screen has nothing on it.
 *
 * The console's `DataProblemNotice`, for the phone. The rule is the same and
 * matters more here: an empty manifest and a manifest we could not fetch look
 * identical, and only one of them means nobody is coming. Signal drops on the
 * Blue Hole road most mornings, so this is the common state rather than the
 * exceptional one — which is why it offers a retry rather than an apology.
 */
export function Problem({ problem, onRetry }: { problem: ProblemKind; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { signOut } = useSessionState();

  const offline = problem.kind === 'offline';

  return (
    <View className="items-center gap-4 rounded-lg bg-warning-surface p-5">
      <Illo name={offline ? 'dhow' : 'seaTurtle'} size={64} />
      <View className="flex-row items-start gap-3">
        <Mark name={offline ? 'offline' : 'sos'} size={20} />
        <Text className="flex-1 font-ui text-small text-warning-text">
          {t(`vendor.problem.${problem.kind}`)}
        </Text>
      </View>

      {problem.kind === 'signedOut' ? (
        <Button variant="primary" onPress={signOut}>
          {t('vendor.problem.signInAgain')}
        </Button>
      ) : onRetry === undefined ? null : (
        <Button variant="secondary" onPress={onRetry}>
          {t('vendor.problem.retry')}
        </Button>
      )}
    </View>
  );
}

/** While a read is in flight. Never an empty state standing in for one. */
export function Loading() {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-3 py-8">
      <Mark name="bubbles" size={32} />
      <Text className="font-ui text-small text-text-muted">{t('vendor.problem.loading')}</Text>
    </View>
  );
}
