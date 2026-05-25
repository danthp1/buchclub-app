import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, Form } from 'tamagui';
import { ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/auth.store';
import { useClubStore } from '../../../../store/club.store';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Alert } from '../../../../components/ui/Alert';
import { WizardSteps } from '../../../../components/ui/WizardSteps';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateInviteCode(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => CHARS[b % CHARS.length]).join('');
}

export default function CreateClubScreen() {
  const { t } = useTranslation(['clubs', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClub, setCreatedClub] = useState<{ id: string; invite_code: string; name: string } | null>(null);

  function goNext() { setStep((s) => (s + 1) as 1 | 2 | 3 | 4); }
  function goBack() { setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4); }

  async function handleCreate() {
    if (loading || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) throw new Error('No session');

      // Collision-safe INSERT with up to 3 retries (RESEARCH Pitfall 3)
      let club: { id: string; invite_code: string; name: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const invite_code = generateInviteCode();
        const { data, error: insertError } = await supabase
          .from('clubs')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            is_public: isPublic,
            invite_code,
            created_by: userId,
          })
          .select('id, invite_code, name')
          .single();

        if (!insertError && data) {
          club = data;
          break;
        }
        if (insertError?.code !== '23505') throw insertError;
        // 23505 = invite_code collision — retry with new code
      }

      if (!club) throw new Error('Failed to generate unique invite code after 3 attempts');

      // Insert self as admin
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({ club_id: club.id, user_id: userId, role: 'admin' });
      if (memberError) throw memberError;

      // Update club store and mark onboarding complete (D-02)
      useClubStore.getState().setActiveClubId(club.id);
      useClubStore.getState().setOnboardingCompleted(true);

      // Invalidate club list cache
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] });

      setCreatedClub(club);
      setStep(4);
    } catch {
      setError(t('common:error_generic'));
    } finally {
      setLoading(false);
    }
  }

  async function handleShareInviteLink() {
    if (!createdClub) return;
    const url = Linking.createURL('join', { queryParams: { code: createdClub.invite_code } });
    await Share.share({ message: `Join my book club: ${url}`, url });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          {step > 1 && step < 4 ? (
            <TouchableOpacity onPress={goBack} accessibilityRole="button">
              <Feather name="arrow-left" size={24} color="#0D0D0D" />
            </TouchableOpacity>
          ) : (
            <YStack width={24} />
          )}
          <YStack flex={1} />
          {step < 4 && (
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={isClient ? t('common:close') : 'Close'}
            >
              <Feather name="x" size={24} color="#0D0D0D" />
            </TouchableOpacity>
          )}
        </XStack>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <YStack
            flex={1}
            paddingHorizontal="$lg"
            paddingTop="$md"
            gap="$md"
            $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
          >
            {step < 4 && <WizardSteps total={4} current={step} />}

            {error && <Alert type="error" message={error} />}

            {/* Step 1: Club name */}
            {step === 1 && (
              <Form onSubmit={goNext}>
                <YStack gap="$md">
                  <Text fontFamily="$heading" fontSize={24} color="$color">
                    {isClient ? t('clubs:create_heading') : 'Name your club'}
                  </Text>
                  <Input
                    label={isClient ? t('clubs:club_name_label') : 'Club name'}
                    placeholder={isClient ? t('clubs:club_name_placeholder') : 'e.g. The Kafka Circle'}
                    value={name}
                    onChangeText={setName}
                    maxLength={60}
                    autoCapitalize="words"
                  />
                  <Text fontSize={13} color="$colorSecondary" textAlign="right">
                    {name.length}/60
                  </Text>
                  <YStack marginTop="$xl">
                    <Form.Trigger asChild disabled={!name.trim()}>
                      <Button variant="primary">
                        {isClient ? t('clubs:next_cta') : 'Next'}
                      </Button>
                    </Form.Trigger>
                  </YStack>
                </YStack>
              </Form>
            )}

            {/* Step 2: Description */}
            {step === 2 && (
              <YStack gap="$md">
                <Text fontFamily="$heading" fontSize={24} color="$color">
                  {isClient ? t('clubs:create_step2') : 'Describe your club'}
                </Text>
                <Input
                  label={isClient ? t('clubs:club_desc_label') : 'Description (optional)'}
                  placeholder={isClient ? t('clubs:club_desc_placeholder') : 'What is your club about?'}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={300}
                  multiline
                />
                <Text fontSize={13} color="$colorSecondary" textAlign="right">
                  {description.length}/300
                </Text>
                <YStack marginTop="$xl" gap="$sm">
                  <Button variant="primary" onPress={goNext}>
                    {isClient ? t('clubs:next_cta') : 'Next'}
                  </Button>
                  <Button variant="secondary" onPress={goNext}>
                    {isClient ? t('clubs:skip_cta') : 'Skip'}
                  </Button>
                </YStack>
              </YStack>
            )}

            {/* Step 3: Visibility */}
            {step === 3 && (
              <YStack gap="$md">
                <Text fontFamily="$heading" fontSize={24} color="$color">
                  {isClient ? t('clubs:create_step3') : 'Who can find your club?'}
                </Text>

                {/* Public card */}
                <YStack
                  backgroundColor={isPublic ? 'rgba(26,79,224,0.05)' : '$backgroundStrong'}
                  borderRadius={16}
                  borderWidth={isPublic ? 2 : 1.5}
                  borderColor={isPublic ? '$accent' : '$borderColor'}
                  padding="$md"
                  onPress={() => setIsPublic(true)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isPublic }}
                >
                  <XStack gap="$md" alignItems="center">
                    <Feather name="globe" size={24} color="#0D0D0D" />
                    <YStack flex={1}>
                      <Text fontSize={15} fontWeight="600" color="$color">
                        {isClient ? t('clubs:visibility_public') : 'Public'}
                      </Text>
                      <Text fontSize={13} color="$colorSecondary">
                        {isClient ? t('clubs:visibility_public_desc') : 'Anyone can find your club in search'}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>

                {/* Private card */}
                <YStack
                  backgroundColor={!isPublic ? 'rgba(26,79,224,0.05)' : '$backgroundStrong'}
                  borderRadius={16}
                  borderWidth={!isPublic ? 2 : 1.5}
                  borderColor={!isPublic ? '$accent' : '$borderColor'}
                  padding="$md"
                  onPress={() => setIsPublic(false)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: !isPublic }}
                >
                  <XStack gap="$md" alignItems="center">
                    <Feather name="lock" size={24} color="#0D0D0D" />
                    <YStack flex={1}>
                      <Text fontSize={15} fontWeight="600" color="$color">
                        {isClient ? t('clubs:visibility_private') : 'Private'}
                      </Text>
                      <Text fontSize={13} color="$colorSecondary">
                        {isClient ? t('clubs:visibility_private_desc') : 'Only reachable via invite link'}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>

                <YStack marginTop="$xl">
                  <Button variant="primary" onPress={goNext}>
                    {isClient ? t('clubs:next_cta') : 'Next'}
                  </Button>
                </YStack>
              </YStack>
            )}

            {/* Step 4: Confirm + Success */}
            {step === 4 && (
              <YStack gap="$md" flex={1} alignItems="center" justifyContent="center">
                {!createdClub ? (
                  // Confirm summary
                  <>
                    <Text fontFamily="$heading" fontSize={24} color="$color">
                      {isClient ? t('clubs:create_step4') : 'Ready to go!'}
                    </Text>
                    <YStack
                      backgroundColor="$backgroundStrong"
                      borderRadius={16}
                      padding="$md"
                      gap="$sm"
                      width="100%"
                    >
                      <XStack justifyContent="space-between">
                        <Text fontSize={13} color="$colorSecondary">
                          {isClient ? t('clubs:club_name_label') : 'Name'}
                        </Text>
                        <Text fontSize={15} color="$color">{name}</Text>
                      </XStack>
                      <YStack height={1} backgroundColor="$borderColor" />
                      <XStack justifyContent="space-between">
                        <Text fontSize={13} color="$colorSecondary">
                          {isClient ? t('clubs:club_desc_label') : 'Description'}
                        </Text>
                        <Text fontSize={15} color="$color" flex={1} textAlign="right" numberOfLines={2}>
                          {description || '—'}
                        </Text>
                      </XStack>
                      <YStack height={1} backgroundColor="$borderColor" />
                      <XStack justifyContent="space-between">
                        <Text fontSize={13} color="$colorSecondary">
                          {isClient ? t('clubs:create_step3') : 'Visibility'}
                        </Text>
                        <Text fontSize={15} color="$color">
                          {isPublic
                            ? (isClient ? t('clubs:visibility_public') : 'Public')
                            : (isClient ? t('clubs:visibility_private') : 'Private')}
                        </Text>
                      </XStack>
                    </YStack>
                    <YStack marginTop="$xl" width="100%">
                      <Button variant="primary" loading={loading} onPress={handleCreate}>
                        {isClient ? t('clubs:create_cta') : 'Create club'}
                      </Button>
                    </YStack>
                  </>
                ) : (
                  // Success state
                  <>
                    <Text fontFamily="$heading" fontSize={32} color="$color" textAlign="center">
                      {isClient ? t('clubs:success_created_heading') : 'Club created!'}
                    </Text>
                    <Text fontSize={15} color="$colorSecondary" textAlign="center">
                      {isClient ? t('clubs:success_created_subtext') : 'Your invite code:'}
                    </Text>
                    <YStack
                      backgroundColor="$backgroundStrong"
                      borderRadius={8}
                      padding="$md"
                      alignItems="center"
                    >
                      <Text fontSize={18} fontWeight="600" color="$color" letterSpacing={2}>
                        {createdClub.invite_code}
                      </Text>
                    </YStack>
                    <Text fontSize={15} color="$colorSecondary" textAlign="center">
                      {isClient ? t('clubs:success_created_share') : 'Share it with your friends.'}
                    </Text>
                    <YStack gap="$sm" width="100%" marginTop="$xl">
                      <Button
                        variant="primary"
                        onPress={() => {
                          router.dismissAll();
                          router.replace(`/(app)/clubs/${createdClub.id}` as never);
                        }}
                      >
                        {isClient ? t('clubs:success_cta') : 'Go to club'}
                      </Button>
                      <Button variant="secondary" onPress={handleShareInviteLink}>
                        {isClient ? t('clubs:success_share_cta') : 'Share invite link'}
                      </Button>
                    </YStack>
                  </>
                )}
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
