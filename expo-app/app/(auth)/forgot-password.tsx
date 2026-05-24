import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, Text, Form, ScrollView } from 'tamagui';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export default function ForgotPassword() {
  const { t } = useTranslation(['auth', 'common']);
  const isClient = useDidFinishSSR();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // redirectTo MUST match app.json scheme + Supabase dashboard allowlist (buchclub://**).
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'buchclub://reset-password',
      });
      if (resetError) {
        // Privacy-safe — do NOT distinguish "email not found" vs other errors (Security Domain).
        // Still set success state to avoid leaking existence; the user sees the same message either way.
        setLinkSent(true);
        return;
      }
      setLinkSent(true);
    } catch {
      setError(t('common:error_network'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFAF6' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <YStack
            flex={1}
            paddingHorizontal="$lg"
            paddingTop="$2xl"
            gap="$xl"
            $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
          >
            <Text fontSize={22} fontWeight="600" color="$color">
              {isClient ? t('auth:reset_password_heading') : 'Reset Password'}
            </Text>
            {linkSent ? (
              <YStack gap="$md">
                <Alert
                  type="success"
                  message={isClient ? t('auth:link_sent_body') : 'Check your inbox.'}
                />
                <Text fontSize={22} fontWeight="600" color="$color">
                  {isClient ? t('auth:link_sent_heading') : 'Link sent!'}
                </Text>
                <Button variant="secondary" onPress={() => router.replace('/(auth)/sign-in')}>
                  {isClient ? t('auth:back_to_signin') : 'Back to sign in'}
                </Button>
              </YStack>
            ) : (
              <>
                <Text fontSize={14} color="$colorSecondary">
                  {isClient ? t('auth:reset_password_subtext') : 'Enter your email — we will send a reset link.'}
                </Text>
                {error && <Alert type="error" message={error} />}
                <Form onSubmit={handleSubmit}>
                  <YStack gap="$md">
                    <Input
                      label={isClient ? t('auth:email_label') : 'Email'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      value={email}
                      onChangeText={setEmail}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    <YStack marginTop="$md" gap="$lg">
                      <Form.Trigger asChild disabled={loading}>
                        <Button variant="primary" loading={loading}>
                          {isClient ? t('auth:send_link_cta') : 'Send link'}
                        </Button>
                      </Form.Trigger>
                      <Button variant="secondary" onPress={() => router.replace('/(auth)/sign-in')}>
                        {isClient ? t('auth:back_to_signin') : 'Back to sign in'}
                      </Button>
                    </YStack>
                  </YStack>
                </Form>
              </>
            )}
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
