import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Mark } from '@dahab/ui';

import { signIn } from './auth';
import { useSessionState } from './SessionProvider';

/**
 * Signing in to the operator app.
 *
 * Not a route: the layout renders this *instead of* the tabs when nobody is
 * signed in. A `/sign-in` route would be reachable by typing it, and the tab
 * bar would sit underneath it showing sections the visitor cannot open.
 *
 * Arabic-first, like every other screen here. The people running a dive
 * centre in Dahab work in Arabic, which is a different fact from Arabic being
 * one of seven locales in the traveller app.
 */
export function SignInScreen() {
  const { t } = useTranslation();
  const { signedIn } = useSessionState();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<'invalid' | 'notVendor' | 'unreachable' | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.ok) signedIn(result.session);
    else setError(result.reason);
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-6 px-5 pb-16 pt-20"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center gap-3">
        <View className="size-12 items-center justify-center rounded-md bg-info-surface">
          <Mark name="compass" size={26} noFlip />
        </View>
        <View className="flex-1">
          <Text className="font-display text-h3 text-text">{t('vendor.signIn.brand')}</Text>
          <Text className="font-ui text-caption text-text-muted">
            {t('vendor.signIn.brandSub')}
          </Text>
        </View>
      </View>

      <View>
        <Text className="font-display text-displayL text-text">{t('vendor.signIn.title')}</Text>
        <Text className="mt-1 font-ui text-body text-text-muted">
          {t('vendor.signIn.subtitle')}
        </Text>
      </View>

      {error === null ? null : (
        <View
          // Status is never colour alone: a tint, a mark and a sentence.
          accessibilityRole="alert"
          className="flex-row items-start gap-3 rounded-lg bg-danger-surface p-4"
        >
          <Mark name="sos" size={20} />
          <Text className="flex-1 font-ui text-small text-danger-text">
            {t(`vendor.signIn.${error}`)}
          </Text>
        </View>
      )}

      <View className="gap-4">
        <View className="gap-2">
          <Text className="font-ui text-small text-text">{t('vendor.signIn.email')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="username"
            keyboardType="email-address"
            // An address is not prose: left-to-right even on an Arabic screen,
            // or the bidi algorithm reorders the parts around the @.
            style={{ writingDirection: 'ltr' }}
            className="min-h-11 rounded-input border border-border-strong bg-surface px-4 font-ui text-body text-text"
          />
        </View>

        <View className="gap-2">
          <Text className="font-ui text-small text-text">{t('vendor.signIn.password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={() => void submit()}
            style={{ writingDirection: 'ltr' }}
            className="min-h-11 rounded-input border border-border-strong bg-surface px-4 font-ui text-body text-text"
          />
        </View>

        <Button variant="primary" onPress={() => void submit()} disabled={busy}>
          {t(busy ? 'vendor.signIn.working' : 'vendor.signIn.submit')}
        </Button>
      </View>

      <Text className="font-ui text-caption text-text-muted">{t('vendor.signIn.noSelfServe')}</Text>
    </ScrollView>
  );
}
