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

export default function UpdatePassword() {
  const { t } = useTranslation(['auth', 'common']);
  const isClient = useDidFinishSSR();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    if (password.length < 8) {
      setError(t('auth:password_too_short'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // Session is now active — InitialLayout will route to /(app)/books on next render.
      router.replace('/(app)/books');
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
              {isClient ? t('auth:update_password_heading') : 'Set a new password'}
            </Text>
            {error && <Alert type="error" message={error} />}
            <Form onSubmit={handleSubmit}>
              <YStack gap="$md">
                <Input
                  label={isClient ? t('auth:password_label') : 'Password'}
                  helper={isClient ? t('auth:password_helper') : 'At least 8 characters'}
                  isPassword
                  autoComplete="password-new"
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <YStack marginTop="$md">
                  <Form.Trigger asChild disabled={loading}>
                    <Button variant="primary" loading={loading}>
                      {isClient ? t('auth:update_password_cta') : 'Update password'}
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
