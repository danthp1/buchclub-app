import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, Text, Form } from 'tamagui';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth.store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { WizardSteps } from '../../components/ui/WizardSteps';

export default function UsernameScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const isClient = useDidFinishSSR();

  const [username, setUsername]             = useState('');
  const [loading, setLoading]               = useState(false);
  const [validating, setValidating]         = useState(false);
  const [usernameAvailable, setAvailable]   = useState(false);
  const [usernameError, setUsernameError]   = useState<string | null>(null);
  const [submitError, setSubmitError]       = useState<string | null>(null);

  const debounceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkGeneration  = useRef(0);

  function handleUsernameChange(text: string) {
    setUsername(text);
    setUsernameError(null);
    setAvailable(false);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.length < 3) return;
    if (!/^[a-zA-Z0-9_]+$/.test(text)) {
      setUsernameError(t('onboarding:username_error_format'));
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const generation = ++checkGeneration.current;
      setValidating(true);
      const userId = useAuthStore.getState().session?.user.id;
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', text);
      if (userId) query = query.neq('id', userId);
      const { data } = await query.maybeSingle();
      if (generation !== checkGeneration.current) return; // stale — discard
      setValidating(false);
      if (data) setUsernameError(t('onboarding:username_error_taken'));
      else setAvailable(true);
    }, 500);
  }

  async function handleSubmit() {
    if (loading || !usernameAvailable || !username.trim()) return;
    if (username.length < 3) {
      setUsernameError(t('onboarding:username_error_short'));
      return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) throw new Error('No session');
      // Always UPDATE — handle_new_user trigger creates the row on signup
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', userId);
      if (error) {
        setSubmitError(t('common:error_generic'));
        return;
      }
      router.push('/(onboarding)/avatar');
    } catch {
      setSubmitError(t('common:error_network'));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = usernameAvailable && username.length >= 3 && !validating;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack
            flex={1}
            paddingHorizontal="$lg"
            paddingTop="$2xl"
            gap="$md"
            $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
          >
            <WizardSteps total={2} current={1} />

            <Text
              fontFamily="$heading"
              fontSize={32}
              color="$color"
              textAlign="center"
              marginBottom="$sm"
            >
              {isClient ? t('onboarding:username_heading') : 'What should we call you?'}
            </Text>

            <Text
              fontSize={15}
              color="$colorSecondary"
              textAlign="center"
              marginBottom="$xl"
            >
              {isClient ? t('onboarding:username_subtext') : 'Your username is visible to all club members.'}
            </Text>

            {submitError && <Alert type="error" message={submitError} />}

            <Form onSubmit={handleSubmit}>
              <YStack gap="$sm">
                <Input
                  label={isClient ? t('onboarding:username_label') : 'Username'}
                  placeholder={isClient ? t('onboarding:username_placeholder') : '@username'}
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  maxLength={30}
                  error={usernameError ?? undefined}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <Text fontSize={13} color="$colorSecondary">
                  {isClient ? t('onboarding:username_helper') : '3–30 characters, letters, numbers and _ only'}
                </Text>

                <YStack marginTop="$xl">
                  <Form.Trigger asChild disabled={!canSubmit || loading}>
                    <Button variant="primary" loading={loading}>
                      {isClient ? t('onboarding:continue_cta') : 'Continue'}
                    </Button>
                  </Form.Trigger>
                </YStack>
              </YStack>
            </Form>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
