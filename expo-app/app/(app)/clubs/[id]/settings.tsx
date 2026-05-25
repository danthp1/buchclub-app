import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Dialog } from 'tamagui';
import { SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { useClubStore } from '../../../../store/club.store';
import { useAuthStore } from '../../../../store/auth.store';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Alert } from '../../../../components/ui/Alert';

export default function ClubSettingsScreen() {
  const { t } = useTranslation(['clubs', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: club } = useQuery({
    queryKey: ['club', id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('clubs')
        .select('id, name, description, is_public, created_by')
        .eq('id', id)
        .single();
      if (queryError) throw queryError;
      return data;
    },
    enabled: !!id,
  });

  // Pre-fill form when club loads
  useEffect(() => {
    if (club) {
      setName(club.name);
      setDescription(club.description ?? '');
      setIsPublic(club.is_public);
    }
  }, [club]);

  // Detect changes
  useEffect(() => {
    if (!club) return;
    setHasChanges(
      name !== club.name ||
        (description ?? '') !== (club.description ?? '') ||
        isPublic !== club.is_public,
    );
  }, [name, description, isPublic, club]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from('clubs')
        .update({ name: name.trim(), description: description.trim() || null, is_public: isPublic })
        .eq('id', id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', id] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] });
      setHasChanges(false);
    },
    onError: () => setError(t('common:error_generic')),
  });

  const dissolveMutation = useMutation({
    mutationFn: async () => {
      // Delete all members first (CASCADE may handle this, but explicit is safer)
      await supabase.from('club_members').delete().eq('club_id', id);
      const { error: delError } = await supabase.from('clubs').delete().eq('id', id);
      if (delError) throw delError;
    },
    onSuccess: () => {
      const store = useClubStore.getState();
      if (store.activeClubId === id) store.setActiveClubId(null);
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] });
      router.replace('/(app)/clubs' as never);
    },
    onError: () => setError(t('common:error_generic')),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>
          <Text fontFamily="$heading" fontSize={18} color="$color" flex={1} paddingHorizontal="$sm">
            {isClient ? t('clubs:settings_tab') : 'Settings'}
          </Text>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          {error && <Alert type="error" message={error} />}

          {/* Section 1: Club info */}
          <Text
            fontSize={13}
            fontWeight="600"
            color="$colorSecondary"
            marginTop="$lg"
            marginBottom="$sm"
          >
            {isClient ? t('clubs:create_heading') : 'CLUB INFO'}
          </Text>

          <YStack gap="$md" backgroundColor="$backgroundStrong" borderRadius={16} padding="$md">
            <Input
              label={isClient ? t('clubs:club_name_label') : 'Club name'}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <Input
              label={isClient ? t('clubs:club_desc_label') : 'Description'}
              value={description}
              onChangeText={setDescription}
              maxLength={300}
              multiline
              style={{ minHeight: 80 }}
            />
          </YStack>

          {hasChanges && (
            <YStack marginTop="$md">
              <Button
                variant="secondary"
                loading={saveMutation.isPending}
                onPress={() => saveMutation.mutate()}
              >
                {isClient ? t('common:done') : 'Save changes'}
              </Button>
            </YStack>
          )}

          {/* Section 2: Visibility (CLUB-04) */}
          <Text
            fontSize={13}
            fontWeight="600"
            color="$colorSecondary"
            marginTop="$xl"
            marginBottom="$sm"
          >
            {isClient ? t('clubs:create_step3') : 'VISIBILITY'}
          </Text>

          <YStack gap="$sm">
            <YStack
              backgroundColor={isPublic ? 'rgba(26,79,224,0.05)' : '$backgroundStrong'}
              borderRadius={16}
              borderWidth={isPublic ? 2 : 1.5}
              borderColor={isPublic ? '$accent' : '$borderColor'}
              padding="$md"
              onPress={() => {
                setIsPublic(true);
                setHasChanges(true);
              }}
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
                    {isClient
                      ? t('clubs:visibility_public_desc')
                      : 'Anyone can find your club in search'}
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            <YStack
              backgroundColor={!isPublic ? 'rgba(26,79,224,0.05)' : '$backgroundStrong'}
              borderRadius={16}
              borderWidth={!isPublic ? 2 : 1.5}
              borderColor={!isPublic ? '$accent' : '$borderColor'}
              padding="$md"
              onPress={() => {
                setIsPublic(false);
                setHasChanges(true);
              }}
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
                    {isClient
                      ? t('clubs:visibility_private_desc')
                      : 'Only reachable via invite link'}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </YStack>

          {/* Section 3: Danger zone */}
          <Text
            fontSize={13}
            fontWeight="600"
            color="$destructive"
            marginTop="$xl"
            marginBottom="$sm"
          >
            {isClient ? t('common:danger_zone') : 'DANGER ZONE'}
          </Text>

          <YStack backgroundColor="$backgroundStrong" borderRadius={16} padding="$md">
            <Button
              variant="secondary"
              onPress={() => setDissolveOpen(true)}
              style={{ borderColor: '#D32F2F' }}
            >
              <Text color="$destructive" fontSize={15} fontWeight="600">
                {isClient ? t('clubs:dissolve_cta') : 'Dissolve club'}
              </Text>
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dissolve confirmation dialog */}
      <Dialog open={dissolveOpen} onOpenChange={setDissolveOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="dissolve-overlay"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <Dialog.Content
            key="dissolve-content"
            backgroundColor="$backgroundStrong"
            borderRadius={16}
            padding="$lg"
            gap="$md"
            maxWidth={320}
            width="90%"
          >
            <Dialog.Title>
              <Text fontFamily="$heading" fontSize={18} color="$color">
                {isClient ? t('clubs:dissolve_confirm_heading') : 'Really dissolve club?'}
              </Text>
            </Dialog.Title>
            <Dialog.Description>
              <Text fontSize={15} color="$colorSecondary">
                {isClient
                  ? t('clubs:dissolve_confirm_body')
                  : 'All members will lose access. This action cannot be undone.'}
              </Text>
            </Dialog.Description>
            <Button
              variant="primary"
              loading={dissolveMutation.isPending}
              onPress={() => dissolveMutation.mutate()}
              style={{ backgroundColor: '#D32F2F' }}
            >
              {isClient ? t('clubs:dissolve_confirm_cta') : 'Dissolve'}
            </Button>
            <Dialog.Close asChild>
              <Button variant="text" onPress={() => setDissolveOpen(false)}>
                {isClient ? t('common:cancel', { defaultValue: 'Cancel' }) : 'Cancel'}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </SafeAreaView>
  );
}
