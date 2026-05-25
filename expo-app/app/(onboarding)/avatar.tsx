import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, Text, Sheet } from 'tamagui';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth.store';
import { useClubStore } from '../../store/club.store';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { WizardSteps } from '../../components/ui/WizardSteps';
import { AvatarPicker } from '../../components/ui/AvatarPicker';

export default function AvatarScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const isClient = useDidFinishSSR();

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [sheetOpen, setSheetOpen]           = useState(false);

  const pendingInviteCode = useClubStore((s) => s.pendingInviteCode);

  async function handleContinue() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (selectedAvatar) {
        const userId = useAuthStore.getState().session?.user.id;
        if (userId) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: selectedAvatar })
            .eq('id', userId);
          if (updateError) {
            setError(t('common:error_generic'));
            return;
          }
        }
      }
      // Open the non-dismissable create-or-join sheet (D-04)
      setSheetOpen(true);
    } catch {
      setError(t('common:error_network'));
    } finally {
      setLoading(false);
    }
  }

  function handleCreateClub() {
    setSheetOpen(false);
    router.push('/(app)/clubs/create');
  }

  function handleJoinClub() {
    setSheetOpen(false);
    if (pendingInviteCode) {
      router.push(`/(app)/clubs/join?code=${pendingInviteCode}`);
    } else {
      router.push('/(app)/clubs/join');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      {/* Back arrow */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ paddingLeft: 24, paddingTop: 16, paddingBottom: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Feather name="arrow-left" size={24} color="#0D0D0D" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack
          flex={1}
          paddingHorizontal="$lg"
          paddingTop="$md"
          gap="$md"
          $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
        >
          <WizardSteps total={2} current={2} />

          <Text
            fontFamily="$heading"
            fontSize={24}
            color="$color"
            textAlign="center"
          >
            {isClient ? t('onboarding:avatar_heading') : 'Choose your avatar'}
          </Text>

          <Text
            fontSize={13}
            color="$colorSecondary"
            textAlign="center"
            marginBottom="$xl"
          >
            {isClient ? t('onboarding:avatar_subtext') : 'You can change it anytime.'}
          </Text>

          {error && <Alert type="error" message={error} />}

          <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />

          <YStack gap="$sm" marginTop="$xl" paddingBottom="$2xl">
            <Button variant="primary" loading={loading} onPress={handleContinue}>
              {isClient ? t('onboarding:continue_cta') : 'Continue'}
            </Button>
            <Button variant="text" onPress={handleContinue}>
              {isClient ? t('onboarding:avatar_skip') : 'Skip'}
            </Button>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Non-dismissable create-or-join sheet (D-04) */}
      <Sheet
        modal={true}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        snapPoints={[35]}
        dismissOnSnapToBottom={false}
        // @ts-expect-error Tamagui 2.x animation prop requires config registration
        animation="slow"
      >
        <Sheet.Overlay
          // @ts-expect-error Tamagui 2.x animation prop requires config registration
          animation="medium"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle />
        <Sheet.Frame
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
          backgroundColor="$backgroundStrong"
          paddingHorizontal="$lg"
          paddingVertical="$md"
          gap="$md"
        >
          <Text fontFamily="$heading" fontSize={18} color="$color" textAlign="center">
            {isClient ? t('onboarding:create_or_join_heading') : 'What would you like to do?'}
          </Text>
          <Button variant="primary" onPress={handleCreateClub}>
            {isClient ? t('onboarding:create_club_cta') : 'Create a club'}
          </Button>
          <Button variant="secondary" onPress={handleJoinClub}>
            {isClient ? t('onboarding:join_club_cta') : 'Join a club'}
          </Button>
        </Sheet.Frame>
      </Sheet>
    </SafeAreaView>
  );
}
