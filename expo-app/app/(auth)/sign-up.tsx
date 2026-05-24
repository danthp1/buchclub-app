import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, Form, ScrollView } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export default function SignUp() {
  const { t } = useTranslation(['auth', 'common']);
  const isClient = useDidFinishSSR();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validatePassword() {
    if (password.length > 0 && password.length < 8) {
      setPasswordError(t('auth:password_too_short'));
    } else {
      setPasswordError(null);
    }
  }

  function validateConfirm() {
    if (confirm.length > 0 && confirm !== password) {
      setConfirmError(t('auth:password_mismatch'));
    } else {
      setConfirmError(null);
    }
  }

  async function handleSubmit() {
    if (loading) return;
    if (password.length < 8) {
      setPasswordError(t('auth:password_too_short'));
      return;
    }
    if (password !== confirm) {
      setConfirmError(t('auth:password_mismatch'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      // Supabase has email confirmation enabled (per SKELETON Task 4 dashboard config).
      // Replace the form with the "Almost there!" success state — do NOT navigate.
      setSuccess(true);
    } catch {
      setError(t('common:error_network'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFAF6' }}>
        <YStack
          flex={1}
          paddingHorizontal="$lg"
          paddingTop="$2xl"
          gap="$xl"
          alignItems="center"
          $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
        >
          <Feather name="check-circle" size={32} color="#2E7D5A" />
          <Text fontSize={22} fontWeight="600" color="$color" textAlign="center">
            {isClient ? t('auth:almost_done_heading') : 'Almost there!'}
          </Text>
          <Text fontSize={16} color="$colorSecondary" textAlign="center">
            {isClient ? t('auth:almost_done_body') : 'We have sent you a confirmation email.'}
          </Text>
          <Button variant="secondary" onPress={() => router.replace('/(auth)/sign-in')}>
            {isClient ? t('auth:back_to_signin') : 'Back to sign in'}
          </Button>
        </YStack>
      </SafeAreaView>
    );
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
              {isClient ? t('auth:signUp') : 'Register'}
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
                  helper={isClient ? t('auth:password_helper') : 'At least 8 characters'}
                  error={passwordError ?? undefined}
                  isPassword
                  autoComplete="password-new"
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={validatePassword}
                  returnKeyType="next"
                />
                <Input
                  label={isClient ? t('auth:password_confirm_label') : 'Confirm password'}
                  error={confirmError ?? undefined}
                  isPassword
                  value={confirm}
                  onChangeText={setConfirm}
                  onBlur={validateConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <YStack marginTop="$md">
                  <Form.Trigger asChild disabled={loading}>
                    <Button variant="primary" loading={loading}>
                      {isClient ? t('auth:signUp_cta') : 'Create Account'}
                    </Button>
                  </Form.Trigger>
                </YStack>
              </YStack>
            </Form>
            <XStack justifyContent="center" alignItems="center" gap="$xs" marginTop="$xl">
              <Text fontSize={14} color="$colorSecondary">
                {isClient ? t('auth:already_registered') : 'Already registered?'}
              </Text>
              <Button variant="text" onPress={() => router.push('/(auth)/sign-in')}>
                {isClient ? t('auth:signIn') : 'Sign In'}
              </Button>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
