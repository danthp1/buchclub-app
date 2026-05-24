import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, Form, ScrollView } from 'tamagui';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export default function SignIn() {
  const { t } = useTranslation(['auth', 'common']);
  const isClient = useDidFinishSSR();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Generic copy — never reveal which field is wrong (Security Domain T-01-02).
        setError(t('auth:error_invalid_credentials'));
        return;
      }
      // Success: AuthProvider's onAuthStateChange writes session → InitialLayout redirects to /(app)/books.
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
          <YStack flex={1} paddingHorizontal="$lg" paddingTop="$2xl" gap="$xl" $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}>
            <YStack alignItems="center" gap="$sm">
              <Text fontSize={28} fontWeight="600" color="$color">Buchclub</Text>
            </YStack>
            <Text fontSize={22} fontWeight="600" color="$color">
              {isClient ? t('auth:signIn') : 'Sign In'}
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
                  returnKeyType="next"
                />
                <Input
                  label={isClient ? t('auth:password_label') : 'Password'}
                  isPassword
                  autoComplete="password"
                  textContentType="password"
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <XStack justifyContent="flex-end">
                  <Button variant="text" onPress={() => router.push('/(auth)/forgot-password')}>
                    {isClient ? t('auth:forgot_password') : 'Forgot password?'}
                  </Button>
                </XStack>
                <YStack marginTop="$md">
                  <Form.Trigger asChild disabled={loading}>
                    <Button variant="primary" loading={loading}>
                      {isClient ? t('auth:signIn_cta') : 'Sign In'}
                    </Button>
                  </Form.Trigger>
                </YStack>
              </YStack>
            </Form>
            {/* AUTH-04 social login placeholder DELIBERATELY NOT RENDERED — deferred to v2 per SKELETON.md */}
            <XStack justifyContent="center" alignItems="center" gap="$xs" marginTop="$xl">
              <Text fontSize={14} color="$colorSecondary">
                {isClient ? t('auth:no_account') : 'No account yet?'}
              </Text>
              <Button variant="text" onPress={() => router.push('/(auth)/sign-up')}>
                {isClient ? t('auth:signUp') : 'Register'}
              </Button>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
