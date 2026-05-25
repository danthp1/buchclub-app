import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text } from 'tamagui';
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/auth.store';
import { useClubStore } from '../../../../store/club.store';
import { CodeInput } from '../../../../components/ui/CodeInput';
import { Button } from '../../../../components/ui/Button';
import { Alert } from '../../../../components/ui/Alert';

export default function JoinClubScreen() {
  const { t } = useTranslation(['clubs', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();

  // Pre-fill from deep link ?code= param (D-06)
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubPreview, setClubPreview] = useState<{ id: string; name: string } | null>(null);

  const userId = useAuthStore((s) => s.session?.user.id);

  async function handleCodeComplete(completedCode: string) {
    setError(null);
    setClubPreview(null);
    // Preview club name when code is complete
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name')
      .eq('invite_code', completedCode)
      .single();
    if (club) setClubPreview(club);
    else setError(t('clubs:join_error_invalid'));
  }

  async function handleJoin() {
    if (loading || code.length !== 8 || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: club, error: lookupError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('invite_code', code)
        .single();

      if (lookupError || !club) {
        setError(t('clubs:join_error_invalid'));
        return;
      }

      const { error: joinError } = await supabase
        .from('club_members')
        .insert({ club_id: club.id, user_id: userId, role: 'member' });

      if (joinError?.code === '23505') {
        setError(t('clubs:join_error_already_member'));
        return;
      }
      if (joinError) throw joinError;

      // Update club store and mark onboarding complete (D-02)
      useClubStore.getState().setActiveClubId(club.id);
      useClubStore.getState().setOnboardingCompleted(true);
      useClubStore.getState().setPendingInviteCode(null);

      queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] });
      router.dismissAll();
      router.replace(`/(app)/clubs/${club.id}` as never);
    } catch {
      setError(t('common:error_generic'));
    } finally {
      setLoading(false);
    }
  }

  async function handleShareLink() {
    const url = Linking.createURL('join', { queryParams: { code } });
    await Share.share({ message: `Join my book club: ${url}`, url });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>
        </XStack>

        <YStack
          flex={1}
          paddingHorizontal="$lg"
          paddingTop="$md"
          gap="$md"
          $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
        >
          <Text fontFamily="$heading" fontSize={24} color="$color">
            {isClient ? t('clubs:join_heading') : 'Join a club'}
          </Text>
          <Text fontSize={15} color="$colorSecondary" marginBottom="$xl">
            {isClient ? t('clubs:join_subtext') : 'Enter the invite code or open the link from the invitation.'}
          </Text>

          {error && <Alert type="error" message={error} />}

          {/* Club preview card */}
          {clubPreview && !error && (
            <YStack
              backgroundColor="$backgroundStrong"
              borderRadius={12}
              padding="$md"
              borderLeftWidth={3}
              borderLeftColor="$accent"
            >
              <Text fontSize={15} fontWeight="600" color="$color">{clubPreview.name}</Text>
            </YStack>
          )}

          <Text fontSize={13} fontWeight="600" color="$colorSecondary">
            {isClient ? t('clubs:join_code_label') : 'INVITE CODE'}
          </Text>

          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={handleCodeComplete}
          />

          <YStack marginTop="$xl" gap="$md">
            <Button
              variant="primary"
              loading={loading}
              onPress={handleJoin}
              disabled={code.length !== 8}
            >
              {clubPreview
                ? `${isClient ? t('clubs:join_cta') : 'Join'}: ${clubPreview.name}`
                : (isClient ? t('clubs:join_cta') : 'Join')}
            </Button>

            {/* OR divider */}
            <XStack alignItems="center" gap="$md">
              <YStack flex={1} height={1} backgroundColor="$borderColor" />
              <Text fontSize={13} color="$colorSecondary">
                {isClient ? t('common:or', { defaultValue: 'or' }) : 'or'}
              </Text>
              <YStack flex={1} height={1} backgroundColor="$borderColor" />
            </XStack>

            <Button variant="secondary" onPress={handleShareLink}>
              <XStack gap="$sm" alignItems="center">
                <Feather name="share" size={16} color="#0D0D0D" />
                <Text fontSize={15} color="$color">
                  {isClient ? t('clubs:join_share_label') : 'Share link'}
                </Text>
              </XStack>
            </Button>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
